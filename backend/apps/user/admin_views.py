"""
Admin API views for platform statistics and moderation.
"""

import os

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import BasePermission
from rest_framework.response import Response

from django.db import connection

User = get_user_model()


class IsAdminAuthenticated(BasePermission):
    """
    Custom permission class for admin authentication.
    Checks for admin session or special admin header.
    """

    def has_permission(self, request, view):
        # Option 1: Check if user is authenticated and is staff/superuser (preferred)
        if request.user and request.user.is_authenticated:
            if request.user.is_staff or request.user.is_superuser:
                return True

        # Option 2: Check for admin header with env-based key (for API clients)
        admin_key = request.headers.get("X-Admin-Key")
        expected_key = os.environ.get("ADMIN_API_KEY")
        if admin_key and expected_key and admin_key == expected_key:
            return True

        # Option 3: Check admin session cookie (set by server after login)
        admin_session = request.COOKIES.get("admin_authenticated")
        if admin_session == "true":
            return True

        return False


def _dictfetchall(cursor):
    columns = [col[0] for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def _dictfetchone(cursor):
    columns = [col[0] for col in cursor.description]
    row = cursor.fetchone()
    return dict(zip(columns, row)) if row else None


def _query_one(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or None)
        return _dictfetchone(cursor)


def _query_all(sql, params=None):
    with connection.cursor() as cursor:
        cursor.execute(sql, params or None)
        return _dictfetchall(cursor)


def _safe_count(sql, params=None, default=0):
    """
    Run a COUNT query defensively. If the table/view is missing or any DB error
    occurs, return a default (0) instead of raising, so the endpoint stays up.
    """
    try:
        row = _query_one(sql, params)
        return row["count"] if row and "count" in row else default
    except Exception as e:
        # Log to console for visibility on the server
        print(f"[AdminStats] count query failed: {sql} params={params} err={e}")
        return default


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

        # Get review and building counts using Django connection (inherits deployed DB settings)
        total_reviews = _safe_count(
            "SELECT COUNT(*) as count FROM community_reviews WHERE deleted_at IS NULL"
        )
        pending_reports = _safe_count(
            """SELECT COUNT(*) as count FROM community_reviews
               WHERE flagged = TRUE AND deleted_at IS NULL"""
        )
        buildings_tracked = _safe_count(
            """SELECT COUNT(DISTINCT bbl) as count FROM building_locations
               WHERE has_location = TRUE"""
        )
        total_violations = _safe_count(
            "SELECT COUNT(*) as count FROM building_hpd_violations"
        )
        total_evictions = _safe_count(
            "SELECT COUNT(*) as count FROM building_evictions"
        )
        total_complaints = _safe_count(
            "SELECT COUNT(*) as count FROM building_hpd_complaints"
        )

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
        # Get flagged reviews with user info
        reviews = _query_all(
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
            flag_count_result = _query_one(
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

            body_text = review["body"] or ""
            result.append(
                {
                    "id": review["id"],
                    "type": "review",
                    "content": body_text[:200]
                    + ("..." if len(body_text) > 200 else ""),
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

        reviews = _query_all(
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
        with connection.cursor() as cursor:
            cursor.execute(
                """
                UPDATE community_reviews 
                SET flagged = FALSE, updated_at = NOW()
                WHERE id = %s AND deleted_at IS NULL
                """,
                (review_id,),
            )

            try:
                cursor.execute(
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
        with connection.cursor() as cursor:
            cursor.execute(
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

        # Check database connectivity via Django connection (inherits deployed DB settings)
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
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
