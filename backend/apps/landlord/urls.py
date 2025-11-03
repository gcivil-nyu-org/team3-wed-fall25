from django.urls import path
from .views import (
    PropertiesView,
    ViolationsView,
    ReviewsView,
    LandlordApplicationView,
    landlord_apply_get,
)

urlpatterns = [
    path(
        "<str:landlord_id>/properties/",
        PropertiesView.as_view(),
        name="landlord_properties",
    ),
    path(
        "<str:landlord_id>/violations/",
        ViolationsView.as_view(),
        name="landlord_violations",
    ),
    path("<str:landlord_id>/reviews/", ReviewsView.as_view(), name="landlord_reviews"),
    path("properties/", PropertiesView.as_view(), name="landlord_properties"),
    path("violations/", ViolationsView.as_view(), name="landlord_violations"),
    path("reviews/", ReviewsView.as_view(), name="landlord_reviews"),
    # path('apply/', LandlordApplicationView.as_view(), name='landlord_application'),
    path("apply/", landlord_apply_get, name="landlord_application"),
]
