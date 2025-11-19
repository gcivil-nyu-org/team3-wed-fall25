#!/usr/bin/env python
"""Check geocoding progress"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from infrastructures.postgres.postgres_client import PostgresClient

with PostgresClient() as db:
    total = db.scalar("SELECT COUNT(*) FROM building_locations")
    with_location = db.scalar("SELECT COUNT(*) FROM building_locations WHERE has_location = TRUE")
    without_location = db.scalar("SELECT COUNT(*) FROM building_locations WHERE has_location = FALSE")
    
    print(f"Progress: {with_location:,} / {total:,} ({with_location/total*100:.1f}%)")
    print(f"Remaining: {without_location:,} buildings")

