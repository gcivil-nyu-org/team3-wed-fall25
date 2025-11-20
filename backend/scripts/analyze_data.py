#!/usr/bin/env python
"""
Quick script to analyze database data for map/search unification
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructures.postgres.postgres_client import PostgresClient  # noqa: E402


def analyze_data():
    with PostgresClient() as db:
        print("=" * 80)
        print("DATABASE DATA ANALYSIS FOR MAP/SEARCH UNIFICATION")
        print("=" * 80)

        # 1. Check how many buildings have location data
        print("\n1. LOCATION DATA AVAILABILITY:")
        print("-" * 80)

        evictions_with_loc = db.scalar(
            """
            SELECT COUNT(DISTINCT bbl) 
            FROM building_evictions 
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        """
        )
        total_evictions = db.scalar(
            "SELECT COUNT(DISTINCT bbl) FROM building_evictions"
        )
        total_registrations = db.scalar(
            "SELECT COUNT(DISTINCT bbl) FROM building_registrations"
        )

        print(f"  - Buildings with evictions (with location): {evictions_with_loc:,}")
        print(f"  - Total buildings with evictions: {total_evictions:,}")
        print(f"  - Total registered buildings: {total_registrations:,}")

        # 2. Check overlap between registrations and evictions
        print("\n2. DATA OVERLAP:")
        print("-" * 80)

        regs_with_evictions = db.scalar(
            """
            SELECT COUNT(DISTINCT br.bbl)
            FROM building_registrations br
            INNER JOIN building_evictions e ON br.bbl = e.bbl
            WHERE e.latitude IS NOT NULL AND e.longitude IS NOT NULL
        """
        )

        regs_with_violations = db.scalar(
            """
            SELECT COUNT(DISTINCT br.bbl)
            FROM building_registrations br
            INNER JOIN building_violations v ON br.bbl = v.bbl
        """
        )

        regs_with_complaints = db.scalar(
            """
            SELECT COUNT(DISTINCT br.bbl)
            FROM building_registrations br
            INNER JOIN building_complaints c ON br.bbl = c.bbl
        """
        )

        regs_with_any_data = db.scalar(
            """
            SELECT COUNT(DISTINCT br.bbl)
            FROM building_registrations br
            WHERE EXISTS (
                SELECT 1 FROM building_evictions e WHERE e.bbl = br.bbl
            ) OR EXISTS (
                SELECT 1 FROM building_violations v WHERE v.bbl = br.bbl
            ) OR EXISTS (
                SELECT 1 FROM building_complaints c WHERE c.bbl = br.bbl
            )
        """
        )

        print(
            f"  - Registered buildings with evictions (with location): {regs_with_evictions:,}"
        )
        print(f"  - Registered buildings with violations: {regs_with_violations:,}")
        print(f"  - Registered buildings with complaints: {regs_with_complaints:,}")
        print(
            f"  - Registered buildings with ANY data (evictions/violations/complaints): {regs_with_any_data:,}"
        )

        # 3. Check address completeness
        print("\n3. ADDRESS DATA QUALITY:")
        print("-" * 80)

        regs_with_address = db.scalar(
            """
            SELECT COUNT(DISTINCT bbl)
            FROM building_registrations
            WHERE (house_number IS NOT NULL AND house_number != '')
               OR (street_name IS NOT NULL AND street_name != '')
        """
        )

        evictions_with_address = db.scalar(
            """
            SELECT COUNT(DISTINCT bbl)
            FROM building_evictions
            WHERE eviction_address IS NOT NULL 
              AND eviction_address != ''
              AND eviction_address != 'building address'
        """
        )

        print(
            f"  - Registered buildings with address: {regs_with_address:,} / {total_registrations:,}"
        )
        print(
            f"  - Evictions with valid address: {evictions_with_address:,} / {total_evictions:,}"
        )

        # 4. Sample data comparison
        print("\n4. SAMPLE DATA COMPARISON (first 5 buildings):")
        print("-" * 80)

        sample = db.query_all(
            """
            SELECT 
                br.bbl,
                br.house_number || ' ' || br.street_name as reg_address,
                e.eviction_address,
                e.latitude,
                e.longitude,
                (SELECT COUNT(*) FROM building_violations v WHERE v.bbl = br.bbl) as violation_count,
                (SELECT COUNT(*) FROM building_evictions e2 WHERE e2.bbl = br.bbl) as eviction_count,
                (SELECT COUNT(*) FROM building_complaints c WHERE c.bbl = br.bbl) as complaint_count
            FROM building_registrations br
            LEFT JOIN (
                SELECT DISTINCT ON (bbl) bbl, eviction_address, latitude, longitude
                FROM building_evictions
                WHERE latitude IS NOT NULL AND longitude IS NOT NULL
                ORDER BY bbl, executed_date DESC
            ) e ON br.bbl = e.bbl
            WHERE e.latitude IS NOT NULL
            LIMIT 5
        """
        )

        for i, row in enumerate(sample, 1):
            print(f"\n  Building {i} (BBL: {row['bbl']}):")
            print(f"    Registration Address: {row['reg_address']}")
            print(f"    Eviction Address: {row['eviction_address']}")
            print(f"    Location: ({row['latitude']}, {row['longitude']})")
            print(
                f"    Violations: {row['violation_count']}, "
                f"Evictions: {row['eviction_count']}, "
                f"Complaints: {row['complaint_count']}"
            )

        # 5. Buildings with violations/complaints but no evictions
        print(
            "\n5. BUILDINGS MISSING FROM MAP (have violations/complaints but no evictions):"
        )
        print("-" * 80)

        missing_from_map = db.scalar(
            """
            SELECT COUNT(DISTINCT br.bbl)
            FROM building_registrations br
            WHERE (
                EXISTS (SELECT 1 FROM building_violations v WHERE v.bbl = br.bbl)
                OR EXISTS (SELECT 1 FROM building_complaints c WHERE c.bbl = br.bbl)
            )
            AND NOT EXISTS (
                SELECT 1 FROM building_evictions e 
                WHERE e.bbl = br.bbl 
                AND e.latitude IS NOT NULL 
                AND e.longitude IS NOT NULL
            )
        """
        )

        print(
            f"  - Buildings with violations/complaints but NO evictions with location: {missing_from_map:,}"
        )
        print("  - These buildings appear in search but NOT on map!")

        print("\n" + "=" * 80)
        print("ANALYSIS COMPLETE")
        print("=" * 80)


if __name__ == "__main__":
    try:
        analyze_data()
    except Exception as e:
        print(f"Error: {e}")
        import traceback

        traceback.print_exc()
