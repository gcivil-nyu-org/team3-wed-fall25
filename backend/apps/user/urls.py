from django.urls import path

from .views import MeView, RegisterView

urlpatterns = [
    path("signup/", RegisterView.as_view(), name="signup"),
    path("profile/", MeView.as_view(), name="profile"),
]
