from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from infrastructures.postgres.postgres_client import PostgresClient

User = get_user_model()


# Helper function to check if flagged column exists
def _check_flagged_column_exists(db):
    """Check if community_reviews has a flagged column"""
    try:
        db.query_one(
            """
            SELECT flagged FROM community_reviews LIMIT 1
            """
        )
        return True
    except Exception:
        return False


class AdminStatsView(APIView):
    """Get platform statistics for admin dashboard"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get platform statistics"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            with PostgresClient() as db:
                # Total users
                total_users = (
                    db.query_one(
                        """
                    SELECT COUNT(*) as count
                    FROM custom_user
                    WHERE is_active = TRUE
                    """
                    )["count"]
                    or 0
                )

                # Total reviews
                total_reviews = (
                    db.query_one(
                        """
                    SELECT COUNT(*) as count
                    FROM community_reviews
                    WHERE deleted_at IS NULL
                    """
                    )["count"]
                    or 0
                )

                # Flagged reviews (pending reports)
                # Check if flagged column exists first
                flagged_reviews = 0
                try:
                    result = db.query_one(
                        """
                        SELECT COUNT(*) as count
                        FROM community_reviews
                        WHERE flagged = TRUE AND deleted_at IS NULL
                        """
                    )
                    flagged_reviews = result["count"] or 0
                except Exception:
                    # Column doesn't exist, return 0
                    flagged_reviews = 0

                # Total buildings (from landlord_owners)
                total_buildings = (
                    db.query_one(
                        """
                    SELECT COUNT(DISTINCT bbl) as count
                    FROM landlord_owners
                    WHERE deleted_at IS NULL
                    """
                    )["count"]
                    or 0
                )

            return Response(
                {
                    "totalUsers": total_users,
                    "totalReviews": total_reviews,
                    "pendingReports": flagged_reviews,
                    "buildingsTracked": total_buildings,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print(f"[AdminStatsView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class FlaggedReviewsView(APIView):
    """Get flagged reviews for moderation queue"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get all flagged reviews"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            with PostgresClient() as db:
                # Check if flagged column exists
                try:
                    # Try to query with flagged column
                    reviews = db.query_all(
                        """
                        SELECT 
                            cr.id,
                            cr.user_id,
                            cr.bbl,
                            cr.title,
                            cr.body,
                            cr.rating,
                            cr.flagged,
                            cr.created_at,
                            u.email as author_email,
                            u.first_name,
                            u.last_name
                        FROM community_reviews cr
                        LEFT JOIN custom_user u ON cr.user_id = u.id
                        WHERE cr.flagged = TRUE AND cr.deleted_at IS NULL
                        ORDER BY cr.created_at DESC
                        LIMIT 100
                        """
                    )
                except Exception:
                    # Flagged column doesn't exist, return empty list
                    reviews = []

                moderation_queue = []
                for review in reviews:
                    author = review.get("author_email") or f"user_{review['user_id']}"
                    if review.get("first_name") and review.get("last_name"):
                        author = (
                            f"{review['first_name']} {review['last_name']} ({author})"
                        )

                    moderation_queue.append(
                        {
                            "id": review["id"],
                            "type": "review",
                            "content": (
                                review.get("body", "")[:100] + "..."
                                if len(review.get("body", "")) > 100
                                else review.get("body", "")
                            ),
                            "author": author,
                            "reportedBy": 1,  # Flagged count - simplified
                            "createdAt": (
                                review["created_at"].isoformat()
                                if review.get("created_at")
                                else None
                            ),
                            "status": "pending",
                            "reviewId": review["id"],
                            "bbl": review.get("bbl"),
                            "title": review.get("title"),
                            "fullContent": review.get("body"),
                        }
                    )

            return Response(
                {"moderationQueue": moderation_queue}, status=status.HTTP_200_OK
            )
        except Exception as e:
            print(f"[FlaggedReviewsView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ApproveReviewView(APIView):
    """Approve/unflag a review"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Unflag a review"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            review_id = request.data.get("review_id")
            if not review_id:
                return Response(
                    {"error": "review_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with PostgresClient() as db:
                db.execute(
                    """
                    UPDATE community_reviews
                    SET flagged = FALSE, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (review_id,),
                )

            return Response(
                {"message": "Review approved (unflagged) successfully."},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print(f"[ApproveReviewView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class RemoveReviewView(APIView):
    """Remove/delete a review"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Soft delete a review"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            review_id = request.data.get("review_id")
            if not review_id:
                return Response(
                    {"error": "review_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with PostgresClient() as db:
                db.execute(
                    """
                    UPDATE community_reviews
                    SET deleted_at = NOW(), updated_at = NOW()
                    WHERE id = %s
                    """,
                    (review_id,),
                )

            return Response(
                {"message": "Review removed successfully."},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print(f"[RemoveReviewView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BanUserView(APIView):
    """Ban/unban a user"""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Ban or unban a user"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            user_id = request.data.get("user_id")
            action = request.data.get("action", "ban")  # "ban" or "unban"

            if not user_id:
                return Response(
                    {"error": "user_id is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user = User.objects.get(id=user_id)
            user.is_active = action == "unban"
            user.save()

            return Response(
                {"message": f"User {action}ned successfully."},
                status=status.HTTP_200_OK,
            )
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except Exception as e:
            print(f"[BanUserView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class WeeklyStatsView(APIView):
    """Get weekly moderation statistics"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get weekly stats"""
        if not (request.user.is_staff or request.user.is_superuser):
            return Response(
                {"error": "Admin access required."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            week_ago = timezone.now() - timedelta(days=7)

            with PostgresClient() as db:
                # Reviews unflagged (approved)
                reviews_approved = (
                    db.query_one(
                        """
                    SELECT COUNT(*) as count
                    FROM community_reviews
                    WHERE flagged = FALSE 
                    AND updated_at >= %s
                    AND deleted_at IS NULL
                    """,
                        (week_ago,),
                    )["count"]
                    or 0
                )

                # Reviews removed
                reviews_removed = (
                    db.query_one(
                        """
                    SELECT COUNT(*) as count
                    FROM community_reviews
                    WHERE deleted_at >= %s
                    """,
                        (week_ago,),
                    )["count"]
                    or 0
                )

                # Users banned (deactivated)
                users_banned = (
                    db.query_one(
                        """
                    SELECT COUNT(*) as count
                    FROM custom_user
                    WHERE is_active = FALSE 
                    AND updated_at >= %s
                    """,
                        (week_ago,),
                    )["count"]
                    or 0
                )

                # Reports resolved (flagged reviews unflagged)
                reports_resolved = (
                    db.query_one(
                        """
                    SELECT COUNT(*) as count
                    FROM community_reviews
                    WHERE flagged = FALSE 
                    AND updated_at >= %s
                    AND deleted_at IS NULL
                    """,
                        (week_ago,),
                    )["count"]
                    or 0
                )

            return Response(
                {
                    "reviewsApproved": reviews_approved,
                    "reviewsRemoved": reviews_removed,
                    "usersBanned": users_banned,
                    "reportsResolved": reports_resolved,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print(f"[WeeklyStatsView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
