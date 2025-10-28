from django.urls import path
from .views import PropertiesView, ViolationsView, ReviewsView

urlpatterns = [
    path('<str:landlord_id>/properties/', PropertiesView.as_view(), name='landlord_properties'),
    path('<str:landlord_id>/violations/', ViolationsView.as_view(), name='landlord_violations'),
    path('<str:landlord_id>/reviews/', ReviewsView.as_view(), name='landlord_reviews'),
]
