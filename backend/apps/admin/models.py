from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class AdminActivityLog(models.Model):
    """
    Tracks admin actions for audit purposes
    """

    ACTION_CHOICES = [
        ("approved_review", "Approved Review"),
        ("removed_review", "Removed Review"),
        ("banned_user", "Banned User"),
        ("unbanned_user", "Unbanned User"),
        ("resolved_report", "Resolved Report"),
    ]

    id = models.BigAutoField(primary_key=True)
    admin_user = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="admin_actions"
    )
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=50)  # "review", "user", etc.
    target_id = models.BigIntegerField()  # ID of the target (review_id, user_id, etc.)
    target_description = models.TextField()  # Human-readable description
    details = models.JSONField(default=dict, blank=True)  # Additional metadata
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "admin_activity_logs"
        indexes = [
            models.Index(fields=["-created_at"], name="idx_admin_logs_created"),
            models.Index(
                fields=["admin_user", "-created_at"], name="idx_admin_logs_user"
            ),
            models.Index(
                fields=["action", "-created_at"], name="idx_admin_logs_action"
            ),
        ]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_action_display()} - {self.target_description} by {self.admin_user}"
