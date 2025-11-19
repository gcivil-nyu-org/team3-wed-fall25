from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from infrastructures.postgres.building_repository import BuildingRepository


def _default_serializer(obj: Any):
    # dataclass → dict
    if is_dataclass(obj):
        return asdict(obj)
    # datetime/date → iso
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    # Decimal → str (금액 손실 방지)
    if isinstance(obj, Decimal):
        return str(obj)
    # 나머지는 문자열 변환
    return str(obj)


def _to_primitive(value):
    """중첩된 dataclass/리스트/딕셔너리를 전부 기본 타입으로 변환"""
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


def _is_empty_building(b) -> bool:
    """등록/태그/컨텐츠가 전혀 없으면 비어있다고 간주 (취향껏 조정)

    Note: A building is NOT considered empty if it has:
    - Registration data
    - Rent stabilized status
    - Contacts
    - Affordable housing
    - Complaints
    - Violations
    - Evictions
    - ACRIS data

    If a building appears on the map (has location data), it should be viewable
    even if it has minimal data. This function allows buildings with any data
    to be viewed.
    """
    # A building is empty only if it has absolutely no data at all
    # If it appears on the map, it has at least location data, so allow it
    return all(
        [
            b.registration is None,
            b.rent_stabilized is None,
            not b.contacts,
            not b.affordable,
            not b.complaints,
            not b.violations,
            not b.evictions,
            not b.acris_master,
            not b.acris_legals,
            not b.acris_parties,
        ]
    )


def _safe_len(x):
    return len(x) if x is not None else 0


def _sum_dict_values_len(d):
    if not isinstance(d, dict):
        return 0
    return sum(len(v) for v in d.values() if v is not None)


class BuildingByBblView(APIView):
    """
    GET /api/building?bbl=1000010001
    """

    permission_classes = [AllowAny]

    def get(self, request):
        bbl = request.query_params.get("bbl")
        if not bbl:
            return Response(
                {"detail": "Query parameter 'bbl' is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not (len(bbl) == 10 and bbl.isdigit()):
            return Response(
                {"detail": "Invalid bbl format. Expected 10-digit numeric string."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            repo = BuildingRepository()
            building = repo.get_by_bbl(bbl)
        except Exception as e:
            return Response(
                {"detail": f"Internal error while fetching building: {e}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        if building is None:
            return Response(
                {"detail": "Building not found for given bbl."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check if building has location data in building_locations (appears on map)
        # If it has location data, allow it to be viewed even if it's otherwise "empty"
        from infrastructures.postgres.postgres_client import PostgresClient
        has_location_data = False
        with PostgresClient() as db:
            location_check = db.query_one(
                """
                SELECT has_location, address
                FROM building_locations
                WHERE bbl = %s
                """,
                (bbl,),
            )
            if location_check:
                has_location_data = bool(location_check.get("has_location"))
                # If building has location but no registration, enrich the building object
                if has_location_data and not building.registration and location_check.get("address"):
                    # Building exists on map but has no registration data
                    # We'll allow it to be viewed with the address from building_locations
                    pass

        # Also check legacy method (evictions with location)
        if not has_location_data and building.evictions:
            has_location_data = any(
                e.latitude is not None and e.longitude is not None
                for e in building.evictions
            )
        
        # If building has registration data, it exists
        if not has_location_data and building.registration:
            has_location_data = bool(
                building.registration.house_number or building.registration.street_name
            )

        # Only reject if building is empty AND has no location data
        # If it appears on the map (has location), allow it to be viewed
        if _is_empty_building(building) and not has_location_data:
            return Response(
                {"detail": "Building not found for given bbl."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = _to_primitive(building)
        
        # Enrich payload with unified address from building_locations
        from infrastructures.postgres.postgres_client import PostgresClient
        with PostgresClient() as db:
            location_row = db.query_one(
                """
                SELECT address, borough, zip
                FROM building_locations
                WHERE bbl = %s AND has_location = TRUE
                """,
                (bbl,),
            )
            if location_row and location_row.get("address"):
                # Add unified address to payload
                payload["unified_address"] = location_row["address"]
                # If registration is missing address, update it
                if not payload.get("registration") or not payload["registration"].get("house_number"):
                    if not payload.get("registration"):
                        payload["registration"] = {}
                    if location_row.get("address") and location_row["address"] != "Address not available":
                        # Try to parse address or use as-is
                        payload["registration"]["unified_address"] = location_row["address"]
        
        payload["counts"] = {
            "contacts": _safe_len(getattr(building, "contacts", None)),
            "affordable": _safe_len(getattr(building, "affordable", None)),
            "complaints": _safe_len(getattr(building, "complaints", None)),
            "violations": _safe_len(getattr(building, "violations", None)),
            "evictions": _safe_len(getattr(building, "evictions", None)),
            "acris_docs": _safe_len(getattr(building, "acris_master", None)),
            "acris_legals": _sum_dict_values_len(
                getattr(building, "acris_legals", None)
            ),
            "acris_parties": _sum_dict_values_len(
                getattr(building, "acris_parties", None)
            ),
        }
        return Response(payload, status=status.HTTP_200_OK)


class BuildingSearchView(APIView):
    """
    GET /api/buildings/search/?q=10001&limit=10&borough=Manhattan
    Search buildings by address or zip code with advanced filtering.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        limit = int(request.query_params.get("limit", 10))
        borough = request.query_params.get("borough")

        # Advanced filters
        rent_stabilized = request.query_params.get("rent_stabilized")
        affordable_housing = request.query_params.get("affordable_housing")
        risk_level = request.query_params.get("risk_level")
        violation_class = request.query_params.get("violation_class")
        rent_impairing = request.query_params.get("rent_impairing")
        complaint_category = request.query_params.get("complaint_category")
        recent_activity_days = request.query_params.get("recent_activity_days")
        evictions_min = request.query_params.get("evictions_min")
        evictions_max = request.query_params.get("evictions_max")
        violations_min = request.query_params.get("violations_min")
        violations_max = request.query_params.get("violations_max")
        zip_code = request.query_params.get("zip")
        sort_by_raw = request.query_params.get("sort_by", "Most Relevant")
        # Handle URL encoding - Django automatically decodes, but be safe
        sort_by = (
            sort_by_raw.replace("+", " ").replace("%20", " ").strip()
            if sort_by_raw
            else "Most Relevant"
        )

        # Allow empty query if filters are provided
        has_filters = any([
            borough and borough != "All Boroughs",
            rent_stabilized,
            affordable_housing,
            risk_level and risk_level != "Any",
            violation_class and violation_class != "Any",
            rent_impairing and rent_impairing != "Any",
            complaint_category and complaint_category != "Any",
            recent_activity_days,
            evictions_min,
            evictions_max,
            violations_min,
            violations_max,
            zip_code,
        ])
        
        if not query and not has_filters:
            return Response(
                {
                    "result": False,
                    "detail": "Query parameter 'q' (address, zip code, BBL, or borough) or at least one filter is required.",
                    "data": [],
                    "total": 0,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate limit
        # Allow up to 1000 per page for better pagination (total can be up to 100k)
        if limit < 1 or limit > 1000:
            limit = 10

        try:
            repo = BuildingRepository()
            
            # Get total count first
            total_count = repo.search_buildings_count(
                query=query,
                borough=borough,
                rent_stabilized=rent_stabilized,
                affordable_housing=affordable_housing,
                risk_level=risk_level,
                violation_class=violation_class,
                rent_impairing=rent_impairing,
                complaint_category=complaint_category,
                recent_activity_days=recent_activity_days,
                evictions_min=evictions_min,
                evictions_max=evictions_max,
                violations_min=violations_min,
                violations_max=violations_max,
                zip_code=zip_code,
            )
            
            # Get paginated results
            page = int(request.query_params.get("page", 1))
            offset = (page - 1) * limit
            
            results = repo.search_buildings(
                query=query,
                limit=limit,
                offset=offset,
                borough=borough,
                rent_stabilized=rent_stabilized,
                affordable_housing=affordable_housing,
                risk_level=risk_level,
                violation_class=violation_class,
                rent_impairing=rent_impairing,
                complaint_category=complaint_category,
                recent_activity_days=recent_activity_days,
                evictions_min=evictions_min,
                evictions_max=evictions_max,
                violations_min=violations_min,
                violations_max=violations_max,
                zip_code=zip_code,
                sort_by=sort_by,
            )

            return Response(
                {
                    "result": True,
                    "data": results,
                    "total": total_count,
                    "page": page,
                    "limit": limit,
                },
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            return Response(
                {
                    "result": False,
                    "detail": f"Error searching buildings: {e}",
                    "data": [],
                    "total": 0,
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
