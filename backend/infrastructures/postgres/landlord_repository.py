from typing import List, Dict, Any, Optional, Sequence
from infrastructures.postgres.postgres_client import PostgresClient

from common.models.building import (
    build_building_from_rows,
)

class LandlordRepository:

    def __init__(self):
        self.client_factory = PostgresClient

    def create_landlord_application(self, bbl: str, owner_user_id: int) -> bool:
        """
        Create a new landlord application/owner record
        """
        with self.client_factory() as db:
            try:
                # Check if this user already has an application for this BBL
                existing = db.query_one(
                    """
                    SELECT id FROM landlord_owners 
                    WHERE bbl = %s AND owner_user_id = %s AND deleted_at IS NULL
                    """,
                    (bbl, owner_user_id)
                )
                
                if existing:
                    return False  # Already exists
                
                # Insert new application
                db.execute(
                    """
                    INSERT INTO landlord_owners (bbl, owner_user_id, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    """,
                    (bbl, owner_user_id)
                )
                return True
                
            except Exception as e:
                print(f"[LandlordRepository] Error creating landlord application: {e}")
                return False