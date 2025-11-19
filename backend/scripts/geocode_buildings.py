#!/usr/bin/env python
"""
Geocode building_registrations that don't have location data from evictions.
Uses multiple geocoding services with parallel processing for speed:
1. Geoapify (5 req/sec free) - primary
2. Nominatim (1 req/sec free) - fallback
"""
import sys
import os
import time
import requests
from typing import Optional, Tuple
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructures.postgres.postgres_client import PostgresClient
from common.utils.env_util import get_env

# Geoapify - 5 requests/second free tier (much faster!)
GEOAPIFY_API = "https://api.geoapify.com/v1/geocode/search"
GEOAPIFY_API_KEY = os.environ.get("GEOAPIFY_API_KEY", "")  # Optional - works without key but slower

# Nominatim (OpenStreetMap) - fallback, 1 request/second
NOMINATIM_API = "https://nominatim.openstreetmap.org/search"

# Rate limiting locks
geoapify_lock = Lock()
geoapify_last_request = [0.0]
nominatim_lock = Lock()
nominatim_last_request = [0.0]


def geocode_with_geoapify(house_number: str, street_name: str, borough: str, zip_code: Optional[str] = None) -> Optional[Tuple[float, float]]:
    """Geocode using Geoapify (5 req/sec free tier)"""
    try:
        # Rate limiting: 5 requests per second = 0.2s between requests
        # But with multiple workers, we can be more aggressive
        with geoapify_lock:
            elapsed = time.time() - geoapify_last_request[0]
            if elapsed < 0.15:  # Slightly faster (0.15s = ~6.7 req/sec per worker)
                time.sleep(0.15 - elapsed)
            geoapify_last_request[0] = time.time()
        
        # Build address
        address_parts = [house_number, street_name]
        if borough:
            address_parts.append(borough)
        address_parts.append("NY")
        if zip_code:
            address_parts.append(zip_code)
        
        address = ", ".join(filter(None, address_parts))
        
        params = {
            "text": address,
            "apiKey": GEOAPIFY_API_KEY if GEOAPIFY_API_KEY else None,
            "limit": 1,
            "filter": "countrycode:us"
        }
        params = {k: v for k, v in params.items() if v is not None}
        
        response = requests.get(GEOAPIFY_API, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get("features") and len(data["features"]) > 0:
            feature = data["features"][0]
            coords = feature.get("geometry", {}).get("coordinates")
            if coords and len(coords) >= 2:
                lng, lat = coords[0], coords[1]
                if 40.4 <= lat <= 40.9 and -74.3 <= lng <= -73.7:
                    return (lat, lng)
        
        return None
    except Exception as e:
        return None


def geocode_with_nominatim(house_number: str, street_name: str, borough: str, zip_code: Optional[str] = None) -> Optional[Tuple[float, float]]:
    """Geocode using Nominatim (1 req/sec, fallback)"""
    try:
        # Rate limiting: 1 request per second
        with nominatim_lock:
            elapsed = time.time() - nominatim_last_request[0]
            if elapsed < 1.0:
                time.sleep(1.0 - elapsed)
            nominatim_last_request[0] = time.time()
        
        address_parts = [house_number, street_name]
        if borough:
            address_parts.append(borough)
        address_parts.append("NY")
        if zip_code:
            address_parts.append(zip_code)
        
        address = ", ".join(filter(None, address_parts))
        
        params = {
            "q": address,
            "format": "json",
            "limit": 1,
            "countrycodes": "us",
            "addressdetails": 1
        }
        
        headers = {"User-Agent": "NYC-Housing-Transparency/1.0"}
        
        response = requests.get(NOMINATIM_API, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data and len(data) > 0:
            result = data[0]
            lat_str = result.get("lat")
            lon_str = result.get("lon")
            
            if lat_str and lon_str:
                try:
                    lat = float(lat_str)
                    lng = float(lon_str)
                    if 40.4 <= lat <= 40.9 and -74.3 <= lng <= -73.7:
                        return (lat, lng)
                except (ValueError, TypeError):
                    pass
        
        return None
    except Exception:
        return None


def geocode_address(house_number: str, street_name: str, borough: str, zip_code: Optional[str] = None) -> Optional[Tuple[float, float]]:
    """
    Geocode an address using fastest available service.
    Tries Geoapify first (faster), falls back to Nominatim.
    """
    # Try Geoapify first (5 req/sec)
    result = geocode_with_geoapify(house_number, street_name, borough, zip_code)
    if result:
        return result
    
    # Fallback to Nominatim (1 req/sec)
    return geocode_with_nominatim(house_number, street_name, borough, zip_code)


def geocode_single_building(building: dict) -> Tuple[str, bool, Optional[Tuple[float, float]]]:
    """Geocode a single building (for parallel processing)"""
    bbl = building['bbl']
    house_number = building['house_number']
    street_name = building['street_name']
    borough = building['borough']
    zip_code = building.get('zip')
    
    # Each thread gets its own DB connection
    with PostgresClient() as db:
        # Check if already geocoded in unified table
        existing = db.query_one(
            "SELECT latitude, longitude FROM building_locations WHERE bbl = %s AND has_location = TRUE",
            (bbl,)
        )
        
        if existing and existing.get('latitude') and existing.get('longitude'):
            return (bbl, True, (float(existing['latitude']), float(existing['longitude'])))
        
        # Geocode
        coords = geocode_address(house_number, street_name, borough, zip_code)
        
        if coords:
            lat, lng = coords
            # Update unified table
            db.execute("""
                UPDATE building_locations
                SET latitude = %s,
                    longitude = %s,
                    source = 'geocoded',
                    has_location = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE bbl = %s
            """, (lat, lng, bbl))
            return (bbl, True, coords)
        else:
            return (bbl, False, None)


def geocode_buildings(batch_size: int = 100, max_buildings: Optional[int] = None, max_workers: int = 10):
    """
    Geocode buildings that don't have location data using parallel processing.
    
    Args:
        batch_size: Number of buildings to process in each batch
        max_buildings: Maximum number of buildings to geocode (None = all)
        max_workers: Number of parallel workers (5 = 5 * 5 req/sec = 25 req/sec with Geoapify)
    """
    env = get_env()
    
    print("=" * 80)
    print("GEOCODING BUILDINGS WITHOUT LOCATION DATA")
    print("=" * 80)
    
    with PostgresClient() as db:
        # Get buildings without location from unified table
        query = """
            SELECT 
                bbl,
                house_number,
                street_name,
                borough,
                zip
            FROM building_locations
            WHERE has_location = FALSE
              AND house_number IS NOT NULL 
              AND street_name IS NOT NULL
              AND borough IS NOT NULL
            ORDER BY bbl
        """
        
        if max_buildings:
            query += f" LIMIT {max_buildings}"
        
        buildings = db.query_all(query)
        total = len(buildings)
        
        print(f"\nFound {total:,} buildings to geocode")
        print(f"Processing in batches of {batch_size} with {max_workers} parallel workers...")
        print(f"Using Geoapify (5 req/sec) + Nominatim (1 req/sec fallback)\n")
        
        # Ensure unified table exists (should already exist from create_unified_locations.py)
        # Just verify it exists
        table_exists = db.scalar("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'building_locations'
            )
        """)
        if not table_exists:
            print("ERROR: building_locations table does not exist!")
            print("Please run: python scripts/create_unified_locations.py first")
            return
        
        success_count = 0
        fail_count = 0
        processed = 0
        
        # Process in batches with parallel workers
        for batch_start in range(0, total, batch_size):
            batch = buildings[batch_start:batch_start + batch_size]
            batch_num = (batch_start // batch_size) + 1
            total_batches = (total + batch_size - 1) // batch_size
            
            print(f"\nBatch {batch_num}/{total_batches} ({len(batch)} buildings)...")
            
            # Process batch in parallel
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                # Each worker will create its own DB connection
                futures = []
                for building in batch:
                    future = executor.submit(geocode_single_building, building)
                    futures.append((building['bbl'], future))
                
                # Collect results
                for bbl, future in futures:
                    try:
                        result_bbl, success, coords = future.result(timeout=30)
                        processed += 1
                        
                        if success:
                            if coords:
                                print(f"  [{processed}/{total}] BBL {result_bbl}: ✓ ({coords[0]:.6f}, {coords[1]:.6f})")
                            else:
                                print(f"  [{processed}/{total}] BBL {result_bbl}: ✓ (already geocoded)")
                            success_count += 1
                        else:
                            print(f"  [{processed}/{total}] BBL {result_bbl}: ✗ (failed)")
                            fail_count += 1
                    except Exception as e:
                        processed += 1
                        fail_count += 1
                        print(f"  [{processed}/{total}] BBL {bbl}: ✗ (error: {e})")
            
            print(f"  Batch complete: {success_count} succeeded, {fail_count} failed so far")
        
        print("\n" + "=" * 80)
        print("GEOCODING COMPLETE")
        print("=" * 80)
        print(f"Total processed: {total:,}")
        print(f"Successfully geocoded: {success_count:,}")
        print(f"Failed: {fail_count:,}")
        print(f"Success rate: {(success_count/total*100):.1f}%")
        
        # Final stats from unified table
        final_with_location = db.scalar("SELECT COUNT(*) FROM building_locations WHERE has_location = TRUE")
        final_without_location = db.scalar("SELECT COUNT(*) FROM building_locations WHERE has_location = FALSE")
        print(f"\nUnified table status:")
        print(f"  - With location: {final_with_location:,}")
        print(f"  - Without location: {final_without_location:,}")
        print(f"  - Coverage: {(final_with_location/(final_with_location+final_without_location)*100):.1f}%")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Geocode buildings without location data")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size (default: 100)")
    parser.add_argument("--max", type=int, default=None, help="Maximum buildings to geocode (default: all)")
    parser.add_argument("--workers", type=int, default=5, help="Number of parallel workers (default: 5)")
    
    args = parser.parse_args()
    
    try:
        geocode_buildings(
            batch_size=args.batch_size,
            max_buildings=args.max,
            max_workers=args.workers
        )
    except KeyboardInterrupt:
        print("\n\nGeocoding interrupted by user")
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback
        traceback.print_exc()

