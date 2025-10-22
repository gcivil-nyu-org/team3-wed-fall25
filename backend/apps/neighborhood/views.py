from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from decimal import Decimal

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from infrastructures.postgres.neighborhood_repository import NeighborhoodRepository


def _to_primitive(value):
    """Convert nested dataclass/list/dict to primitive types"""
    if is_dataclass(value):
        value = asdict(value)
    if isinstance(value, dict):
        return {k: _to_primitive(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_to_primitive(v) for v in value]
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    return value


class NeighborhoodStatsView(APIView):
    """
    GET /api/neighborhood/stats?min_lat=40.7&max_lat=40.8&min_lng=-74.0&max_lng=-73.9&data_type=violations

    Get neighborhood statistics for buildings within geographic bounds.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        # Get query parameters
        min_lat = request.query_params.get("min_lat")
        max_lat = request.query_params.get("max_lat")
        min_lng = request.query_params.get("min_lng")
        max_lng = request.query_params.get("max_lng")
        data_type = request.query_params.get("data_type", "violations")

        # Validate required parameters
        if not all([min_lat, max_lat, min_lng, max_lng]):
            return Response(
                {
                    "detail": "Missing required parameters: min_lat, max_lat, min_lng, max_lng"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate data type
        if data_type not in ["violations", "evictions", "complaints"]:
            return Response(
                {
                    "detail": "Invalid data_type. Must be one of: violations, evictions, complaints"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Convert to float
            min_lat = float(min_lat)
            max_lat = float(max_lat)
            min_lng = float(min_lng)
            max_lng = float(max_lng)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid coordinate values. Must be valid numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            repo = NeighborhoodRepository()
            stats = repo.get_neighborhood_stats_by_bounds(
                min_lat=min_lat,
                max_lat=max_lat,
                min_lng=min_lng,
                max_lng=max_lng,
                data_type=data_type,
            )

            # Convert to primitive types for JSON serialization
            payload = _to_primitive(stats)

            return Response(
                {
                    "result": True,
                    "data": payload,
                    "count": len(payload),
                    "bounds": {
                        "min_lat": min_lat,
                        "max_lat": max_lat,
                        "min_lng": min_lng,
                        "max_lng": max_lng,
                    },
                    "data_type": data_type,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"detail": f"Internal error while fetching neighborhood stats: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class HeatmapDataView(APIView):
    """
    GET /api/neighborhood/heatmap?min_lat=40.7&max_lat=40.8&min_lng=-74.0&max_lng=-73.9&data_type=violations&borough=MANHATTAN

    Get heatmap data points for visualization.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        # Get query parameters
        min_lat = request.query_params.get("min_lat")
        max_lat = request.query_params.get("max_lat")
        min_lng = request.query_params.get("min_lng")
        max_lng = request.query_params.get("max_lng")
        data_type = request.query_params.get("data_type", "violations")
        borough = request.query_params.get("borough", "All Boroughs")
        limit = request.query_params.get(
            "limit", "50000"
        )  # Default limit for performance

        # Validate required parameters
        if not all([min_lat, max_lat, min_lng, max_lng]):
            return Response(
                {
                    "detail": "Missing required parameters: min_lat, max_lat, min_lng, max_lng"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate data type
        if data_type not in ["violations", "evictions", "complaints"]:
            return Response(
                {
                    "detail": "Invalid data_type. Must be one of: violations, evictions, complaints"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Convert to float
            min_lat = float(min_lat)
            max_lat = float(max_lat)
            min_lng = float(min_lng)
            max_lng = float(max_lng)
            limit = int(limit)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid coordinate values. Must be valid numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            repo = NeighborhoodRepository()
            heatmap_data = repo.get_heatmap_data(
                min_lat=min_lat,
                max_lat=max_lat,
                min_lng=min_lng,
                max_lng=max_lng,
                data_type=data_type,
                borough=borough,
                limit=limit,
            )

            # Convert to primitive types for JSON serialization
            payload = _to_primitive(heatmap_data)

            return Response(
                {
                    "result": True,
                    "data": payload,
                    "count": len(payload),
                    "bounds": {
                        "min_lat": min_lat,
                        "max_lat": max_lat,
                        "min_lng": min_lng,
                        "max_lng": max_lng,
                    },
                    "data_type": data_type,
                    "limit": limit,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"detail": f"Internal error while fetching heatmap data: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BoroughSummaryView(APIView):
    """
    GET /api/neighborhood/borough-summary?borough=MANHATTAN

    Get summary statistics by borough.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        borough = request.query_params.get("borough")

        try:
            repo = NeighborhoodRepository()
            summary = repo.get_borough_summary(borough=borough)

            # Convert to primitive types for JSON serialization
            payload = _to_primitive(summary)

            return Response(
                {
                    "result": True,
                    "data": payload,
                    "count": len(payload),
                    "borough": borough,
                },
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"detail": f"Internal error while fetching borough summary: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class NeighborhoodTrendsView(APIView):
    """
    GET /api/neighborhood/trends?bbl=1013510030&days_back=365

    Get trend data for a specific building/neighborhood.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        bbl = request.query_params.get("bbl")
        days_back = request.query_params.get("days_back", "365")

        if not bbl:
            return Response(
                {"detail": "Missing required parameter: bbl"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (len(bbl) == 10 and bbl.isdigit()):
            return Response(
                {"detail": "Invalid bbl format. Expected 10-digit numeric string."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            days_back = int(days_back)
            if days_back <= 0 or days_back > 3650:  # Max 10 years
                return Response(
                    {"detail": "Invalid days_back. Must be between 1 and 3650."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid days_back value. Must be a valid integer."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            repo = NeighborhoodRepository()
            trends = repo.get_neighborhood_trends(bbl=bbl, days_back=days_back)

            # Convert to primitive types for JSON serialization
            payload = _to_primitive(trends)

            return Response(
                {"result": True, "data": payload, "bbl": bbl, "days_back": days_back},
                status=status.HTTP_200_OK,
            )

        except Exception as e:
            return Response(
                {"detail": f"Internal error while fetching trends: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
