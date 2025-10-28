from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

# Simple mocked endpoints for landlord data. Replace with real data access later.

class PropertiesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, landlord_id):
        data = [
            {
                "id": "p1",
                "address": "123 Main St, Brooklyn, NY",
                "occupancy_status": "Occupied",
                "financial_performance": "Good",
                "tenant_turnover": "Low",
            },
            {
                "id": "p2",
                "address": "456 Park Ave, Manhattan, NY",
                "occupancy_status": "Vacant",
                "financial_performance": "Average",
                "tenant_turnover": "High",
            }
        ]
        return Response(data, status=status.HTTP_200_OK)

class ViolationsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, landlord_id):
        data = [
            {"id": "v1", "message": "Broken fire escape", "resolved": False},
            {"id": "v2", "message": "Missing smoke detectors", "resolved": False},
        ]
        return Response(data, status=status.HTTP_200_OK)

class ReviewsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, landlord_id):
        data = [
            {"id": "r1", "author": "Jane D.", "content": "Quick to fix issues.", "date": "2025-09-01", "flagged": False},
            {"id": "r2", "author": "John S.", "content": "Slow support.", "date": "2025-08-15", "flagged": False},
        ]
        return Response(data, status=status.HTTP_200_OK)
