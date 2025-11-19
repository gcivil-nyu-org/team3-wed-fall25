#!/usr/bin/env python
"""Comprehensive data analysis for map unification"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructures.postgres.postgres_client import PostgresClient

def analyze():
    with PostgresClient() as db:
        print('=' * 80)
        print('COMPREHENSIVE DATA ANALYSIS')
        print('=' * 80)
        
        # Total unique BBLs across all tables
        print('\n1. UNIQUE BBL COUNTS BY TABLE:')
        print('-' * 80)
        reg_bbls = db.scalar('SELECT COUNT(DISTINCT bbl) FROM building_registrations')
        eviction_bbls = db.scalar('SELECT COUNT(DISTINCT bbl) FROM building_evictions')
        eviction_bbls_with_loc = db.scalar('SELECT COUNT(DISTINCT bbl) FROM building_evictions WHERE latitude IS NOT NULL AND longitude IS NOT NULL')
        violation_bbls = db.scalar('SELECT COUNT(DISTINCT bbl) FROM building_violations')
        complaint_bbls = db.scalar('SELECT COUNT(DISTINCT bbl) FROM building_complaints')
        
        print(f'  building_registrations: {reg_bbls:,} unique BBLs')
        print(f'  building_evictions (all): {eviction_bbls:,} unique BBLs')
        print(f'  building_evictions (with location): {eviction_bbls_with_loc:,} unique BBLs')
        print(f'  building_violations: {violation_bbls:,} unique BBLs')
        print(f'  building_complaints: {complaint_bbls:,} unique BBLs')
        
        # Buildings with data but no location
        print('\n2. BUILDINGS WITH DATA BUT NO LOCATION:')
        print('-' * 80)
        violations_no_loc = db.scalar("""
            SELECT COUNT(DISTINCT v.bbl)
            FROM building_violations v
            WHERE NOT EXISTS (
                SELECT 1 FROM building_evictions e 
                WHERE e.bbl = v.bbl 
                AND e.latitude IS NOT NULL 
                AND e.longitude IS NOT NULL
            )
        """)
        complaints_no_loc = db.scalar("""
            SELECT COUNT(DISTINCT c.bbl)
            FROM building_complaints c
            WHERE NOT EXISTS (
                SELECT 1 FROM building_evictions e 
                WHERE e.bbl = c.bbl 
                AND e.latitude IS NOT NULL 
                AND e.longitude IS NOT NULL
            )
        """)
        print(f'  Violations without location: {violations_no_loc:,}')
        print(f'  Complaints without location: {complaints_no_loc:,}')
        
        # Check if we can use eviction location for same BBL
        print('\n3. LOCATION REUSE POTENTIAL:')
        print('-' * 80)
        violations_with_shared_loc = db.scalar("""
            SELECT COUNT(DISTINCT v.bbl)
            FROM building_violations v
            WHERE EXISTS (
                SELECT 1 FROM building_evictions e 
                WHERE e.bbl = v.bbl 
                AND e.latitude IS NOT NULL 
                AND e.longitude IS NOT NULL
            )
        """)
        complaints_with_shared_loc = db.scalar("""
            SELECT COUNT(DISTINCT c.bbl)
            FROM building_complaints c
            WHERE EXISTS (
                SELECT 1 FROM building_evictions e 
                WHERE e.bbl = c.bbl 
                AND e.latitude IS NOT NULL 
                AND e.longitude IS NOT NULL
            )
        """)
        print(f'  Violations that CAN use eviction location (same BBL): {violations_with_shared_loc:,}')
        print(f'  Complaints that CAN use eviction location (same BBL): {complaints_with_shared_loc:,}')
        
        # Total mappable buildings
        print('\n4. TOTAL MAPPABLE BUILDINGS:')
        print('-' * 80)
        total_mappable = db.scalar("""
            SELECT COUNT(DISTINCT br.bbl)
            FROM building_registrations br
            WHERE EXISTS (
                SELECT 1 FROM building_evictions e 
                WHERE e.bbl = br.bbl 
                AND e.latitude IS NOT NULL 
                AND e.longitude IS NOT NULL
            )
            AND (
                EXISTS (SELECT 1 FROM building_violations v WHERE v.bbl = br.bbl)
                OR EXISTS (SELECT 1 FROM building_evictions e2 WHERE e2.bbl = br.bbl)
                OR EXISTS (SELECT 1 FROM building_complaints c WHERE c.bbl = br.bbl)
            )
        """)
        print(f'  Total buildings we CAN map (have location + have data): {total_mappable:,}')
        
        # Check address quality
        print('\n5. ADDRESS QUALITY:')
        print('-' * 80)
        reg_full_address = db.scalar("""
            SELECT COUNT(DISTINCT bbl)
            FROM building_registrations
            WHERE house_number IS NOT NULL 
              AND house_number != ''
              AND street_name IS NOT NULL
              AND street_name != ''
        """)
        print(f'  Registrations with full address: {reg_full_address:,} / {reg_bbls:,}')
        
        # Check how many buildings we're currently showing vs could show
        print('\n6. CURRENT VS POTENTIAL COVERAGE:')
        print('-' * 80)
        # Current: buildings with evictions + location
        current_coverage = eviction_bbls_with_loc
        # Potential: all registered buildings that have ANY data and can get location from evictions
        potential_coverage = total_mappable
        print(f'  Current map coverage: {current_coverage:,} buildings')
        print(f'  Potential map coverage: {potential_coverage:,} buildings')
        print(f'  Missing: {potential_coverage - current_coverage:,} buildings')

if __name__ == "__main__":
    try:
        analyze()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

