from django.contrib.auth import get_user_model
from rest_framework import serializers

User = get_user_model()

from .models import (
    CommunityFavorites,
    CommunityMessages,
    CommunityReviewComments,
    CommunityReviews,
)

User = get_user_model()


class CommunityFavoritesSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityFavorites
        fields = ["id", "user_id", "bbl", "note", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CommunityReviewsSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = CommunityReviews
        fields = [
            "id",
            "user_id",
            "username",
            "email",
            "bbl",
            "rating",
            "title",
            "body",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_username(self, obj):
        try:
            user = User.objects.get(id=obj.user_id)
            return user.username
        except User.DoesNotExist:
            return None

    def get_email(self, obj):
        try:
            user = User.objects.get(id=obj.user_id)
            return user.email
        except User.DoesNotExist:
            return None


class CommunityReviewCommentsSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()

    class Meta:
        model = CommunityReviewComments
        fields = [
            "id",
            "review_id",
            "user_id",
            "username",
            "email",
            "body",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_username(self, obj):
        try:
            user = User.objects.get(id=obj.user_id)
            return user.username
        except User.DoesNotExist:
            return None

    def get_email(self, obj):
        try:
            user = User.objects.get(id=obj.user_id)
            return user.email
        except User.DoesNotExist:
            return None


class CommunityMessagesSerializer(serializers.ModelSerializer):
    sender_username = serializers.SerializerMethodField()
    sender_email = serializers.SerializerMethodField()
    receiver_username = serializers.SerializerMethodField()
    receiver_email = serializers.SerializerMethodField()

    class Meta:
        model = CommunityMessages
        fields = [
            "id",
            "sender_id",
            "sender_username",
            "sender_email",
            "receiver_id",
            "receiver_username",
            "receiver_email",
            "bbl",
            "body",
            "read_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_sender_username(self, obj):
        try:
            user = User.objects.get(id=obj.sender_id)
            return user.username
        except User.DoesNotExist:
            return None

    def get_sender_email(self, obj):
        try:
            user = User.objects.get(id=obj.sender_id)
            return user.email
        except User.DoesNotExist:
            return None

    def get_receiver_username(self, obj):
        try:
            user = User.objects.get(id=obj.receiver_id)
            return user.username
        except User.DoesNotExist:
            return None

    def get_receiver_email(self, obj):
        try:
            user = User.objects.get(id=obj.receiver_id)
            return user.email
        except User.DoesNotExist:
            return None
