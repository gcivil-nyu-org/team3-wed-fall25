from django.db.models import Q
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from infrastructures.postgres.building_repository import BuildingRepository

from .models import (
    CommunityFavorites,
    CommunityMessages,
    CommunityReviewComments,
    CommunityReviews,
)
from .serializers import (
    CommunityFavoritesSerializer,
    CommunityMessagesSerializer,
    CommunityReviewCommentsSerializer,
    CommunityReviewsSerializer,
)

# =========================================================
# FAVORITES API ENDPOINTS
# =========================================================


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def favorites_list_create(request):
    """
    GET: Get user's saved buildings
    POST: Save a building to favorites
    """
    if request.method == "GET":
        favorites = CommunityFavorites.objects.filter(
            user_id=request.user.id, deleted_at__isnull=True
        ).order_by("-created_at")
        fav_data = CommunityFavoritesSerializer(favorites, many=True).data

        repo = BuildingRepository()
        bbls = [f["bbl"] for f in fav_data]
        reg_map = {}

        for b in bbls:
            if b not in reg_map:
                try:
                    reg = repo.get_registration_by_bbl(b)
                except Exception:
                    reg = None
                reg_map[b] = reg

        # 3) 응답에 registration(또는 building) 필드로 합치기
        enriched = []
        for f in fav_data:
            enriched.append({
                **f,
                "registration": _to_summary_dict(reg_map.get(f["bbl"]))
            })

        return Response(enriched)

    elif request.method == "POST":
        data = request.data.copy()
        data["user_id"] = request.user.id

        # Check if already favorited
        existing = CommunityFavorites.objects.filter(
            user_id=request.user.id, bbl=data.get("bbl"), deleted_at__isnull=True
        ).first()

        if existing:
            return Response(
                {"detail": "Building already in favorites"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = CommunityFavoritesSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# views.py (같은 파일 하단 헬퍼로 두면 됨)
def _to_summary_dict(reg: dict | None) -> dict | None:
    """
    get_registration_by_bbl 반환 dict를 favorites 응답에 맞게 가볍게 요약.
    필요 필드는 프로젝트 정책에 맞게 추가/삭제해도 된다.
    """
    if not reg:
        return None

    # 안전 접근
    def g(k, default=None):
        return reg.get(k, default)

    # 보기 좋은 전체 주소 (비어있는 파트는 자동 제외)
    parts = [g("house_number"), g("street_name")]
    street = " ".join([p for p in parts if p]) or None
    cityline = " ".join([p for p in [g("boro"), g("zip")] if p]) or None

    full_address = None
    if street and cityline:
        full_address = f"{street}, {cityline}"
    elif street:
        full_address = street
    elif cityline:
        full_address = cityline

    contacts = g("contacts", []) or []
    # contact 일부만 노출(원하면 전체 contacts를 그대로 내려도 됨)
    contacts_preview = [
        {
            "type": c.get("type"),
            "name": (f"{c.get('first_name','')}".strip() + " " + f"{c.get('last_name','')}".strip()).strip() or c.get("corporation_name"),
            "desc": c.get("contact_description"),
            "business_zip": c.get("business_zip"),
        }
        for c in contacts[:3]  # 미리보기 3개
    ]

    return {
        # 핵심 키
        "bbl": g("bbl"),
        "registration_id": g("registration_id"),
        "building_id": g("building_id"),
        "boro_id": g("boro_id"),
        "boro": g("boro"),
        "block": g("block"),
        "lot": g("lot"),
        "house_number": g("house_number"),
        "street_name": g("street_name"),
        "zip": g("zip"),
        "community_board": g("community_board"),
        "last_registration_date": g("last_registration_date"),
        "registration_end_date": g("registration_end_date"),

        # 편의 필드
        "address": {
            "street": street,
            "zip": g("zip"),
            "full": full_address,
        },

        # contacts 요약 (정책에 따라 전체 contacts를 그대로 내려도 됨)
        "contacts_count": len(contacts),
        "contacts_preview": contacts_preview,
    }



@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def favorites_delete(request, favorite_id):
    """
    Remove a building from favorites (soft delete)
    """
    try:
        favorite = CommunityFavorites.objects.get(
            id=favorite_id, user_id=request.user.id, deleted_at__isnull=True
        )
        favorite.deleted_at = timezone.now()
        favorite.save()
        return Response({"detail": "Removed from favorites"}, status=status.HTTP_200_OK)
    except CommunityFavorites.DoesNotExist:
        return Response(
            {"detail": "Favorite not found"}, status=status.HTTP_404_NOT_FOUND
        )


# =========================================================
# REVIEWS API ENDPOINTS
# =========================================================


@api_view(["GET", "POST"])
@permission_classes([AllowAny])  # Anyone can read, authenticated users can write
def reviews_list_create(request):
    """
    GET: Get reviews for a building (by bbl parameter)
    POST: Create a new review (requires authentication)
    """
    if request.method == "GET":
        bbl = request.query_params.get("bbl")
        if not bbl:
            return Response(
                {"detail": "bbl parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reviews = CommunityReviews.objects.filter(
            bbl=bbl, deleted_at__isnull=True
        ).order_by("-created_at")
        serializer = CommunityReviewsSerializer(reviews, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = request.data.copy()
        data["user_id"] = request.user.id

        serializer = CommunityReviewsSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def my_reviews(request):
    """
    Get all reviews written by the authenticated user
    """
    reviews = CommunityReviews.objects.filter(
        user_id=request.user.id, deleted_at__isnull=True
    ).order_by("-created_at")
    serializer = CommunityReviewsSerializer(reviews, many=True)
    return Response(serializer.data)


@api_view(["PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def reviews_update_delete(request, review_id):
    """
    PUT: Update a review (only by author)
    DELETE: Delete a review (only by author)
    """
    try:
        review = CommunityReviews.objects.get(
            id=review_id, user_id=request.user.id, deleted_at__isnull=True
        )
    except CommunityReviews.DoesNotExist:
        return Response(
            {"detail": "Review not found"}, status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "PUT":
        serializer = CommunityReviewsSerializer(review, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == "DELETE":
        review.deleted_at = timezone.now()
        review.save()
        return Response({"detail": "Review deleted"}, status=status.HTTP_200_OK)


# =========================================================
# REVIEW COMMENTS API ENDPOINTS
# =========================================================


@api_view(["GET", "POST"])
@permission_classes([AllowAny])  # Anyone can read, authenticated users can write
def review_comments_list_create(request):
    """
    GET: Get comments for a review (by review_id parameter)
    POST: Create a new comment (requires authentication)
    """
    if request.method == "GET":
        review_id = request.query_params.get("review_id")
        if not review_id:
            return Response(
                {"detail": "review_id parameter is required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        comments = CommunityReviewComments.objects.filter(
            review_id=review_id, deleted_at__isnull=True
        ).order_by("-created_at")
        serializer = CommunityReviewCommentsSerializer(comments, many=True)
        return Response(serializer.data)

    elif request.method == "POST":
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        data = request.data.copy()
        data["user_id"] = request.user.id

        serializer = CommunityReviewCommentsSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def review_comments_delete(request, comment_id):
    """
    Delete a comment (only by author)
    """
    try:
        comment = CommunityReviewComments.objects.get(
            id=comment_id, user_id=request.user.id, deleted_at__isnull=True
        )
        comment.deleted_at = timezone.now()
        comment.save()
        return Response({"detail": "Comment deleted"}, status=status.HTTP_200_OK)
    except CommunityReviewComments.DoesNotExist:
        return Response(
            {"detail": "Comment not found"}, status=status.HTTP_404_NOT_FOUND
        )


# =========================================================
# MESSAGES API ENDPOINTS
# =========================================================


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def messages_inbox(request):
    """
    Get user's received messages
    """
    messages = CommunityMessages.objects.filter(
        receiver_id=request.user.id, deleted_at__isnull=True
    ).order_by("-created_at")
    serializer = CommunityMessagesSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def messages_outbox(request):
    """
    Get user's sent messages
    """
    messages = CommunityMessages.objects.filter(
        sender_id=request.user.id, deleted_at__isnull=True
    ).order_by("-created_at")
    serializer = CommunityMessagesSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def messages_send(request):
    """
    Send a new message
    """
    data = request.data.copy()
    data["sender_id"] = request.user.id

    serializer = CommunityMessagesSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["PUT"])
@permission_classes([IsAuthenticated])
def messages_mark_read(request, message_id):
    """
    Mark a message as read
    """
    try:
        message = CommunityMessages.objects.get(
            id=message_id, receiver_id=request.user.id, deleted_at__isnull=True
        )
        message.read_at = timezone.now()
        message.save()
        return Response({"detail": "Message marked as read"}, status=status.HTTP_200_OK)
    except CommunityMessages.DoesNotExist:
        return Response(
            {"detail": "Message not found"}, status=status.HTTP_404_NOT_FOUND
        )


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def messages_delete(request, message_id):
    """
    Delete a message (soft delete)
    """
    message = (
        CommunityMessages.objects.filter(id=message_id, deleted_at__isnull=True)
        .filter(Q(sender_id=request.user.id) | Q(receiver_id=request.user.id))
        .first()
    )

    if not message:
        return Response(
            {"detail": "Message not found"}, status=status.HTTP_404_NOT_FOUND
        )

    message.deleted_at = timezone.now()
    message.save()
    return Response({"detail": "Message deleted"}, status=status.HTTP_200_OK)
