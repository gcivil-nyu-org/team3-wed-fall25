from django.urls import path
from .views import (
    AdminStatsView,
    FlaggedReviewsView,
    ApproveReviewView,
    RemoveReviewView,
    BanUserView,
    WeeklyStatsView,
)

urlpatterns = [
    path("stats/", AdminStatsView.as_view(), name="admin_stats"),
    path(
        "flagged-reviews/", FlaggedReviewsView.as_view(), name="admin_flagged_reviews"
    ),
    path("reviews/approve/", ApproveReviewView.as_view(), name="admin_approve_review"),
    path("reviews/remove/", RemoveReviewView.as_view(), name="admin_remove_review"),
    path("users/ban/", BanUserView.as_view(), name="admin_ban_user"),
    path("weekly-stats/", WeeklyStatsView.as_view(), name="admin_weekly_stats"),
]
