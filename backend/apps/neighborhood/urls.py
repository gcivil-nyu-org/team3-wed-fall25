from django.urls import path

from .views import (
    BoroughSummaryView,
    HeatmapDataView,
    NeighborhoodStatsView,
    NeighborhoodTrendsView,
)

urlpatterns = [
    path("stats/", NeighborhoodStatsView.as_view(), name="neighborhood_stats"),
    path("heatmap/", HeatmapDataView.as_view(), name="heatmap_data"),
    path("borough-summary/", BoroughSummaryView.as_view(), name="borough_summary"),
    path("trends/", NeighborhoodTrendsView.as_view(), name="neighborhood_trends"),
]
