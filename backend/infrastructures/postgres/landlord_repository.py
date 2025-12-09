from typing import Any, Dict, Optional

from infrastructures.postgres.postgres_client import PostgresClient


class LandlordRepository:
    """Repository for landlord-specific persistence helpers.

    Provides methods that manipulate or persist landlord-owned metadata such
    as flagging reviews. The methods are defensive: if the existing
    `community_reviews` table contains a `flagged` column we update it;
    otherwise we create a small `landlord_review_flags` table to record the
    flag action without altering crawler tables.
    """

    def __init__(self):
        self.client_factory = PostgresClient

    def flag_review(
        self, review_id: str, flagged_by: int, reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """Flag a review either by updating `community_reviews.flagged` or by
        inserting into `landlord_review_flags` as a fallback.

        Returns the persisted flag row or the updated review row.
        """
        with self.client_factory() as db:
            try:
                # Attempt to update community_reviews if it has a flagged column
                db.execute(
                    """
                    UPDATE community_reviews
                    SET flagged = TRUE
                    WHERE id = %s
                    """,
                    (review_id,),
                )

                # Return the updated review row
                row = db.query_one(
                    """
                    SELECT id, bbl, flagged, created_at, updated_at
                    FROM community_reviews
                    WHERE id = %s
                    """,
                    (review_id,),
                )
                # print(f"[LandlordRepository] Updated community_reviews for review {review_id}")
                # print(row)
                return row or {"id": review_id, "flagged": True}
            except Exception as e:
                # Do not create a fallback table. Surface the error so the
                # caller (view) can decide how to handle it (e.g., return 500).
                print(f"[LandlordRepository] failed to update community_reviews: {e}")
                raise

    def create_landlord_application(self, bbl: str, owner_user_id: int, status: str = "pending") -> bool:
        """
        Create a new landlord application/owner record with status
        Status can be: 'pending', 'approved', 'rejected'
        """
        with self.client_factory() as db:
            try:
                # Check if this user already has an application for this BBL
                existing = db.query_one(
                    """
                    SELECT id, status FROM landlord_owners 
                    WHERE bbl = %s AND owner_user_id = %s AND deleted_at IS NULL
                    """,
                    (bbl, owner_user_id),
                )

                if existing:
                    return False  # Already exists

                # Check if status column exists, if not add it
                try:
                    db.execute(
                        """
                        INSERT INTO landlord_owners (bbl, owner_user_id, status, created_at, updated_at)
                        VALUES (%s, %s, %s, NOW(), NOW())
                        """,
                        (bbl, owner_user_id, status),
                    )
                except Exception as e:
                    # If status column doesn't exist, insert without it
                    if "column" in str(e).lower() and "status" in str(e).lower():
                        # Add status column if it doesn't exist
                        db.execute(
                            """
                            ALTER TABLE landlord_owners 
                            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
                            """
                        )
                        # Retry insert
                        db.execute(
                            """
                            INSERT INTO landlord_owners (bbl, owner_user_id, status, created_at, updated_at)
                            VALUES (%s, %s, %s, NOW(), NOW())
                            """,
                            (bbl, owner_user_id, status),
                        )
                    else:
                        raise
                return True

            except Exception as e:
                print(f"[LandlordRepository] Error creating landlord application: {e}")
                return False

    def update_application_status(self, application_id: int, status: str) -> bool:
        """
        Update the status of a landlord application
        Status can be: 'pending', 'approved', 'rejected'
        """
        with self.client_factory() as db:
            try:
                # Ensure status column exists
                db.execute(
                    """
                    ALTER TABLE landlord_owners 
                    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
                    """
                )
                
                db.execute(
                    """
                    UPDATE landlord_owners 
                    SET status = %s, updated_at = NOW()
                    WHERE id = %s AND deleted_at IS NULL
                    """,
                    (status, application_id),
                )
                return True
            except Exception as e:
                print(f"[LandlordRepository] Error updating application status: {e}")
                return False

    def get_pending_applications(self) -> list:
        """
        Get all pending property claim applications
        """
        with self.client_factory() as db:
            try:
                # Ensure status column exists
                db.execute(
                    """
                    ALTER TABLE landlord_owners 
                    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
                    """
                )
                
                applications = db.query_all(
                    """
                    SELECT lo.id, lo.bbl, lo.owner_user_id, lo.status, lo.created_at, lo.updated_at,
                           u.email, u.first_name, u.last_name, u.organization_name
                    FROM landlord_owners lo
                    JOIN custom_user u ON lo.owner_user_id = u.id
                    WHERE lo.status = 'pending' AND lo.deleted_at IS NULL
                    ORDER BY lo.created_at DESC
                    """
                )
                return applications or []
            except Exception as e:
                print(f"[LandlordRepository] Error fetching pending applications: {e}")
                return []

    def get_approved_properties_for_landlord(self, owner_user_id: int) -> list:
        """
        Get all approved properties for a landlord
        """
        with self.client_factory() as db:
            try:
                # Ensure status column exists
                db.execute(
                    """
                    ALTER TABLE landlord_owners 
                    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
                    """
                )
                
                properties = db.query_all(
                    """
                    SELECT bbl FROM landlord_owners 
                    WHERE owner_user_id = %s 
                    AND status = 'approved' 
                    AND deleted_at IS NULL
                    """
                )
                return [p["bbl"] for p in properties] if properties else []
            except Exception as e:
                print(f"[LandlordRepository] Error fetching approved properties: {e}")
                return []
