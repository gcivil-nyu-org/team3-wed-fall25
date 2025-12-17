from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    LoginView,
    ProfileView,
    VerifyEmailView,
    ResendVerificationView,
    UsersListView,
)
from .admin_views import (
    admin_stats,
    admin_flagged_reviews,
    admin_all_reviews,
    admin_approve_review,
    admin_delete_review,
    admin_users,
    admin_platform_health,
)

urlpatterns = [
    path("signup/", RegisterView.as_view(), name="register"),
    path("signup", RegisterView.as_view(), name="signup"),  # Alias for tests
    path("login/", LoginView.as_view(), name="login"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("users/", UsersListView.as_view(), name="users_list"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path(
        "resend-verification/",
        ResendVerificationView.as_view(),
        name="resend-verification",
    ),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    # Admin endpoints
    path("admin/stats/", admin_stats, name="admin_stats"),
    path("admin/flagged-reviews/", admin_flagged_reviews, name="admin_flagged_reviews"),
    path("admin/reviews/", admin_all_reviews, name="admin_all_reviews"),
    path(
        "admin/reviews/<int:review_id>/approve/",
        admin_approve_review,
        name="admin_approve_review",
    ),
    path(
        "admin/reviews/<int:review_id>/",
        admin_delete_review,
        name="admin_delete_review",
    ),
    path("admin/users/", admin_users, name="admin_users"),
    path("admin/health/", admin_platform_health, name="admin_platform_health"),
]
