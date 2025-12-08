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
]
