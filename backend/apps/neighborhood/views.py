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
    GET /api/neighborhood/stats?min_lat=40.7&max_lat=40.8&min_lng=-74.0&max_lng=-73.9
    &data_type=violations

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
    GET /api/neighborhood/heatmap?min_lat=40.7&max_lat=40.8&min_lng=-74.0&max_lng=-73.9
    &data_type=violations&borough=MANHATTAN

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
        time_range = request.query_params.get(
            "time_range", "all"
        )  # "all", "6months", "1year", "3years"

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
                time_range=(
                    time_range
                    if time_range in ["all", "6months", "1year", "3years"]
                    else "all"
                ),
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


class RentStabilizedBBLsView(APIView):
    """
    GET /api/neighborhood/rent-stabilized-bbls/

    Get all rent-stabilized building BBLs.
    Returns a simple list of BBL strings.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        try:
            from infrastructures.postgres.postgres_client import PostgresClient

            with PostgresClient() as db:
                rows = db.query_all(
                    """
                    SELECT DISTINCT bbl
                    FROM building_rent_stabilized_list
                    WHERE bbl IS NOT NULL
                    """
                )
                bbls = [row["bbl"] for row in rows if row.get("bbl")]

            return Response(
                {
                    "result": True,
                    "data": bbls,
                    "count": len(bbls),
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"detail": f"Internal error while fetching rent stabilized BBLs: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class AffordableHousingBBLsView(APIView):
    """
    GET /api/neighborhood/affordable-housing-bbls/

    Get all affordable housing building BBLs.
    Returns a simple list of BBL strings.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        try:
            from infrastructures.postgres.postgres_client import PostgresClient

            with PostgresClient() as db:
                rows = db.query_all(
                    """
                    SELECT DISTINCT bbl
                    FROM building_affordable_housing
                    WHERE bbl IS NOT NULL
                    """
                )
                bbls = [row["bbl"] for row in rows if row.get("bbl")]

            return Response(
                {
                    "result": True,
                    "data": bbls,
                    "count": len(bbls),
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "detail": (
                        f"Internal error while fetching affordable housing BBLs: {e}"
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class FilteredViolationsView(APIView):
    """
    GET /api/neighborhood/filtered-violations?min_lat=40.7&max_lat=40.8
    &min_lng=-74.0&max_lng=-73.9&min_open_violations=5&max_open_violations=50

    Get violation points with advanced filtering options:
    - Status filters: min_open_violations, max_open_violations,
      min_closed_violations, max_closed_violations
    - Class filters: min_class_a, max_class_a, min_class_b, max_class_b, min_class_c, max_class_c
    - Response time: max_response_days (buildings that fix issues within X days)
    """

    permission_classes = [AllowAny]

    def get(self, request):
        # Get query parameters
        min_lat = request.query_params.get("min_lat")
        max_lat = request.query_params.get("max_lat")
        min_lng = request.query_params.get("min_lng")
        max_lng = request.query_params.get("max_lng")
        borough = request.query_params.get("borough", "All Boroughs")
        limit = request.query_params.get("limit", "1000000")

        # Status filters
        min_open_violations = request.query_params.get("min_open_violations")
        max_open_violations = request.query_params.get("max_open_violations")
        min_closed_violations = request.query_params.get("min_closed_violations")
        max_closed_violations = request.query_params.get("max_closed_violations")

        # Class filters
        min_class_a = request.query_params.get("min_class_a")
        max_class_a = request.query_params.get("max_class_a")
        min_class_b = request.query_params.get("min_class_b")
        max_class_b = request.query_params.get("max_class_b")
        min_class_c = request.query_params.get("min_class_c")
        max_class_c = request.query_params.get("max_class_c")

        # Response time filter
        max_response_days = request.query_params.get("max_response_days")

        # Validate required parameters
        if not all([min_lat, max_lat, min_lng, max_lng]):
            return Response(
                {
                    "detail": "Missing required parameters: min_lat, max_lat, min_lng, max_lng"
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            # Convert to appropriate types
            min_lat = float(min_lat)
            max_lat = float(max_lat)
            min_lng = float(min_lng)
            max_lng = float(max_lng)
            limit = int(limit)

            # Parse optional filters
            min_open_violations = (
                int(min_open_violations) if min_open_violations else None
            )
            max_open_violations = (
                int(max_open_violations) if max_open_violations else None
            )
            min_closed_violations = (
                int(min_closed_violations) if min_closed_violations else None
            )
            max_closed_violations = (
                int(max_closed_violations) if max_closed_violations else None
            )

            min_class_a = int(min_class_a) if min_class_a else None
            max_class_a = int(max_class_a) if max_class_a else None
            min_class_b = int(min_class_b) if min_class_b else None
            max_class_b = int(max_class_b) if max_class_b else None
            min_class_c = int(min_class_c) if min_class_c else None
            max_class_c = int(max_class_c) if max_class_c else None

            max_response_days = int(max_response_days) if max_response_days else None
        except (ValueError, TypeError) as e:
            return Response(
                {"detail": f"Invalid parameter values: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            repo = NeighborhoodRepository()
            points = repo.get_filtered_violations_points(
                min_lat=min_lat,
                max_lat=max_lat,
                min_lng=min_lng,
                max_lng=max_lng,
                borough=borough if borough != "All Boroughs" else None,
                limit=limit,
                min_open_violations=min_open_violations,
                max_open_violations=max_open_violations,
                min_closed_violations=min_closed_violations,
                max_closed_violations=max_closed_violations,
                min_class_a=min_class_a,
                max_class_a=max_class_a,
                min_class_b=min_class_b,
                max_class_b=max_class_b,
                min_class_c=min_class_c,
                max_class_c=max_class_c,
                max_response_days=max_response_days,
            )

            return Response(
                {
                    "result": True,
                    "data": [_to_primitive(point) for point in points],
                    "count": len(points),
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {"detail": f"Internal error while fetching filtered violations: {e}"},
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
