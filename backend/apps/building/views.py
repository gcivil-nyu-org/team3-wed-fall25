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
    """등록/태그/컨텐츠가 전혀 없으면 비어있다고 간주 (취향껏 조정)"""
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

        if building is None or _is_empty_building(building):
            return Response(
                {"detail": "Building not found for given bbl."},
                status=status.HTTP_404_NOT_FOUND,
            )

        payload = _to_primitive(building)
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
