from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class CommunityFavorites(models.Model):
    """
    User favorites/bookmarks for buildings
    Maps to community_favorites table
    """
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()  # Django User PK
    bbl = models.TextField()  # building_registrations.bbl
    note = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'community_favorites'
        indexes = [
            models.Index(fields=['bbl'], name='idx_favorites_bbl'),
            models.Index(fields=['user_id'], name='idx_favorites_user'),
            models.Index(fields=['user_id', '-created_at'], name='idx_favorites_user_createdat'),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user_id', 'bbl'],
                condition=models.Q(deleted_at__isnull=True),
                name='uq_favorites_user_bbl_active'
            )
        ]


class CommunityReviews(models.Model):
    """
    User reviews for buildings (rating is nullable)
    Maps to community_reviews table
    """
    id = models.BigAutoField(primary_key=True)
    user_id = models.BigIntegerField()
    bbl = models.TextField()
    rating = models.DecimalField(
        max_digits=2, 
        decimal_places=1, 
        blank=True, 
        null=True,
        validators=[MinValueValidator(0.1), MaxValueValidator(5.0)]
    )  # NULL or 0<rating<=5.0
    title = models.TextField()
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'community_reviews'
        indexes = [
            models.Index(fields=['bbl'], name='idx_reviews_bbl'),
            models.Index(fields=['bbl', '-created_at'], name='idx_reviews_bbl_createdat'),
            models.Index(fields=['bbl', 'rating'], name='idx_reviews_bbl_rating_nonnull'),
            models.Index(fields=['user_id'], name='idx_reviews_user'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(rating__isnull=True) | models.Q(rating__gt=0, rating__lte=5.0),
                name='chk_reviews_rating_valid'
            )
        ]


class CommunityReviewComments(models.Model):
    """
    Comments on reviews (no nested replies)
    Maps to community_review_comments table
    """
    id = models.BigAutoField(primary_key=True)
    review_id = models.BigIntegerField()  # FK not used - app manages integrity
    user_id = models.BigIntegerField()
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'community_review_comments'
        indexes = [
            models.Index(fields=['review_id'], name='idx_comments_review'),
            models.Index(fields=['review_id', 'created_at'], name='idx_comments_review_created'),
            models.Index(fields=['user_id'], name='idx_comments_user'),
        ]


class CommunityMessages(models.Model):
    """
    1:1 Direct messages between users
    Maps to community_messages table
    """
    id = models.BigAutoField(primary_key=True)
    sender_id = models.BigIntegerField()
    receiver_id = models.BigIntegerField()
    bbl = models.TextField(blank=True, null=True)  # Optional building context
    body = models.TextField()
    read_at = models.DateTimeField(blank=True, null=True)  # NULL = unread
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = 'community_messages'
        indexes = [
            models.Index(fields=['receiver_id', 'read_at'], name='idx_messages_inbox_unread'),
            models.Index(fields=['receiver_id', '-created_at'], name='idx_messages_inbox_time'),
            models.Index(fields=['sender_id', '-created_at'], name='idx_messages_outbox_time'),
            models.Index(fields=['bbl'], name='idx_messages_bbl'),
        ]
