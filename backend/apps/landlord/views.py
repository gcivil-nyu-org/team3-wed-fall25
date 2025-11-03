from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes

from infrastructures.postgres.postgres_client import PostgresClient
from infrastructures.postgres.building_repository import BuildingRepository

# from django.conf import settings


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
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return list of properties (by BBL) owned by landlord."""
        try:
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception as e:
            user_id = None

        print(f"Fetching properties for user_id: {user_id}")
        try:
            with PostgresClient() as db:
                rows = db.query_all(
                    """
                    SELECT bbl
                    FROM landlord_owners
                    WHERE owner_user_id = %s AND deleted_at IS NULL
                    """,
                    (user_id,),
                )

            bbls = [r["bbl"] for r in rows]
            print("Found BBLs for landlord:", bbls)
            if not bbls:
                return Response([], status=status.HTTP_200_OK)

            repo = BuildingRepository()
            buildings = repo.get_many_by_bbl(bbls)

            properties = []
            for bbl, bld in buildings.items():
                # Debug: print the building object structure
                # print(f"Building {bbl} type: {type(bld)}")
                # if bld:
                #     print(f"Building {bbl} attributes: {dir(bld)}")

                address = self._get_address_from_building(bld, bbl)
                print(f"Property {bbl} address: {address}")
                violations_count = len(getattr(bld, "complaints", []) or []) + len(
                    getattr(bld, "violations", []) or []
                )
                evictions_count = len(getattr(bld, "evictions", []) or [])

                properties.append(
                    {
                        "id": bbl,
                        "bbl": bbl,
                        "address": address,
                        "occupancy_status": None,
                        "financial_performance": None,
                        "tenant_turnover": None,
                        "violations_count": violations_count,
                        "evictions_count": evictions_count,
                    }
                )
            # print("Returning properties:", properties)
            return Response(properties, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[PropertiesView] DB error: {e}")
            return Response(_mock_properties(), status=status.HTTP_200_OK)

    def _get_address_from_building(self, bld, bbl):
        """Extract address from Building object"""
        if not bld or not bld.registration:
            return f"Property {bbl}"

        reg = bld.registration
        print("Registration object attributes:", dir(reg))

        # Access the Registration attributes directly
        house_number = reg.house_number if reg.house_number else None
        street_name = reg.street_name if reg.street_name else None
        borough = reg.boro if reg.boro else None
        zip_code = reg.zip if reg.zip else None

        # Build address
        address_parts = []

        # Street address
        street_parts = []
        if house_number:
            street_parts.append(str(house_number))
        if street_name:
            street_parts.append(str(street_name))

        if street_parts:
            address_parts.append(" ".join(street_parts))

        # Borough and ZIP
        if borough:
            address_parts.append(str(borough))
        if zip_code:
            address_parts.append(str(zip_code))

        return ", ".join(address_parts) if address_parts else f"Property {bbl}"


class ViolationsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return aggregated violations/complaints for all BBLs owned by landlord."""
        try:
            # Use the authenticated user's ID
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception as e:
            user_id = None

        print(f"Fetching violations for user_id: {user_id}")
        try:
            with PostgresClient() as db:
                rows = db.query_all(
                    """
                    SELECT bbl
                    FROM landlord_owners
                    WHERE owner_user_id = %s AND deleted_at IS NULL
                    """,
                    (user_id,),
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
                    violations.append(
                        {
                            "id": getattr(c, "complaint_id", None),
                            "bbl": bbl,
                            "message": getattr(c, "status_description", None)
                            or getattr(c, "minor_category", None)
                            or getattr(c, "major_category", None),
                            "resolved": (
                                getattr(c, "complaint_status", "") or ""
                            ).lower()
                            in ("closed", "close", "resolved"),
                        }
                    )
                # also include violations dataclass entries
                for v in getattr(bld, "violations", []) or []:
                    violations.append(
                        {
                            "id": getattr(v, "violation_id", None),
                            "bbl": bbl,
                            "message": getattr(v, "nov_description", None)
                            or getattr(v, "nov_type", None),
                            "resolved": (
                                getattr(v, "violation_status", "") or ""
                            ).lower()
                            in ("closed", "close", "resolved"),
                        }
                    )

            return Response(violations, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[ViolationsView] DB error: {e}")
            # fallback mock
            data = [
                {"id": "v1", "message": "Broken fire escape", "resolved": False},
            ]
            return Response(data, status=status.HTTP_200_OK)


class PropertiesView2(APIView):
    permission_classes = [AllowAny]

    def get(self, request, landlord_id):
        """Return list of properties (by BBL) owned by landlord (owner_user_id == landlord_id).

        Uses `landlord_owners` table to look up BBLs, then queries BuildingRepository
        for registration/address/complaints/evictions related to each BBL.
        """
        try:
            # Use the authenticated user's ID
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception as e:
            user_id = None
        try:
            if user_id != int(landlord_id):
                return Response(
                    {"error": "Unauthorized access to landlord properties."},
                    status=status.HTTP_403_FORBIDDEN,
                )

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

                violations_count = len(getattr(bld, "complaints", []) or []) + len(
                    getattr(bld, "violations", []) or []
                )
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
        except Exception:
            # Log server-side in real app; here we just fall back to mock
            print(f"[PropertiesView] DB error: {e}")
            return Response(_mock_properties(), status=status.HTTP_200_OK)


class ViolationsView2(APIView):
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
                    violations.append(
                        {
                            "id": getattr(c, "complaint_id", None),
                            "bbl": bbl,
                            "message": getattr(c, "status_description", None)
                            or getattr(c, "minor_category", None)
                            or getattr(c, "major_category", None),
                            "resolved": (
                                getattr(c, "complaint_status", "") or ""
                            ).lower()
                            in ("closed", "close", "resolved"),
                        }
                    )
                # also include violations dataclass entries
                for v in getattr(bld, "violations", []) or []:
                    violations.append(
                        {
                            "id": getattr(v, "violation_id", None),
                            "bbl": bbl,
                            "message": getattr(v, "nov_description", None)
                            or getattr(v, "nov_type", None),
                            "resolved": (
                                getattr(v, "violation_status", "") or ""
                            ).lower()
                            in ("closed", "close", "resolved"),
                        }
                    )

            return Response(violations, status=status.HTTP_200_OK)
        except Exception as _:
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
            {
                "id": "r1",
                "author": "Jane D.",
                "content": "Quick to fix issues.",
                "date": "2025-09-01",
                "flagged": False,
            },
            {
                "id": "r2",
                "author": "John S.",
                "content": "Slow support.",
                "date": "2025-08-15",
                "flagged": False,
            },
        ]
        # if getattr(settings, "DEBUG", False):
        if True:
            return Response(mock_reviews, status=status.HTTP_200_OK)
        return Response([], status=status.HTTP_200_OK)


class LandlordApplicationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Handle landlord application submission."""

        try:
            data = request.data
            bbl = data.get("bbl")
            country = data.get("country")
            agree_terms = data.get("agree_terms")
            # Optional: keep these if you want them in a different table
            data.get("full_name")
            data.get("email")
            data.get("phone")
            data.get("experience_years")

            if not all([bbl, country, agree_terms]):
                print("[LandlordApplyView] Missing required fields.")
                return Response(
                    {"error": "BBL, country, and terms agreement are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate BBL format
            if not bbl.isdigit() or len(bbl) != 10:
                print("[LandlordApplyView] Invalid BBL format.")
                return Response(
                    {"error": "Invalid BBL format. Must be 10 digits."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            user_id = request.user.id

            with PostgresClient() as db:
                # Check for existing application
                existing = db.query_one(
                    """
                    SELECT id FROM landlord_owners 
                    WHERE bbl = %s AND owner_user_id = %s AND deleted_at IS NULL
                    """,
                    (bbl, user_id),
                )

                if existing:
                    print(
                        "[LandlordApplyView] Application already exists for this user and BBL."
                    )
                    return Response(
                        {"error": "You already have an application for this BBL."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Insert into landlord_owners
                db.execute(
                    """
                    INSERT INTO landlord_owners (bbl, owner_user_id, created_at, updated_at)
                    VALUES (%s, %s, NOW(), NOW())
                    """,
                    (bbl, user_id),
                )

                # Optional: If you still want to store the additional info in landlord_applications
                # if all([full_name, email, phone, experience_years]):
                #     db.execute(
                #         """
                #         INSERT INTO landlord_applications (full_name, email, phone, 
                #           experience_years, country, agree_terms, user_id)
                #         VALUES (%s, %s, %s, %s, %s, %s, %s)
                #         """,
                #         (full_name, email, phone, experience_years, country, agree_terms, user_id),
                #     )

            return Response(
                {"message": "Application submitted successfully."},
                status=status.HTTP_201_CREATED,
            )

        except Exception as _:
            print(f"[LandlordApplyView] DB error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def landlord_apply_get(request):
    """Handle landlord application submission."""
    print("landlord_apply_get called")
    try:
        data = request.data
        bbl = data.get("bbl")
        country = data.get("country")
        agree_terms = data.get("agreeTerms")
        # Optional: keep these if you want them in a different table
        data.get("name")
        data.get("email")
        data.get("phone")
        data.get("experience_years")

        print("landlord application data:", data)

        if not all([bbl, country, agree_terms]):
            print("[LandlordApplyView] Missing required fields.")
            return Response(
                {"error": "BBL, country, and terms agreement are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate BBL format
        if not bbl.isdigit() or len(bbl) != 10:
            print("[LandlordApplyView] Invalid BBL format.")
            return Response(
                {"error": "Invalid BBL format. Must be 10 digits."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user_id = request.user.id
        print(f"landlord application by user_id: {user_id}")
        with PostgresClient() as db:
            # Check for existing application
            existing = db.query_one(
                """
                SELECT id FROM landlord_owners 
                WHERE bbl = %s AND owner_user_id = %s AND deleted_at IS NULL
                """,
                (bbl, user_id),
            )

            if existing:
                print(
                    "[LandlordApplyView] Application already exists for this user and BBL."
                )
                return Response(
                    {"error": "You already have an application for this BBL."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Insert into landlord_owners
            db.execute(
                """
                INSERT INTO landlord_owners (bbl, owner_user_id, created_at, updated_at)
                VALUES (%s, %s, NOW(), NOW())
                """,
                (bbl, user_id),
            )

            # Optional: If you still want to store the additional info in landlord_applications
            # if all([full_name, email, phone, experience_years]):
            #     db.execute(
            #         """
            #         INSERT INTO landlord_applications (full_name, email, phone, experience_years, country, agree_terms, user_id)
            #         VALUES (%s, %s, %s, %s, %s, %s, %s)
            #         """,
            #         (full_name, email, phone, experience_years, country, agree_terms, user_id),
            #     )

        return Response(
            {"message": "Application submitted successfully."},
            status=status.HTTP_201_CREATED,
        )

    except Exception as e:
        print(f"[LandlordApplyView] DB error: {e}")
        return Response(
            {"error": "Internal server error."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
