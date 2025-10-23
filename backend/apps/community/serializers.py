from rest_framework import serializers
from .models import CommunityFavorites, CommunityReviews, CommunityReviewComments, CommunityMessages


class CommunityFavoritesSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityFavorites
        fields = ['id', 'user_id', 'bbl', 'note', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CommunityReviewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityReviews
        fields = ['id', 'user_id', 'bbl', 'rating', 'title', 'body', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CommunityReviewCommentsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityReviewComments
        fields = ['id', 'review_id', 'user_id', 'body', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class CommunityMessagesSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityMessages
        fields = ['id', 'sender_id', 'receiver_id', 'bbl', 'body', 'read_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
