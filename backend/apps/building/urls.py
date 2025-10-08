from django.urls import path
from .views import BuildingByBblView

urlpatterns = [
    path("", BuildingByBblView.as_view(), name="building_by_bbl"),  # GET /api/building?bbl=1000010001
]
