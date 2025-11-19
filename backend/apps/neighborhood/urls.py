from django.urls import path

from .views import (
    AffordableHousingBBLsView,
    BoroughSummaryView,
    FilteredViolationsView,
    HeatmapDataView,
    NeighborhoodStatsView,
    NeighborhoodTrendsView,
    RentStabilizedBBLsView,
)

urlpatterns = [
    path("stats/", NeighborhoodStatsView.as_view(), name="neighborhood_stats"),
    path("heatmap/", HeatmapDataView.as_view(), name="heatmap_data"),
    path("borough-summary/", BoroughSummaryView.as_view(), name="borough_summary"),
    path("trends/", NeighborhoodTrendsView.as_view(), name="neighborhood_trends"),
    path(
        "rent-stabilized-bbls/",
        RentStabilizedBBLsView.as_view(),
        name="rent_stabilized_bbls",
    ),
    path(
        "affordable-housing-bbls/",
        AffordableHousingBBLsView.as_view(),
        name="affordable_housing_bbls",
    ),
    path(
        "filtered-violations/",
        FilteredViolationsView.as_view(),
        name="filtered_violations",
    ),
]
