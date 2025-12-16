"""
Admin API views for platform statistics and moderation.
"""

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from infrastructures.postgres.postgres_client import PostgresClient

User = get_user_model()


class IsAdminAuthenticated(BasePermission):
    """
    Custom permission class for admin authentication.
    Checks for admin session or special admin header.
    """

    def has_permission(self, request, view):
        # Check session-based admin authentication (from AdminLogin page)
        # The frontend sets 'admin_authenticated' in sessionStorage,
        # but we need server-side validation

        # Option 1: Check for admin header (for API clients)
        admin_key = request.headers.get("X-Admin-Key")
        if admin_key == "admin_secret_key_2025":
            return True

        # Option 2: Check if user is authenticated and is staff/superuser
        if request.user and request.user.is_authenticated:
            if request.user.is_staff or request.user.is_superuser:
                return True

        # Option 3: Check admin session cookie
        admin_session = request.COOKIES.get("admin_authenticated")
        if admin_session == "true":
            return True

        return False


@api_view(["GET"])
@permission_classes([IsAdminAuthenticated])
def admin_stats(request):
    """
    GET /api/admin/stats
    Returns platform-wide statistics.
    """
    try:
        # Get user counts from Django
        total_users = User.objects.filter(is_active=True).count()
        tenant_count = User.objects.filter(is_active=True, role="tenant").count()
        landlord_count = User.objects.filter(is_active=True, role="landlord").count()

        # Get review and building counts from PostgreSQL
        with PostgresClient() as db:
            # Total reviews
            review_result = db.query_one(
                "SELECT COUNT(*) as count FROM community_reviews WHERE deleted_at IS NULL"
            )
            total_reviews = review_result["count"] if review_result else 0

            # Flagged/pending reviews
            flagged_result = db.query_one(
                """SELECT COUNT(*) as count FROM community_reviews
                WHERE flagged = TRUE AND deleted_at IS NULL"""
            )
            pending_reports = flagged_result["count"] if flagged_result else 0

            # Buildings tracked (from building_locations which has unified data)
            buildings_result = db.query_one(
                """SELECT COUNT(DISTINCT bbl) as count FROM building_locations
                WHERE has_location = TRUE"""
            )
            buildings_tracked = buildings_result["count"] if buildings_result else 0

            # Total violations
            violations_result = db.query_one(
                "SELECT COUNT(*) as count FROM building_hpd_violations"
            )
            total_violations = violations_result["count"] if violations_result else 0

            # Total evictions
            evictions_result = db.query_one(
                "SELECT COUNT(*) as count FROM building_evictions"
            )
            total_evictions = evictions_result["count"] if evictions_result else 0

            # Total complaints
            complaints_result = db.query_one(
                "SELECT COUNT(*) as count FROM building_hpd_complaints"
            )
            total_complaints = complaints_result["count"] if complaints_result else 0

        return Response(
            {
                "totalUsers": total_users,
                "tenantCount": tenant_count,
                "landlordCount": landlord_count,
                "totalReviews": total_reviews,
                "pendingReports": pending_reports,
                "buildingsTracked": buildings_tracked,
                "totalViolations": total_violations,
                "totalEvictions": total_evictions,
                "totalComplaints": total_complaints,
            },
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        print(f"[AdminStats] Error: {e}")
        return Response(
            {"error": f"Failed to fetch admin stats: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAdminAuthenticated])
def admin_flagged_reviews(request):
    """
    GET /api/admin/flagged-reviews
    Returns list of flagged reviews for moderation.
    """
    try:
        with PostgresClient() as db:
            # Get flagged reviews with user info
            reviews = db.query_all(
                """
                SELECT 
                    cr.id,
                    cr.user_id,
                    cr.bbl,
                    cr.title,
                    cr.body,
                    cr.rating,
                    cr.created_at,
                    cr.flagged,
                    cu.email as author_email,
                    cu.username as author_username
                FROM community_reviews cr
                LEFT JOIN custom_user cu ON cr.user_id = cu.id
                WHERE cr.flagged = TRUE AND cr.deleted_at IS NULL
                ORDER BY cr.created_at DESC
                LIMIT 50
                """
            )

            # Also get flag counts from review_flags table if it exists
            result = []
            for review in reviews:
                # Get flag count
                flag_count_result = db.query_one(
                    """
                    SELECT COUNT(*) as count 
                    FROM review_flags 
                    WHERE review_id = %s
                    """,
                    (review["id"],),
                )
                flag_count = (
                    flag_count_result["count"]
                    if flag_count_result and flag_count_result.get("count") is not None
                    else 1
                )

                result.append(
                    {
                        "id": review["id"],
                        "type": "review",
                        "content": review["body"][:200]
                        + ("..." if len(review["body"] or "") > 200 else ""),
                        "title": review["title"],
                        "author": review["author_email"] or review["author_username"],
                        "authorId": review["user_id"],
                        "bbl": review["bbl"],
                        "rating": float(review["rating"]) if review["rating"] else None,
                        "reportedBy": flag_count,
                        "createdAt": (
                            review["created_at"].isoformat()
                            if review["created_at"]
                            else None
                        ),
                        "status": "pending",
                    }
                )

            return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[AdminFlaggedReviews] Error: {e}")
        # Return empty list on error (table might not exist)
        return Response([], status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAdminAuthenticated])
def admin_all_reviews(request):
    """
    GET /api/admin/reviews
    Returns list of all reviews for admin oversight.
    """
    try:
        limit = int(request.query_params.get("limit", 50))
        offset = int(request.query_params.get("offset", 0))

        with PostgresClient() as db:
            reviews = db.query_all(
                """
                SELECT 
                    cr.id,
                    cr.user_id,
                    cr.bbl,
                    cr.title,
                    cr.body,
                    cr.rating,
                    cr.created_at,
                    cr.flagged,
                    cu.email as author_email,
                    cu.username as author_username,
                    br.house_number,
                    br.street_name,
                    br.boro
                FROM community_reviews cr
                LEFT JOIN custom_user cu ON cr.user_id = cu.id
                LEFT JOIN building_registrations br ON cr.bbl = br.bbl
                WHERE cr.deleted_at IS NULL
                ORDER BY cr.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (limit, offset),
            )

            result = []
            for review in reviews:
                address = ""
                if review.get("house_number") and review.get("street_name"):
                    address = f"{review['house_number']} {review['street_name']}"
                    if review.get("boro"):
                        address += f", {review['boro']}"

                result.append(
                    {
                        "id": review["id"],
                        "userId": review["user_id"],
                        "bbl": review["bbl"],
                        "title": review["title"],
                        "body": review["body"],
                        "rating": float(review["rating"]) if review["rating"] else None,
                        "author": review["author_email"] or review["author_username"],
                        "address": address or f"BBL: {review['bbl']}",
                        "createdAt": (
                            review["created_at"].isoformat()
                            if review["created_at"]
                            else None
                        ),
                        "flagged": review["flagged"] or False,
                    }
                )

            return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[AdminAllReviews] Error: {e}")
        return Response(
            {"error": f"Failed to fetch reviews: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["POST"])
@permission_classes([IsAdminAuthenticated])
def admin_approve_review(request, review_id):
    """
    POST /api/admin/reviews/{review_id}/approve
    Unflag a review (mark as approved).
    """
    try:
        with PostgresClient() as db:
            # Unflag the review
            db.execute(
                """
                UPDATE community_reviews 
                SET flagged = FALSE, updated_at = NOW()
                WHERE id = %s AND deleted_at IS NULL
                """,
                (review_id,),
            )

            # Remove any flags from review_flags table
            try:
                db.execute(
                    "DELETE FROM review_flags WHERE review_id = %s", (review_id,)
                )
            except Exception:
                pass  # Table might not exist

        return Response(
            {"message": "Review approved successfully", "reviewId": review_id},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        print(f"[AdminApproveReview] Error: {e}")
        return Response(
            {"error": f"Failed to approve review: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["DELETE"])
@permission_classes([IsAdminAuthenticated])
def admin_delete_review(request, review_id):
    """
    DELETE /api/admin/reviews/{review_id}
    Soft delete a review.
    """
    try:
        with PostgresClient() as db:
            # Soft delete the review
            db.execute(
                """
                UPDATE community_reviews 
                SET deleted_at = NOW(), updated_at = NOW()
                WHERE id = %s AND deleted_at IS NULL
                """,
                (review_id,),
            )

        return Response(
            {"message": "Review removed successfully", "reviewId": review_id},
            status=status.HTTP_200_OK,
        )
    except Exception as e:
        print(f"[AdminDeleteReview] Error: {e}")
        return Response(
            {"error": f"Failed to remove review: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAdminAuthenticated])
def admin_users(request):
    """
    GET /api/admin/users
    Returns list of users for admin management.
    """
    try:
        limit = int(request.query_params.get("limit", 50))
        offset = int(request.query_params.get("offset", 0))
        role = request.query_params.get("role")

        queryset = User.objects.filter(is_active=True).order_by("-date_joined")

        if role:
            queryset = queryset.filter(role=role)

        users = queryset[offset : offset + limit]

        result = []
        for user in users:
            result.append(
                {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "role": user.role,
                    "isVerified": user.is_verified,
                    "firstName": user.first_name,
                    "lastName": user.last_name,
                    "dateJoined": (
                        user.date_joined.isoformat() if user.date_joined else None
                    ),
                    "lastLogin": (
                        user.last_login.isoformat() if user.last_login else None
                    ),
                }
            )

        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[AdminUsers] Error: {e}")
        return Response(
            {"error": f"Failed to fetch users: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


@api_view(["GET"])
@permission_classes([IsAdminAuthenticated])
def admin_platform_health(request):
    """
    GET /api/admin/health
    Returns platform health status.
    """
    try:
        health = {
            "apiStatus": "healthy",
            "dbStatus": "unknown",
            "timestamp": timezone.now().isoformat(),
        }

        # Check database connectivity
        try:
            with PostgresClient() as db:
                db.query_one("SELECT 1")
            health["dbStatus"] = "healthy"
        except Exception as e:
            health["dbStatus"] = "error"
            health["dbError"] = str(e)

        return Response(health, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"apiStatus": "error", "error": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
