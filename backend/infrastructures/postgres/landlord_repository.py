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
                return row or {"id": review_id, "flagged": True}
            except Exception:
                # If updating the crawler table fails (e.g., column missing),
                # record the flag in a separate table to avoid schema changes.
                try:
                    db.execute(
                        """
                        CREATE TABLE IF NOT EXISTS landlord_review_flags (
                            id SERIAL PRIMARY KEY,
                            review_id TEXT NOT NULL,
                            flagged_by INTEGER,
                            reason TEXT,
                            created_at TIMESTAMP DEFAULT NOW()
                        )
                        """,
                        (),
                    )

                    db.execute(
                        """
                        INSERT INTO landlord_review_flags (review_id, flagged_by, reason)
                        VALUES (%s, %s, %s)
                        RETURNING id, review_id, flagged_by, reason, created_at
                        """,
                        (review_id, flagged_by, reason),
                    )

                    flag_row = db.query_one(
                        """
                        SELECT id, review_id, flagged_by, reason, created_at
                        FROM landlord_review_flags
                        WHERE review_id = %s
                        ORDER BY created_at DESC
                        LIMIT 1
                        """,
                        (review_id,),
                    )

                    return flag_row or {"review_id": review_id, "flagged": True}
                except Exception as e:
                    print(f"[LandlordRepository] failed to persist flag: {e}")

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
                    (bbl, owner_user_id),
                )

                if existing:
                    return False  # Already exists

                # Insert new application
                db.execute(
                    """
                    INSERT INTO landlord_owners (bbl, owner_user_id, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    """,
                    (bbl, owner_user_id),
                )
                return True

            except Exception as e:
                print(f"[LandlordRepository] Error creating landlord application: {e}")
                return False
