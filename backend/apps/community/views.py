from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import CommunityFavorites, CommunityReviews, CommunityReviewComments, CommunityMessages
from .serializers import (
    CommunityFavoritesSerializer, 
    CommunityReviewsSerializer, 
    CommunityReviewCommentsSerializer, 
    CommunityMessagesSerializer
)


# =========================================================
# FAVORITES API ENDPOINTS
# =========================================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def favorites_list_create(request):
    """
    GET: Get user's saved buildings
    POST: Save a building to favorites
    """
    if request.method == 'GET':
        favorites = CommunityFavorites.objects.filter(
            user_id=request.user.id,
            deleted_at__isnull=True
        ).order_by('-created_at')
        serializer = CommunityFavoritesSerializer(favorites, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        data = request.data.copy()
        data['user_id'] = request.user.id
        
        # Check if already favorited
        existing = CommunityFavorites.objects.filter(
            user_id=request.user.id,
            bbl=data.get('bbl'),
            deleted_at__isnull=True
        ).first()
        
        if existing:
            return Response(
                {'detail': 'Building already in favorites'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CommunityFavoritesSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def favorites_delete(request, favorite_id):
    """
    Remove a building from favorites (soft delete)
    """
    try:
        favorite = CommunityFavorites.objects.get(
            id=favorite_id,
            user_id=request.user.id,
            deleted_at__isnull=True
        )
        favorite.deleted_at = timezone.now()
        favorite.save()
        return Response({'detail': 'Removed from favorites'}, status=status.HTTP_200_OK)
    except CommunityFavorites.DoesNotExist:
        return Response(
            {'detail': 'Favorite not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


# =========================================================
# REVIEWS API ENDPOINTS
# =========================================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # Anyone can read, authenticated users can write
def reviews_list_create(request):
    """
    GET: Get reviews for a building (by bbl parameter)
    POST: Create a new review (requires authentication)
    """
    if request.method == 'GET':
        bbl = request.query_params.get('bbl')
        if not bbl:
            return Response(
                {'detail': 'bbl parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reviews = CommunityReviews.objects.filter(
            bbl=bbl,
            deleted_at__isnull=True
        ).order_by('-created_at')
        serializer = CommunityReviewsSerializer(reviews, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        data = request.data.copy()
        data['user_id'] = request.user.id
        
        serializer = CommunityReviewsSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def reviews_update_delete(request, review_id):
    """
    PUT: Update a review (only by author)
    DELETE: Delete a review (only by author)
    """
    try:
        review = CommunityReviews.objects.get(
            id=review_id,
            user_id=request.user.id,
            deleted_at__isnull=True
        )
    except CommunityReviews.DoesNotExist:
        return Response(
            {'detail': 'Review not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == 'PUT':
        serializer = CommunityReviewsSerializer(review, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        review.deleted_at = timezone.now()
        review.save()
        return Response({'detail': 'Review deleted'}, status=status.HTTP_200_OK)


# =========================================================
# REVIEW COMMENTS API ENDPOINTS
# =========================================================

@api_view(['GET', 'POST'])
@permission_classes([AllowAny])  # Anyone can read, authenticated users can write
def review_comments_list_create(request):
    """
    GET: Get comments for a review (by review_id parameter)
    POST: Create a new comment (requires authentication)
    """
    if request.method == 'GET':
        review_id = request.query_params.get('review_id')
        if not review_id:
            return Response(
                {'detail': 'review_id parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        comments = CommunityReviewComments.objects.filter(
            review_id=review_id,
            deleted_at__isnull=True
        ).order_by('created_at')
        serializer = CommunityReviewCommentsSerializer(comments, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        if not request.user.is_authenticated:
            return Response(
                {'detail': 'Authentication required'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        data = request.data.copy()
        data['user_id'] = request.user.id
        
        serializer = CommunityReviewCommentsSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def review_comments_delete(request, comment_id):
    """
    Delete a comment (only by author)
    """
    try:
        comment = CommunityReviewComments.objects.get(
            id=comment_id,
            user_id=request.user.id,
            deleted_at__isnull=True
        )
        comment.deleted_at = timezone.now()
        comment.save()
        return Response({'detail': 'Comment deleted'}, status=status.HTTP_200_OK)
    except CommunityReviewComments.DoesNotExist:
        return Response(
            {'detail': 'Comment not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


# =========================================================
# MESSAGES API ENDPOINTS
# =========================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def messages_inbox(request):
    """
    Get user's received messages
    """
    messages = CommunityMessages.objects.filter(
        receiver_id=request.user.id,
        deleted_at__isnull=True
    ).order_by('-created_at')
    serializer = CommunityMessagesSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def messages_outbox(request):
    """
    Get user's sent messages
    """
    messages = CommunityMessages.objects.filter(
        sender_id=request.user.id,
        deleted_at__isnull=True
    ).order_by('-created_at')
    serializer = CommunityMessagesSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def messages_send(request):
    """
    Send a new message
    """
    data = request.data.copy()
    data['sender_id'] = request.user.id
    
    serializer = CommunityMessagesSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def messages_mark_read(request, message_id):
    """
    Mark a message as read
    """
    try:
        message = CommunityMessages.objects.get(
            id=message_id,
            receiver_id=request.user.id,
            deleted_at__isnull=True
        )
        message.read_at = timezone.now()
        message.save()
        return Response({'detail': 'Message marked as read'}, status=status.HTTP_200_OK)
    except CommunityMessages.DoesNotExist:
        return Response(
            {'detail': 'Message not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def messages_delete(request, message_id):
    """
    Delete a message (soft delete)
    """
    message = CommunityMessages.objects.filter(
        id=message_id,
        deleted_at__isnull=True
    ).filter(
        Q(sender_id=request.user.id) | Q(receiver_id=request.user.id)
    ).first()
    
    if not message:
        return Response(
            {'detail': 'Message not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    message.deleted_at = timezone.now()
    message.save()
    return Response({'detail': 'Message deleted'}, status=status.HTTP_200_OK)
