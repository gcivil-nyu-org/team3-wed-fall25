from django.urls import path
from .views import RegisterView, MeView

urlpatterns = [
    path("signup/", RegisterView.as_view(), name="signup"),
    path("profile/", MeView.as_view(), name="profile"),
]