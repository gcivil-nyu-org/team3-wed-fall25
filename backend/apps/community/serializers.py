from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    CommunityFavorites,
    CommunityMessages,
    CommunityReviewComments,
    CommunityReviews,
)

User = get_user_model()


def _get_user_field(user_id, field_name):
    """
    user_id가 가리키는 User의 field_name 값을 돌려준다.
    없으면 None.
    """
    if not user_id:
        return None
    return User.objects.filter(id=user_id).values_list(field_name, flat=True).first()


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
        return _get_user_field(obj.user_id, "username")

    def get_email(self, obj):
        return _get_user_field(obj.user_id, "email")


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
        return _get_user_field(obj.user_id, "username")

    def get_email(self, obj):
        return _get_user_field(obj.user_id, "email")


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
        return _get_user_field(obj.sender_id, "username")

    def get_sender_email(self, obj):
        return _get_user_field(obj.sender_id, "email")

    def get_receiver_username(self, obj):
        return _get_user_field(obj.receiver_id, "username")

    def get_receiver_email(self, obj):
        return _get_user_field(obj.receiver_id, "email")
