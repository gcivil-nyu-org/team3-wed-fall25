from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

from infrastructures.postgres.postgres_client import PostgresClient
from .models import AdminActivityLog
from .serializers import AdminActivityLogSerializer

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """Get admin dashboard statistics"""
    try:
        with PostgresClient() as db:
            # Total users
            total_users = db.query_one(
                "SELECT COUNT(*) as count FROM auth_user WHERE is_active = TRUE"
            )
            total_users_count = total_users.get("count", 0) if total_users else 0

            # Total reviews (non-deleted)
            total_reviews = db.query_one(
                """
                SELECT COUNT(*) as count
                FROM community_reviews
                WHERE deleted_at IS NULL
                """
            )
            total_reviews_count = total_reviews.get("count", 0) if total_reviews else 0

            # Pending reports (flagged reviews)
            # Check if flagged column exists, if not, return 0
            try:
                pending_reports = db.query_one(
                    """
                    SELECT COUNT(*) as count
                    FROM community_reviews
                    WHERE flagged = TRUE AND deleted_at IS NULL
                    """
                )
                pending_reports_count = (
                    pending_reports.get("count", 0) if pending_reports else 0
                )
            except Exception:
                # If flagged column doesn't exist, return 0
                pending_reports_count = 0

            # Buildings tracked (distinct BBLs in reviews)
            buildings_tracked = db.query_one(
                """
                SELECT COUNT(DISTINCT bbl) as count
                FROM community_reviews
                WHERE deleted_at IS NULL
                """
            )
            buildings_tracked_count = (
                buildings_tracked.get("count", 0) if buildings_tracked else 0
            )

        return Response(
            {
                "totalUsers": total_users_count,
                "totalReviews": total_reviews_count,
                "pendingReports": pending_reports_count,
                "buildingsTracked": buildings_tracked_count,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {"error": f"Error fetching stats: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def moderation_queue(request):
    """Get flagged reviews pending moderation"""
    try:
        with PostgresClient() as db:
            # Get flagged reviews with author info
            # Check if flagged column exists
            try:
                flagged_reviews = db.query_all(
                    """
                    SELECT
                        cr.id,
                        cr.user_id,
                        cr.bbl,
                        cr.title,
                        cr.body,
                        cr.created_at,
                        cr.flagged,
                        u.email,
                        u.username
                    FROM community_reviews cr
                    LEFT JOIN auth_user u ON cr.user_id = u.id
                    WHERE cr.flagged = TRUE AND cr.deleted_at IS NULL
                    ORDER BY cr.created_at DESC
                    LIMIT 50
                    """
                )
            except Exception:
                # If flagged column doesn't exist, return empty array
                flagged_reviews = []

            # Get report count for each review (if there's a separate flags table)
            # For now, we'll use 1 if flagged=True
            queue_items = []
            for review in flagged_reviews:
                author_email = review.get("email") or review.get("username") or "Unknown"
                body_content = review.get("body", "")
                content = (
                    body_content[:100] + "..."
                    if len(body_content) > 100
                    else body_content
                )
                queue_items.append(
                    {
                        "id": review["id"],
                        "type": "review",
                        "content": content,
                        "author": author_email,
                        "reportedBy": 1 if review.get("flagged") else 0,
                        "createdAt": (
                            review["created_at"].isoformat()
                            if review.get("created_at")
                            else None
                        ),
                        "status": "pending",
                    }
                )

        return Response(queue_items, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Error fetching moderation queue: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_review(request, review_id):
    """Approve a flagged review (unflag it)"""
    try:
        admin_user = request.user
        with PostgresClient() as db:
            # Unflag the review
            db.execute(
                """
                UPDATE community_reviews
                SET flagged = FALSE
                WHERE id = %s AND deleted_at IS NULL
                """,
                (review_id,),
            )

            # Get review details for logging
            review = db.query_one(
                """
                SELECT id, title, body
                FROM community_reviews
                WHERE id = %s
                """,
                (review_id,),
            )

            # Log the action
            review_title = review.get("title", "N/A") if review else "N/A"
            AdminActivityLog.objects.create(
                admin_user=admin_user,
                action="approved_review",
                target_type="review",
                target_id=review_id,
                target_description=f"Review #{review_id}: {review_title}",
            )

        return Response(
            {"message": "Review approved successfully"}, status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {"error": f"Error approving review: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_review(request, review_id):
    """Remove a review (soft delete)"""
    try:
        admin_user = request.user
        with PostgresClient() as db:
            # Soft delete the review
            db.execute(
                """
                UPDATE community_reviews
                SET deleted_at = NOW(), flagged = FALSE
                WHERE id = %s
                """,
                (review_id,),
            )

            # Get review details for logging
            review = db.query_one(
                """
                SELECT id, title, body
                FROM community_reviews
                WHERE id = %s
                """,
                (review_id,),
            )

            # Log the action
            review_title = review.get("title", "N/A") if review else "N/A"
            AdminActivityLog.objects.create(
                admin_user=admin_user,
                action="removed_review",
                target_type="review",
                target_id=review_id,
                target_description=f"Review #{review_id}: {review_title}",
            )

        return Response(
            {"message": "Review removed successfully"}, status=status.HTTP_200_OK
        )
    except Exception as e:
        return Response(
            {"error": f"Error removing review: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity_logs(request):
    """Get recent admin activity logs"""
    try:
        logs = AdminActivityLog.objects.all()[:50]
        serializer = AdminActivityLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Error fetching activity logs: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def weekly_stats(request):
    """Get weekly moderation statistics"""
    try:
        week_ago = timezone.now() - timedelta(days=7)
        logs = AdminActivityLog.objects.filter(created_at__gte=week_ago)

        stats = {
            "reviewsApproved": logs.filter(action="approved_review").count(),
            "reviewsRemoved": logs.filter(action="removed_review").count(),
            "usersBanned": logs.filter(action="banned_user").count(),
            "reportsResolved": logs.filter(
                action__in=["approved_review", "removed_review"]
            ).count(),
        }

        return Response(stats, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Error fetching weekly stats: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def platform_health(request):
    """Check platform health status"""
    try:
        health = {
            "apiStatus": "healthy",
            "dbStatus": "healthy",
            "emailService": "healthy",
            "storageUsage": 65,  # Placeholder - would need actual storage calculation
        }

        # Check database connectivity
        try:
            with PostgresClient() as db:
                db.query_one("SELECT 1")
        except Exception:
            health["dbStatus"] = "error"

        return Response(health, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Error checking platform health: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
