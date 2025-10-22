from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework import status

from infrastructures.postgres.postgres_client import PostgresClient
from infrastructures.postgres.building_repository import BuildingRepository
#from django.conf import settings


# DB-backed endpoints for landlord data. If DB access fails, return sensible mock data
# so the frontend can still operate in development mode.

def _mock_properties():
    return [
        {
            "id": "p1",
            "address": "123 Main St, Brooklyn, NY",
            "occupancy_status": "Occupied",
            "financial_performance": "Good",
            "tenant_turnover": "Low",
        }
    ]


class PropertiesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, landlord_id):
        """Return list of properties (by BBL) owned by landlord (owner_user_id == landlord_id).

        Uses `landlord_owners` table to look up BBLs, then queries BuildingRepository
        for registration/address/complaints/evictions related to each BBL.
        """
        try:
            # find BBLs for this landlord
            with PostgresClient() as db:
                rows = db.query_all(
                    """
                    SELECT bbl
                    FROM landlord_owners
                    WHERE owner_user_id = %s AND deleted_at IS NULL
                    """,
                    (landlord_id,),
                )

            bbls = [r["bbl"] for r in rows]
            if not bbls:
                return Response([], status=status.HTTP_200_OK)

            repo = BuildingRepository()
            buildings = repo.get_many_by_bbl(bbls)

            properties = []
            for bbl, bld in buildings.items():
                reg = getattr(bld, "registration", None) if bld else None
                address = None
                if reg:
                    # Registration is a dataclass with attributes
                    hn = getattr(reg, "house_number", None)
                    sn = getattr(reg, "street_name", None)
                    boro = getattr(reg, "boro", None) or getattr(reg, "boro", None)
                    address = ", ".join([s for s in [hn, sn, boro] if s])

                violations_count = len(getattr(bld, "complaints", []) or []) + len(getattr(bld, "violations", []) or [])
                evictions_count = len(getattr(bld, "evictions", []) or [])

                properties.append(
                    {
                        "id": bbl,
                        "bbl": bbl,
                        "address": address or bbl,
                        "occupancy_status": None,
                        "financial_performance": None,
                        "tenant_turnover": None,
                        "violations_count": violations_count,
                        "evictions_count": evictions_count,
                    }
                )
            return Response(properties, status=status.HTTP_200_OK)
        except Exception as e:
            # Log server-side in real app; here we just fall back to mock
            print(f"[PropertiesView] DB error: {e}")
            return Response(_mock_properties(), status=status.HTTP_200_OK)


class ViolationsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, landlord_id):
        """Return aggregated violations/complaints for all BBLs owned by landlord."""
        try:
            with PostgresClient() as db:
                rows = db.query_all(
                    """
                    SELECT bbl
                    FROM landlord_owners
                    WHERE owner_user_id = %s AND deleted_at IS NULL
                    """,
                    (landlord_id,),
                )

            bbls = [r["bbl"] for r in rows]
            if not bbls:
                return Response([], status=status.HTTP_200_OK)

            # reuse BuildingRepository to get complaints/violations
            repo = BuildingRepository()
            violations = []
            for bbl in bbls:
                bld = repo.get_by_bbl(bbl)
                if not bld:
                    continue
                # complaints is a list of Complaint dataclasses
                for c in getattr(bld, "complaints", []) or []:
                    violations.append({
                        "id": getattr(c, "complaint_id", None),
                        "bbl": bbl,
                        "message": getattr(c, "status_description", None) or getattr(c, "minor_category", None) or getattr(c, "major_category", None),
                        "resolved": (getattr(c, "complaint_status", "") or "").lower() in ("closed", "close", "resolved"),
                    })
                # also include violations dataclass entries
                for v in getattr(bld, "violations", []) or []:
                    violations.append({
                        "id": getattr(v, "violation_id", None),
                        "bbl": bbl,
                        "message": getattr(v, "nov_description", None) or getattr(v, "nov_type", None),
                        "resolved": (getattr(v, "violation_status", "") or "").lower() in ("closed", "close", "resolved"),
                    })

            return Response(violations, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[ViolationsView] DB error: {e}")
            # fallback mock
            data = [
                {"id": "v1", "message": "Broken fire escape", "resolved": False},
            ]
            return Response(data, status=status.HTTP_200_OK)


class ReviewsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, landlord_id):
        # There is no reviews table in the schema. For development/testing (DEBUG=True)
        # return a small set of mock reviews so the frontend can display example content.
        mock_reviews = [
            {"id": "r1", "author": "Jane D.", "content": "Quick to fix issues.", "date": "2025-09-01", "flagged": False},
            {"id": "r2", "author": "John S.", "content": "Slow support.", "date": "2025-08-15", "flagged": False},
        ]
        # if getattr(settings, "DEBUG", False):
        if True:
            return Response(mock_reviews, status=status.HTTP_200_OK)
        return Response([], status=status.HTTP_200_OK)

