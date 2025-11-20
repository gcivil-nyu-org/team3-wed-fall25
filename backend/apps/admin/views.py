from datetime import datetime, timedelta
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from infrastructures.postgres.postgres_client import PostgresClient
from apps.community.models import CommunityReviews
from apps.user.models import CustomUser
from .models import AdminActivityLog
from .serializers import AdminActivityLogSerializer

User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_stats(request):
    """
    Get platform statistics from database
    """
    try:
        # Count total users
        total_users = CustomUser.objects.count()

        # Count total reviews (not deleted)
        total_reviews = CommunityReviews.objects.filter(deleted_at__isnull=True).count()

        # Count pending reports (flagged reviews)
        # Check if flagged column exists, otherwise check landlord_review_flags table
        with PostgresClient() as db:
            # Try to get flagged reviews count
            try:
                pending_reports = (
                    db.scalar(
                        """
                    SELECT COUNT(*) 
                    FROM community_reviews 
                    WHERE flagged = TRUE AND deleted_at IS NULL
                    """
                    )
                    or 0
                )
            except Exception:
                # If flagged column doesn't exist, check landlord_review_flags table
                try:
                    pending_reports = (
                        db.scalar(
                            """
                        SELECT COUNT(DISTINCT review_id) 
                        FROM landlord_review_flags
                        """
                        )
                        or 0
                    )
                except Exception:
                    pending_reports = 0

            # Count total buildings tracked
            buildings_tracked = (
                db.scalar(
                    """
                SELECT COUNT(DISTINCT bbl) 
                FROM building_registrations
                """
                )
                or 0
            )

        return Response(
            {
                "totalUsers": total_users,
                "totalReviews": total_reviews,
                "pendingReports": pending_reports,
                "buildingsTracked": buildings_tracked,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to fetch statistics: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def moderation_queue(request):
    """
    Get flagged reviews that need moderation
    """
    try:
        with PostgresClient() as db:
            # Try to get flagged reviews
            try:
                # If flagged column exists in community_reviews
                flagged_reviews = db.query_all(
                    """
                    SELECT 
                        cr.id,
                        cr.user_id,
                        cr.bbl,
                        cr.title,
                        cr.body,
                        cr.created_at,
                        u.email as author_email,
                        u.username as author_username,
                        COUNT(DISTINCT lrf.id) as report_count
                    FROM community_reviews cr
                    LEFT JOIN custom_user u ON cr.user_id = u.id
                    LEFT JOIN landlord_review_flags lrf ON cr.id = lrf.review_id
                    WHERE cr.flagged = TRUE AND cr.deleted_at IS NULL
                    GROUP BY cr.id, cr.user_id, cr.bbl, cr.title, cr.body, cr.created_at, u.email, u.username
                    ORDER BY cr.created_at DESC
                    """
                )
            except Exception:
                # If flagged column doesn't exist, use landlord_review_flags table
                flagged_reviews = db.query_all(
                    """
                    SELECT 
                        cr.id,
                        cr.user_id,
                        cr.bbl,
                        cr.title,
                        cr.body,
                        cr.created_at,
                        u.email as author_email,
                        u.username as author_username,
                        COUNT(DISTINCT lrf.id) as report_count
                    FROM community_reviews cr
                    INNER JOIN landlord_review_flags lrf ON cr.id = lrf.review_id
                    LEFT JOIN custom_user u ON cr.user_id = u.id
                    WHERE cr.deleted_at IS NULL
                    GROUP BY cr.id, cr.user_id, cr.bbl, cr.title, cr.body, cr.created_at, u.email, u.username
                    ORDER BY cr.created_at DESC
                    """
                )

        # Format the response
        queue_items = []
        for review in flagged_reviews:
            author = (
                review.get("author_email")
                or review.get("author_username")
                or f"User {review.get('user_id')}"
            )
            content = (
                review.get("body", "")[:100] + "..."
                if len(review.get("body", "")) > 100
                else review.get("body", "")
            )

            queue_items.append(
                {
                    "id": review.get("id"),
                    "type": "review",
                    "content": content,
                    "author": author,
                    "reportedBy": review.get("report_count", 1),
                    "createdAt": (
                        review.get("created_at").isoformat()
                        if review.get("created_at")
                        else datetime.now().isoformat()
                    ),
                    "status": "pending",
                    "reviewId": review.get("id"),
                    "bbl": review.get("bbl"),
                }
            )

        return Response(queue_items, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Failed to fetch moderation queue: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_review(request, review_id):
    """
    Approve a flagged review (unflag it)
    """
    try:
        admin_user = request.user

        with PostgresClient() as db:
            # Get review details
            review = db.query_one(
                """
                SELECT id, user_id, bbl, title, body
                FROM community_reviews
                WHERE id = %s AND deleted_at IS NULL
                """,
                (review_id,),
            )

            if not review:
                return Response(
                    {"error": "Review not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Unflag the review
            try:
                db.execute(
                    """
                    UPDATE community_reviews
                    SET flagged = FALSE
                    WHERE id = %s
                    """,
                    (review_id,),
                )
            except Exception:
                # If flagged column doesn't exist, delete from landlord_review_flags
                db.execute(
                    """
                    DELETE FROM landlord_review_flags
                    WHERE review_id = %s
                    """,
                    (review_id,),
                )

            # Log the action
            AdminActivityLog.objects.create(
                admin_user=admin_user,
                action="approved_review",
                target_type="review",
                target_id=review_id,
                target_description=f"Review #{review_id}",
                details={"bbl": review.get("bbl"), "title": review.get("title")},
            )

        return Response(
            {"message": "Review approved successfully"},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to approve review: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def remove_review(request, review_id):
    """
    Remove a review (soft delete)
    """
    try:
        admin_user = request.user

        with PostgresClient() as db:
            # Get review details
            review = db.query_one(
                """
                SELECT id, user_id, bbl, title, body
                FROM community_reviews
                WHERE id = %s AND deleted_at IS NULL
                """,
                (review_id,),
            )

            if not review:
                return Response(
                    {"error": "Review not found"},
                    status=status.HTTP_404_NOT_FOUND,
                )

            # Soft delete the review
            db.execute(
                """
                UPDATE community_reviews
                SET deleted_at = %s
                WHERE id = %s
                """,
                (timezone.now(), review_id),
            )

            # Also unflag if flagged
            try:
                db.execute(
                    """
                    UPDATE community_reviews
                    SET flagged = FALSE
                    WHERE id = %s
                    """,
                    (review_id,),
                )
            except Exception:
                # Delete from landlord_review_flags if flagged column doesn't exist
                db.execute(
                    """
                    DELETE FROM landlord_review_flags
                    WHERE review_id = %s
                    """,
                    (review_id,),
                )

            # Log the action
            AdminActivityLog.objects.create(
                admin_user=admin_user,
                action="removed_review",
                target_type="review",
                target_id=review_id,
                target_description=f"Review #{review_id}",
                details={"bbl": review.get("bbl"), "title": review.get("title")},
            )

        return Response(
            {"message": "Review removed successfully"},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        return Response(
            {"error": f"Failed to remove review: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def activity_logs(request):
    """
    Get recent admin activity logs
    """
    try:
        limit = int(request.query_params.get("limit", 50))
        logs = AdminActivityLog.objects.select_related("admin_user").order_by(
            "-created_at"
        )[:limit]
        serializer = AdminActivityLogSerializer(logs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Failed to fetch activity logs: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def weekly_stats(request):
    """
    Get weekly moderation statistics
    """
    try:
        week_ago = timezone.now() - timedelta(days=7)

        # Count actions from last 7 days
        reviews_approved = AdminActivityLog.objects.filter(
            action="approved_review", created_at__gte=week_ago
        ).count()

        reviews_removed = AdminActivityLog.objects.filter(
            action="removed_review", created_at__gte=week_ago
        ).count()

        users_banned = AdminActivityLog.objects.filter(
            action="banned_user", created_at__gte=week_ago
        ).count()

        reports_resolved = AdminActivityLog.objects.filter(
            action__in=["approved_review", "removed_review"], created_at__gte=week_ago
        ).count()

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
        return Response(
            {"error": f"Failed to fetch weekly stats: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def platform_health(request):
    """
    Check platform health status
    """
    try:
        health_status = {
            "apiStatus": "healthy",
            "dbStatus": "healthy",
            "emailService": "healthy",
            "storageUsage": 0,
        }

        # Check database connectivity
        try:
            with PostgresClient() as db:
                db.scalar("SELECT 1")
            health_status["dbStatus"] = "healthy"
        except Exception:
            health_status["dbStatus"] = "error"

        # Check email service (if configured)
        from django.conf import settings

        if hasattr(settings, "EMAIL_HOST") and settings.EMAIL_HOST:
            health_status["emailService"] = "healthy"
        else:
            health_status["emailService"] = "warning"

        # Storage usage (placeholder - would need actual storage monitoring)
        health_status["storageUsage"] = 0

        return Response(health_status, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"error": f"Failed to check platform health: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
