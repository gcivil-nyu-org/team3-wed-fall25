from django.contrib.auth import get_user_model
from django.db.models import Q, F, Case, When, IntegerField, Max

# from django.db.models import OuterRef, Exists
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

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
            enriched.append(
                {**f, "registration": _to_summary_dict(reg_map.get(f["bbl"]))}
            )

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
            "name": (
                f"{c.get('first_name', '')}".strip()
                + " "
                + f"{c.get('last_name', '')}".strip()
            ).strip()
            or c.get("corporation_name"),
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


@api_view(["GET"])
@permission_classes([AllowAny])
def public_reviews(request):  # pragma: no cover
    """
    Get all public reviews with optional filters (borough, zip, bbl)
    This endpoint is public and doesn't require authentication
    """
    from infrastructures.postgres.postgres_client import PostgresClient

    borough = request.query_params.get("borough")
    zip_code = request.query_params.get("zip")
    bbl = request.query_params.get("bbl")

    # Build the query with joins to building_registrations
    query = """
        SELECT DISTINCT
            cr.id,
            cr.user_id,
            cr.bbl,
            cr.rating,
            cr.title,
            cr.body,
            cr.created_at,
            cr.updated_at,
            br.boro as borough,
            br.zip,
            br.house_number,
            br.street_name
        FROM community_reviews cr
        LEFT JOIN building_registrations br ON cr.bbl = br.bbl
        WHERE cr.deleted_at IS NULL
    """

    params = []

    if borough:
        query += " AND br.boro = %s"
        params.append(borough)

    if zip_code:
        query += " AND br.zip = %s"
        params.append(zip_code)

    if bbl:
        query += " AND cr.bbl = %s"
        params.append(bbl)

    query += " ORDER BY cr.created_at DESC LIMIT 100"

    try:
        with PostgresClient() as db:
            review_rows = db.query_all(query, tuple(params) if params else None)

        # Convert to serializer format
        reviews_data = []
        for row in review_rows:
            reviews_data.append(
                {
                    "id": row["id"],
                    "user_id": row["user_id"],
                    "bbl": row["bbl"],
                    "rating": float(row["rating"]) if row["rating"] else None,
                    "title": row["title"],
                    "body": row["body"],
                    "created_at": (
                        row["created_at"].isoformat() if row["created_at"] else None
                    ),
                    "updated_at": (
                        row["updated_at"].isoformat() if row["updated_at"] else None
                    ),
                    "borough": row["borough"],
                    "zip": row["zip"],
                    "address": (
                        f"{row['house_number'] or ''} {row['street_name'] or ''}".strip()
                        if row.get("house_number") or row.get("street_name")
                        else None
                    ),
                }
            )

        return Response(reviews_data, status=status.HTTP_200_OK)
    except Exception as e:
        return Response(
            {"detail": f"Error fetching reviews: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


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
def review_comments_delete(request, comment_id):  # pragma: no cover
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
def messages_inbox(request):  # pragma: no cover
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
def messages_outbox(request):  # pragma: no cover
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
def messages_delete(request, message_id):  # pragma: no cover
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


def _thread_q(user_id: int, peer_id: int, bbl: str | None):
    q_pair = Q(sender_id=user_id, receiver_id=peer_id) | Q(
        sender_id=peer_id, receiver_id=user_id
    )
    if bbl:
        return Q(deleted_at__isnull=True) & q_pair & Q(bbl=bbl)
    return Q(deleted_at__isnull=True) & q_pair


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def messages_thread(request):
    """
    GET  : 채팅 쓰레드 조회 (키셋 페이지네이션: since_id / before_id)
    POST : 메시지 전송 (body 필수)
    """
    user_id = request.user.id

    if request.method == "GET":
        try:
            peer_id = int(request.query_params.get("peer_id"))
        except (TypeError, ValueError):
            return Response({"detail": "peer_id is required (int)."}, status=400)

        bbl = request.query_params.get("bbl")  # optional
        since_id = request.query_params.get("since_id")
        before_id = request.query_params.get("before_id")
        order = (request.query_params.get("order") or "asc").lower()
        mark_read = (request.query_params.get("mark_read") or "false").lower() == "true"

        # limit guard
        try:
            limit = int(request.query_params.get("limit") or 50)
        except ValueError:
            limit = 50
        limit = max(1, min(limit, 100))

        if since_id and before_id:
            return Response(
                {"detail": "Use either since_id or before_id, not both."}, status=400
            )

        base = CommunityMessages.objects.filter(_thread_q(user_id, peer_id, bbl))

        # 키셋 조건
        if since_id:
            base = base.filter(id__gt=since_id).order_by("id")
        elif before_id:
            base = base.filter(id__lt=before_id).order_by("-id")[:limit]
            # before는 최신이 뒤에 오도록 asc로 정렬해 반환
            messages = list(base)[::-1]
        else:
            # 초기 로드: 최신부터 limit개 → asc로 반환
            base = base.order_by("-id")[:limit]
            messages = list(base)[::-1]

        if not (since_id or before_id):
            # 위에서 messages를 만들었으므로 그대로 직진
            pass
        elif since_id:
            messages = list(base)  # 이미 asc
        else:  # before_id
            pass  # 이미 asc로 맞춤

        # 읽음 처리 (상대가 보낸 내 미읽음만)
        if mark_read:
            CommunityMessages.objects.filter(
                _thread_q(user_id, peer_id, bbl),
                receiver_id=user_id,
                read_at__isnull=True,
                id__in=[m.id for m in messages],
            ).update(read_at=timezone.now())

        # 페이징 힌트
        prev_before_id = (
            messages[0].id if messages else int(before_id) if before_id else None
        )

        data = CommunityMessagesSerializer(messages, many=True).data
        if order == "desc":
            data = data[::-1]  # 요청시 desc로 받고 싶으면 뒤집어서 주기

        return Response(
            {
                "peer_id": peer_id,
                "bbl": bbl,
                "messages": data,
                "paging": {
                    "next_since_id": messages[-1].id if messages else None,  # 폴링용
                    "prev_before_id": messages[0].id if messages else None,  # 백필용
                    "has_more_before": bool(
                        prev_before_id
                    ),  # 클라에서 추가 호출로 판별 권장
                    "has_more_after": False,  # since는 폴링 반복으로 충족
                },
            }
        )

    # POST: 전송
    data = request.data.copy()
    try:
        peer_id = int(data.get("peer_id"))
    except (TypeError, ValueError):
        return Response({"detail": "peer_id is required (int)."}, status=400)

    if peer_id == user_id:
        return Response({"detail": "Cannot send message to yourself."}, status=400)

    # 고정 스키마 필드만 사용
    cm = CommunityMessages(
        sender_id=user_id,
        receiver_id=peer_id,
        bbl=data.get("bbl"),  # nullable OK
        body=(data.get("body") or "").strip(),
    )
    if not cm.body:
        return Response({"detail": "body is required."}, status=400)

    cm.save()
    return Response(
        CommunityMessagesSerializer(cm).data, status=status.HTTP_201_CREATED
    )


User = get_user_model()


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def message_threads_simple(request):
    """
    GET: 로그인 사용자의 대화방 목록 (peer_id 기준)
    - bbl 무시
    - 읽음 여부(is_unread)만 표시
    응답: [
      {
        "peer": {"id": 2, "username": "user2", "email": "u2@example.com"},
        "last_message": {...},
        "is_unread": true/false
      },
      ...
    ]
    """
    user_id = request.user.id

    # 나와 관련된 메시지 (deleted 제외)
    base = CommunityMessages.objects.filter(
        Q(deleted_at__isnull=True) & (Q(sender_id=user_id) | Q(receiver_id=user_id))
    )

    # peer_id 계산 (내가 보낸 건 receiver, 내가 받은 건 sender)
    peer_id_expr = Case(
        When(sender_id=user_id, then=F("receiver_id")),
        default=F("sender_id"),
        output_field=IntegerField(),
    )

    # peer_id로 그룹 → 마지막 메시지 id만 추출
    grouped = (
        base.annotate(peer_id=peer_id_expr)
        .values("peer_id")
        .annotate(last_id=Max("id"))
        .order_by("-last_id")
    )

    # 마지막 메시지, peer 정보 로딩
    last_ids = [g["last_id"] for g in grouped if g.get("last_id")]
    last_map = {m.id: m for m in CommunityMessages.objects.filter(id__in=last_ids)}
    peer_ids = [g["peer_id"] for g in grouped if g.get("peer_id")]
    peers = User.objects.in_bulk(peer_ids)

    # 결과 조합
    results = []
    for g in grouped:
        pid = g["peer_id"]
        peer = peers.get(pid)
        lm = last_map.get(g["last_id"])
        # 미읽음 여부
        is_unread = CommunityMessages.objects.filter(
            sender_id=pid, receiver_id=user_id, read_at__isnull=True
        ).exists()

        results.append(
            {
                "peer": {
                    "id": pid,
                    "username": getattr(peer, "username", None) if peer else None,
                    "email": getattr(peer, "email", None) if peer else None,
                },
                "last_message": (
                    {
                        "id": lm.id,
                        "body": lm.body,
                        "sender_id": lm.sender_id,
                        "receiver_id": lm.receiver_id,
                        "bbl": getattr(lm, "bbl", None),
                        "created_at": getattr(lm, "created_at", None),
                        "read_at": getattr(lm, "read_at", None),
                    }
                    if lm
                    else None
                ),
                "is_unread": is_unread,
            }
        )

    return Response(results, status=status.HTTP_200_OK)
