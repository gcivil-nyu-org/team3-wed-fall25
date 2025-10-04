from django.urls import path
from .views import DummyItemListCreateView, DummyItemDetailView

urlpatterns = [
    path("items", DummyItemListCreateView.as_view(), name="dummy-item-list-create"),
    path("items/<int:item_id>", DummyItemDetailView.as_view(), name="dummy-item-detail"),
]