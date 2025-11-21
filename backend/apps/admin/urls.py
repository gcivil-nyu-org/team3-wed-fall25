from django.urls import path
from .views import (
    admin_stats,
    moderation_queue,
    approve_review,
    remove_review,
    activity_logs,
    weekly_stats,
    platform_health,
)

urlpatterns = [
    path("stats/", admin_stats, name="admin_stats"),
    path("moderation-queue/", moderation_queue, name="moderation_queue"),
    path("reviews/<int:review_id>/approve/", approve_review, name="approve_review"),
    path("reviews/<int:review_id>/remove/", remove_review, name="remove_review"),
    path("activity-logs/", activity_logs, name="activity_logs"),
    path("weekly-stats/", weekly_stats, name="weekly_stats"),
    path("health/", platform_health, name="platform_health"),
]
