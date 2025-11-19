#!/usr/bin/env python
"""
Create unified building_locations table from all available sources.
This table will be the single source of truth for BBL → address + coordinates.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructures.postgres.postgres_client import PostgresClient  # noqa: E402


def create_unified_locations_table():
    """Create and populate unified building_locations table"""

    print("=" * 80)
    print("CREATING UNIFIED BUILDING LOCATIONS TABLE")
    print("=" * 80)

    with PostgresClient() as db:
        # Create unified table
        print("\n1. Creating building_locations table...")
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS building_locations (
                bbl VARCHAR(10) PRIMARY KEY,
                -- Address from best available source
                address TEXT,
                house_number VARCHAR(50),
                street_name VARCHAR(200),
                borough VARCHAR(50),
                zip VARCHAR(10),
                -- Coordinates
                latitude NUMERIC(10, 7),
                longitude NUMERIC(10, 7),
                -- Metadata
                source VARCHAR(50), -- 'evictions', 'registrations_geocoded', 'evictions_geocoded'
                has_location BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """
        )

        # Create indexes
        print("2. Creating indexes...")
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_building_locations_bbl ON building_locations(bbl)"
        )
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_building_locations_has_location ON building_locations(has_location)"
        )
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_building_locations_lat_lng ON building_locations(latitude, longitude)"
        )
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_building_locations_borough ON building_locations(borough)"
        )
        db.execute(
            "CREATE INDEX IF NOT EXISTS idx_building_locations_zip ON building_locations(zip)"
        )

        # Step 1: Populate from evictions (best source - has location + address)
        print("\n3. Populating from building_evictions (has location data)...")
        db.execute(
            """
                    INSERT INTO building_locations (
                        bbl, address, house_number, street_name, borough, zip,
                        latitude, longitude, source, has_location
                    )
            SELECT DISTINCT ON (bbl)
                e.bbl,
                COALESCE(e.eviction_address, 'Address not available') as address,
                NULL as house_number,
                NULL as street_name,
                e.borough,
                NULL as zip,
                e.latitude,
                e.longitude,
                'evictions' as source,
                TRUE as has_location
            FROM building_evictions e
            WHERE e.latitude IS NOT NULL 
              AND e.longitude IS NOT NULL
            ORDER BY e.bbl, e.executed_date DESC
            ON CONFLICT (bbl) DO UPDATE
            SET latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                address = COALESCE(EXCLUDED.address, building_locations.address),
                borough = COALESCE(EXCLUDED.borough, building_locations.borough),
                source = 'evictions',
                has_location = TRUE,
                updated_at = CURRENT_TIMESTAMP
        """
        )
        evictions_count = db.scalar(
            "SELECT COUNT(*) FROM building_locations WHERE source = 'evictions'"
        )
        print(f"   ✓ Inserted {evictions_count:,} locations from evictions")

        # Step 2: Enrich with registration addresses (better address quality)
        print(
            "\n4. Enriching with building_registrations addresses (better quality)..."
        )
        db.execute(
            """
            UPDATE building_locations bl
            SET 
                house_number = br.house_number,
                street_name = br.street_name,
                address = CASE 
                    WHEN br.house_number IS NOT NULL AND br.street_name IS NOT NULL 
                    THEN br.house_number || ' ' || br.street_name
                    WHEN br.street_name IS NOT NULL 
                    THEN br.street_name
                    ELSE bl.address
                END,
                borough = COALESCE(br.boro, bl.borough),
                zip = COALESCE(br.zip, bl.zip),
                updated_at = CURRENT_TIMESTAMP
            FROM building_registrations br
            WHERE bl.bbl = br.bbl
              AND (br.house_number IS NOT NULL OR br.street_name IS NOT NULL)
        """
        )
        enriched_count = db.scalar(
            """
            SELECT COUNT(*) 
            FROM building_locations bl
            JOIN building_registrations br ON bl.bbl = br.bbl
            WHERE bl.house_number IS NOT NULL
        """
        )
        print(f"   ✓ Enriched {enriched_count:,} locations with registration addresses")

        # Step 3: Add registrations that don't have location yet (will be geocoded)
        print("\n5. Adding building_registrations without location (for geocoding)...")
        db.execute(
            """
                    INSERT INTO building_locations (
                        bbl, address, house_number, street_name, borough, zip,
                        latitude, longitude, source, has_location
                    )
            SELECT DISTINCT
                br.bbl,
                CASE 
                    WHEN br.house_number IS NOT NULL AND br.street_name IS NOT NULL 
                    THEN br.house_number || ' ' || br.street_name
                    WHEN br.street_name IS NOT NULL 
                    THEN br.street_name
                    ELSE 'Address not available'
                END as address,
                br.house_number,
                br.street_name,
                br.boro as borough,
                br.zip,
                NULL::NUMERIC as latitude,
                NULL::NUMERIC as longitude,
                'registrations_pending' as source,
                FALSE as has_location
            FROM building_registrations br
            WHERE br.house_number IS NOT NULL 
              AND br.street_name IS NOT NULL
              AND br.boro IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM building_locations bl WHERE bl.bbl = br.bbl
              )
            ON CONFLICT (bbl) DO NOTHING
        """
        )
        pending_count = db.scalar(
            "SELECT COUNT(*) FROM building_locations WHERE has_location = FALSE"
        )
        print(f"   ✓ Added {pending_count:,} registrations pending geocoding")

        # Step 4: Add any geocoded locations we already have
        print("\n6. Adding existing geocoded locations...")
        db.execute(
            """
            INSERT INTO building_locations (bbl, latitude, longitude, source, has_location)
            SELECT 
                bbl,
                latitude,
                longitude,
                'geocoded' as source,
                TRUE as has_location
            FROM building_geocoded_locations
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ON CONFLICT (bbl) DO UPDATE
            SET latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                source = 'geocoded',
                has_location = TRUE,
                updated_at = CURRENT_TIMESTAMP
        """
        )
        geocoded_count = db.scalar(
            "SELECT COUNT(*) FROM building_locations WHERE source = 'geocoded'"
        )
        print(f"   ✓ Added {geocoded_count:,} geocoded locations")

        # Final stats
        print("\n" + "=" * 80)
        print("UNIFIED TABLE STATISTICS")
        print("=" * 80)

        total = db.scalar("SELECT COUNT(*) FROM building_locations")
        with_location = db.scalar(
            "SELECT COUNT(*) FROM building_locations WHERE has_location = TRUE"
        )
        without_location = db.scalar(
            "SELECT COUNT(*) FROM building_locations WHERE has_location = FALSE"
        )

        print(f"\nTotal BBLs in unified table: {total:,}")
        print(f"  - With location: {with_location:,}")
        print(f"  - Without location (need geocoding): {without_location:,}")
        print(f"\nCoverage: {(with_location/total*100):.1f}% have location data")

        print("\n" + "=" * 80)
        print("UNIFIED TABLE CREATED SUCCESSFULLY")
        print("=" * 80)
        print("\nNext steps:")
        print("1. Run geocoding script to populate missing locations")
        print("2. Update map/search queries to use building_locations table")


if __name__ == "__main__":
    try:
        create_unified_locations_table()
    except Exception as e:
        print(f"\n\nError: {e}")
        import traceback

        traceback.print_exc()
