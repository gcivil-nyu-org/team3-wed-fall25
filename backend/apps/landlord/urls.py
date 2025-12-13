from django.urls import path
from .views import (
    PropertiesView,
    ViolationsView,
    ReviewsView,
    landlord_apply_get,
    ViolationsByBBLView,
    ComplaintsByBBLView,
    BuildingStatsView,
    BuildingPlutoView,
    LandlordStatsView,
    ViolationUpdateView,
    ComplaintUpdateView,
    ReviewResponseView,
    FlagReviewView,
    BuildingUpdateView,
    LandlordsByBBLView,
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
    # NEW endpoints for building detail page
    path(
        "violations/bbl/<str:bbl>/",
        ViolationsByBBLView.as_view(),
        name="violations_by_bbl",
    ),
    path(
        "complaints/bbl/<str:bbl>/",
        ComplaintsByBBLView.as_view(),
        name="complaints_by_bbl",
    ),
    path(
        "building-stats/bbl/<str:bbl>/",
        BuildingStatsView.as_view(),
        name="building_stats",
    ),
    path(
        "building/<str:bbl>/update/",
        BuildingUpdateView.as_view(),
        name="building_update",
    ),
    path(
        "building/<str:bbl>/pluto/",
        BuildingPlutoView.as_view(),
        name="building_pluto",
    ),
    # Update endpoints for individual violations/complaints
    path(
        "violation/<int:violation_id>/",
        ViolationUpdateView.as_view(),
        name="violation_update",
    ),
    path(
        "complaint/<int:complaint_id>/",
        ComplaintUpdateView.as_view(),
        name="complaint_update",
    ),
    path("stats/", LandlordStatsView.as_view(), name="landlord_stats"),
    path("reviews/response/", ReviewResponseView.as_view(), name="review_response"),
    path("reviews/flag/", FlagReviewView.as_view(), name="flag_review"),
    path(
        "landlords/<str:bbl>/",
        LandlordsByBBLView.as_view(),
        name="landlords-by-bbl",
    ),
]
