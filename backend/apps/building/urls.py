from django.urls import path

from .views import BuildingByBblView, BuildingSearchView

urlpatterns = [
    path(
        "", BuildingByBblView.as_view(), name="building_by_bbl"
    ),  # GET /api/building?bbl=1000010001
    path(
        "search/", BuildingSearchView.as_view(), name="building_search"
    ),  # GET /api/building/search/?q=10001&limit=10&borough=Manhattan
]
