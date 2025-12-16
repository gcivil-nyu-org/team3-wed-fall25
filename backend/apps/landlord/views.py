from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes

from infrastructures.postgres.postgres_client import PostgresClient
from infrastructures.postgres.building_repository import BuildingRepository
from infrastructures.postgres.landlord_repository import LandlordRepository

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
        except Exception:
            user_id = None

        # print(f"Fetching properties for user_id: {user_id}")
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
            # print("Found BBLs for landlord:", bbls)
            if not bbls:
                return Response([], status=status.HTTP_200_OK)

            repo = BuildingRepository()
            buildings = repo.get_many_by_bbl(bbls)

            properties = []
            # Fetch landlord-entered metadata for these BBLs, if present
            try:
                with PostgresClient() as meta_db:
                    meta_rows = meta_db.query_all(
                        """
                        SELECT bbl, average_rent, occupancy_rate, turnover_rate, flagged, notes, source
                            FROM landlord_property_meta
                        WHERE bbl = ANY(%s)
                        """,
                        (bbls,),
                    )
            except Exception:
                meta_rows = []

            meta_by_bbl = {r["bbl"]: r for r in (meta_rows or [])}
            for bbl, bld in buildings.items():
                # Debug: print the building object structure
                # if bld:
                #     print(f"Building {bbl} attributes: {dir(bld)}")

                address = self._get_address_from_building(bld, bbl)

                violations = getattr(bld, "violations", []) or []
                evictions = getattr(bld, "evictions", []) or []

                # Count them separately
                violations_count = len(violations)
                evictions_count = len(evictions)

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
                        # optional landlord-entered metadata
                        "average_rent": (
                            meta_by_bbl.get(bbl, {}).get("average_rent")
                            if meta_by_bbl.get(bbl)
                            else None
                        ),
                        "occupancy_rate": (
                            meta_by_bbl.get(bbl, {}).get("occupancy_rate")
                            if meta_by_bbl.get(bbl)
                            else None
                        ),
                        "turnover_rate": (
                            meta_by_bbl.get(bbl, {}).get("turnover_rate")
                            if meta_by_bbl.get(bbl)
                            else None
                        ),
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
        except Exception:
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
                # for c in getattr(bld, "complaints", []) or []:
                #     violations.append(
                #         {
                #             "id": getattr(c, "complaint_id", None),
                #             "bbl": bbl,
                #             "message": getattr(c, "status_description", None)
                #             or getattr(c, "minor_category", None)
                #             or getattr(c, "major_category", None),
                #             "resolved": (
                #                 getattr(c, "complaint_status", "") or ""
                #             ).lower()
                #             in ("closed", "close", "resolved"),
                #         }
                #     )
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


# class PropertiesView2(APIView):
#     permission_classes = [AllowAny]

#     def get(self, request, landlord_id):
#         """Return list of properties (by BBL) owned by landlord (owner_user_id == landlord_id).

#         Uses `landlord_owners` table to look up BBLs, then queries BuildingRepository
#         for registration/address/complaints/evictions related to each BBL.
#         """
#         try:
#             # Use the authenticated user's ID
#             user_id = (
#                 request.user.id
#                 if request.user and request.user.is_authenticated
#                 else None
#             )
#         except Exception:
#             user_id = None
#         try:
#             if user_id != int(landlord_id):
#                 return Response(
#                     {"error": "Unauthorized access to landlord properties."},
#                     status=status.HTTP_403_FORBIDDEN,
#                 )

#             # find BBLs for this landlord
#             with PostgresClient() as db:
#                 rows = db.query_all(
#                     """
#                     SELECT bbl
#                     FROM landlord_owners
#                     WHERE owner_user_id = %s AND deleted_at IS NULL
#                     """,
#                     (landlord_id,),
#                 )

#             bbls = [r["bbl"] for r in rows]
#             if not bbls:
#                 return Response([], status=status.HTTP_200_OK)

#             repo = BuildingRepository()
#             buildings = repo.get_many_by_bbl(bbls)

#             properties = []
#             for bbl, bld in buildings.items():
#                 reg = getattr(bld, "registration", None) if bld else None
#                 address = None
#                 if reg:
#                     # Registration is a dataclass with attributes
#                     hn = getattr(reg, "house_number", None)
#                     sn = getattr(reg, "street_name", None)
#                     boro = getattr(reg, "boro", None) or getattr(reg, "boro", None)
#                     address = ", ".join([s for s in [hn, sn, boro] if s])

#                 violations_count = len(getattr(bld, "complaints", []) or []) + len(
#                     getattr(bld, "violations", []) or []
#                 )
#                 evictions_count = len(getattr(bld, "evictions", []) or [])

#                 properties.append(
#                     {
#                         "id": bbl,
#                         "bbl": bbl,
#                         "address": address or bbl,
#                         "occupancy_status": None,
#                         "financial_performance": None,
#                         "tenant_turnover": None,
#                         "violations_count": violations_count,
#                         "evictions_count": evictions_count,
#                         # include landlord-entered metadata if available
#                         "average_rent": None,
#                         "occupancy_rate": None,
#                     }
#                 )
#             return Response(properties, status=status.HTTP_200_OK)
#         except Exception as e:
#             # Log server-side in real app; here we just fall back to mock
#             print(f"[PropertiesView] DB error: {e}")
#             return Response(_mock_properties(), status=status.HTTP_200_OK)


# class ViolationsView2(APIView):
#     permission_classes = [AllowAny]

#     def get(self, request, landlord_id):
#         """Return aggregated violations/complaints for all BBLs owned by landlord."""
#         try:
#             with PostgresClient() as db:
#                 rows = db.query_all(
#                     """
#                     SELECT bbl
#                     FROM landlord_owners
#                     WHERE owner_user_id = %s AND deleted_at IS NULL
#                     """,
#                     (landlord_id,),
#                 )

#             bbls = [r["bbl"] for r in rows]
#             if not bbls:
#                 return Response([], status=status.HTTP_200_OK)

#             # reuse BuildingRepository to get complaints/violations
#             repo = BuildingRepository()
#             violations = []
#             for bbl in bbls:
#                 bld = repo.get_by_bbl(bbl)
#                 if not bld:
#                     continue
#                 # complaints is a list of Complaint dataclasses
#                 for c in getattr(bld, "complaints", []) or []:
#                     violations.append(
#                         {
#                             "id": getattr(c, "complaint_id", None),
#                             "bbl": bbl,
#                             "message": getattr(c, "status_description", None)
#                             or getattr(c, "minor_category", None)
#                             or getattr(c, "major_category", None),
#                             "resolved": (
#                                 getattr(c, "complaint_status", "") or ""
#                             ).lower()
#                             in ("closed", "close", "resolved"),
#                         }
#                     )
#                 # also include violations dataclass entries
#                 for v in getattr(bld, "violations", []) or []:
#                     violations.append(
#                         {
#                             "id": getattr(v, "violation_id", None),
#                             "bbl": bbl,
#                             "message": getattr(v, "nov_description", None)
#                             or getattr(v, "nov_type", None),
#                             "resolved": (
#                                 getattr(v, "violation_status", "") or ""
#                             ).lower()
#                             in ("closed", "close", "resolved"),
#                         }
#                     )

#             return Response(violations, status=status.HTTP_200_OK)
#         except Exception as e:
#             print(f"[ViolationsView] DB error: {e}")
#             # fallback mock
#             data = [
#                 {"id": "v1", "message": "Broken fire escape", "resolved": False},
#             ]
#             return Response(data, status=status.HTTP_200_OK)


class ReviewsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user_id = request.user.id
        except Exception:
            user_id = None

        if not user_id:
            return Response([], status=status.HTTP_200_OK)

        try:
            with PostgresClient() as db:
                property_rows = db.query_all(
                    """
                    SELECT bbl
                    FROM landlord_owners
                    WHERE owner_user_id = %s AND deleted_at IS NULL
                    """,
                    (user_id,),
                )

            bbls = [r["bbl"] for r in property_rows]

            if not bbls:
                return Response([], status=status.HTTP_200_OK)

            # Safe approach: no JOIN, just use user_id
            with PostgresClient() as db:
                review_rows = db.query_all(
                    """
                    SELECT 
                        id,
                        user_id,
                        bbl,
                        rating,
                        title,
                        body,
                        created_at,
                        flagged
                    FROM community_reviews
                    WHERE bbl = ANY(%s) 
                    AND deleted_at IS NULL
                    ORDER BY created_at DESC
                    """,
                    (bbls,),
                )

            reviews = []
            for row in review_rows:
                # Fetch comments for each review
                with PostgresClient() as db:
                    comment_rows = db.query_all(
                        """
                        SELECT 
                            id,
                            user_id,
                            body,
                            created_at
                        FROM community_review_comments
                        WHERE review_id = %s 
                        AND deleted_at IS NULL
                        ORDER BY created_at ASC
                        """,
                        (row["id"],),
                    )

                # Format comments
                comments = []
                for comment in comment_rows:
                    comments.append(
                        {
                            "id": str(comment["id"]),
                            "user_id": comment["user_id"],
                            "body": comment["body"],
                            "created_at": (
                                comment["created_at"].strftime("%Y-%m-%d")
                                if comment["created_at"]
                                else ""
                            ),
                        }
                    )

                # Reviews
                # Use a generic name based on user_id
                author_name = f"Tenant {row['user_id']}"  # or "Anonymous", "User", etc.

                reviews.append(
                    {
                        "id": str(row["id"]),
                        "author": author_name,
                        "content": row.get("body") or row.get("title", ""),
                        "title": row.get("title", ""),
                        "rating": (
                            float(row["rating"]) if row["rating"] is not None else None
                        ),
                        "date": (
                            row["created_at"].strftime("%Y-%m-%d")
                            if row["created_at"]
                            else ""
                        ),
                        "bbl": row["bbl"],
                        "flagged": bool(row.get("flagged")),
                        "comments": comments,
                    }
                )
            # print("Returning reviews:", reviews)

            return Response(reviews, status=status.HTTP_200_OK)

        except Exception as e:
            print(f"[ReviewsView] DB error: {e}")
            return Response(self._get_mock_reviews(), status=status.HTTP_200_OK)

    def _get_mock_reviews(self):
        return [
            {
                "id": "r1",
                "author": "Jane D.",
                "content": "Quick to fix issues.",
                "date": "2025-09-01",
                "flagged": False,
                "comments": [
                    {
                        "id": "c1",
                        "user_id": 1,
                        "body": "Thank you for your feedback!",
                        "created_at": "2025-09-02",
                    }
                ],
            },
            {
                "id": "r2",
                "author": "John S.",
                "content": "Slow support.",
                "date": "2025-08-15",
                "flagged": False,
                "comments": [],
            },
        ]


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
                    {
                        "result": False,
                        "error": "BBL, country, and terms agreement are required.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Validate BBL format
            if not bbl.isdigit() or len(bbl) != 10:
                print("[LandlordApplyView] Invalid BBL format.")
                return Response(
                    {
                        "result": False,
                        "error": "Invalid BBL format. Must be 10 digits.",
                    },
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
                        {
                            "result": False,
                            "error": "You already have an application for this BBL.",
                        },
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
                #         (
                #             full_name,
                #             email,
                #             phone,
                #             experience_years,
                #             country,
                #             agree_terms,
                #             user_id,
                #         ),
                #     )

            return Response(
                {"message": "Application submitted successfully."},
                status=status.HTTP_201_CREATED,
            )

        except Exception as e:
            print(f"[LandlordApplyView] DB error: {e}")
            return Response(
                {"result": False, "error": "Internal server error."},
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
        # Accept either camelCase (from frontend) or snake_case (tests)
        agree_terms = data.get("agreeTerms") or data.get("agree_terms")
        # Optional fields from form
        landlord_type = data.get("landlordType") or data.get("landlord_type")
        organization_name = data.get("organizationName") or data.get(
            "organization_name"
        )
        hpd_registration = data.get("hpdRegistration") or data.get("hpd_registration")
        business_phone = data.get("businessPhone") or data.get("business_phone")

        print("landlord application data:", data)

        if not all([bbl, country, agree_terms]):
            print("[LandlordApplyView] Missing required fields.")
            return Response(
                {
                    "result": False,
                    "error": "BBL, country, and terms agreement are required.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Validate BBL format
        if not bbl.isdigit() or len(bbl) != 10:
            print("[LandlordApplyView] Invalid BBL format.")
            return Response(
                {"result": False, "error": "Invalid BBL format. Must be 10 digits."},
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
                    {
                        "result": False,
                        "error": "You already have an application for this BBL.",
                    },
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

            # Optionally update user profile with landlord information if provided
            # Only update fields that are not already set
            from django.contrib.auth import get_user_model

            User = get_user_model()
            try:
                user = User.objects.get(id=user_id)
                update_fields = []

                if landlord_type and not user.landlord_type:
                    user.landlord_type = landlord_type
                    update_fields.append("landlord_type")

                if organization_name and not user.organization_name:
                    user.organization_name = organization_name
                    update_fields.append("organization_name")

                if hpd_registration and not user.hpd_registration_number:
                    user.hpd_registration_number = hpd_registration
                    update_fields.append("hpd_registration_number")

                if business_phone and not user.business_phone:
                    user.business_phone = business_phone
                    update_fields.append("business_phone")

                if update_fields:
                    user.save(update_fields=update_fields)
                    print(
                        f"[LandlordApplyView] Updated user profile fields: {update_fields}"
                    )
            except User.DoesNotExist:
                print(
                    f"[LandlordApplyView] User {user_id} not found for profile update"
                )
            except Exception as e:
                print(f"[LandlordApplyView] Error updating user profile: {e}")
                # Don't fail the application if profile update fails

            # Optional: If you still want to store the additional info in landlord_applications
            # if all([full_name, email, phone, experience_years]):
            #     db.execute(
            #         """
            #         INSERT INTO landlord_applications (
            #             full_name, email, phone, experience_years, country, agree_terms, user_id
            #         )
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
            {"result": False, "error": "Internal server error."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )


class ViolationsByBBLView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, bbl):
        """Return violations/complaints for a specific BBL owned by landlord."""
        try:
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception:
            user_id = None

        print(f"Fetching violations for BBL: {bbl}, user_id: {user_id}")

        try:
            # Verify that the user owns this BBL
            with PostgresClient() as db:
                ownership = db.query_one(
                    """
                    SELECT bbl
                    FROM landlord_owners
                    WHERE owner_user_id = %s AND bbl = %s AND deleted_at IS NULL
                    """,
                    (user_id, bbl),
                )

            if not ownership:
                return Response(
                    {"error": "You don't have access to this property."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Get violations for this specific BBL
            repo = BuildingRepository()
            bld = repo.get_by_bbl(bbl)

            violations = []
            if bld:

                # Process violations
                for v in getattr(bld, "violations", []) or []:
                    violations.append(
                        {
                            "id": f"v_{getattr(v, 'violation_id', 'unknown')}",
                            "bbl": bbl,
                            "message": getattr(v, "nov_description", None)
                            or getattr(v, "nov_type", None),
                            "resolved": (
                                getattr(v, "violation_status", "") or ""
                            ).lower()
                            in ("closed", "close", "resolved"),
                            "type": "violation",
                            "violation_id": getattr(v, "violation_id", None),
                            "nov_description": getattr(v, "nov_description", None),
                            "nov_type": getattr(v, "nov_type", None),
                            "class": getattr(v, "class", None),
                            "rent_impairing": getattr(v, "rent_impairing", False),
                            "violation_status": getattr(v, "violation_status", None),
                            "inspection_date": getattr(v, "inspection_date", None),
                            "nov_issued_date": getattr(v, "nov_issued_date", None),
                            "apartment": getattr(v, "apartment", None),
                        }
                    )

            return Response(violations, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[ViolationsByBBLView] DB error: {e}")
            # Fallback mock data for this specific BBL
            mock_data = [
                {
                    "id": "v1",
                    "bbl": bbl,
                    "message": "Broken fire escape on 3rd floor",
                    "resolved": False,
                    "type": "violation",
                    "nov_description": "Broken fire escape on 3rd floor",
                    "class": "C",
                    "rent_impairing": True,
                },
                {
                    "id": "c1",
                    "bbl": bbl,
                    "message": "No heat in apartment",
                    "resolved": False,
                    "type": "complaint",
                    "major_category": "HVAC",
                    "minor_category": "Heat",
                },
            ]
            return Response(mock_data, status=status.HTTP_200_OK)


# NEW: Get complaints for a specific BBL
class ComplaintsByBBLView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, bbl):
        """Return complaints for a specific BBL owned by landlord."""
        try:
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception:
            user_id = None

        print(f"Fetching complaints for BBL: {bbl}, user_id: {user_id}")

        try:
            # Verify that the user owns this BBL
            with PostgresClient() as db:
                ownership = db.query_one(
                    """
                    SELECT bbl
                    FROM landlord_owners
                    WHERE owner_user_id = %s AND bbl = %s AND deleted_at IS NULL
                    """,
                    (user_id, bbl),
                )

            if not ownership:
                return Response(
                    {"error": "You don't have access to this property."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Get complaints for this specific BBL
            repo = BuildingRepository()
            bld = repo.get_by_bbl(bbl)

            complaints = []
            if bld:
                for c in getattr(bld, "complaints", []) or []:
                    complaints.append(
                        {
                            "id": getattr(c, "complaint_id", None),
                            "bbl": bbl,
                            "type": getattr(c, "type", None),
                            "major_category": getattr(c, "major_category", None),
                            "minor_category": getattr(c, "minor_category", None),
                            "complaint_status": getattr(c, "complaint_status", None),
                            "status_description": getattr(
                                c, "status_description", None
                            ),
                            "house_number": getattr(c, "house_number", None),
                            "street_name": getattr(c, "street_name", None),
                            "apartment": getattr(c, "apartment", None),
                            "complaint_status_date": getattr(
                                c, "complaint_status_date", None
                            ),
                        }
                    )

            return Response(complaints, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[ComplaintsByBBLView] DB error: {e}")
            # Fallback mock data
            mock_data = [
                {
                    "id": 1,
                    "bbl": bbl,
                    "type": "HEAT/HOT WATER",
                    "major_category": "HVAC",
                    "minor_category": "Heat",
                    "complaint_status": "Open",
                    "status_description": "No heat in apartment",
                    "house_number": "123",
                    "street_name": "Main St",
                    "apartment": "4B",
                    "complaint_status_date": "2024-01-18",
                },
                {
                    "id": 2,
                    "bbl": bbl,
                    "type": "PLUMBING",
                    "major_category": "Plumbing",
                    "minor_category": "Leak",
                    "complaint_status": "In Progress",
                    "status_description": "Leaking faucet in bathroom",
                    "house_number": "123",
                    "street_name": "Main St",
                    "apartment": "2A",
                    "complaint_status_date": "2024-01-16",
                },
            ]
            return Response(mock_data, status=status.HTTP_200_OK)


# NEW: Get building stats for a specific BBL
class BuildingStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, bbl):
        """Return statistics for a specific building."""
        try:
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception:
            user_id = None

        print(f"Fetching stats for BBL: {bbl}, user_id: {user_id}")

        try:
            # Verify that the user owns this BBL
            with PostgresClient() as db:
                ownership = db.query_one(
                    """
                    SELECT bbl
                    FROM landlord_owners
                    WHERE owner_user_id = %s AND bbl = %s AND deleted_at IS NULL
                    """,
                    (user_id, bbl),
                )

            if not ownership:
                return Response(
                    {"error": "You don't have access to this property."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Get building data and calculate stats
            repo = BuildingRepository()
            bld = repo.get_by_bbl(bbl)

            if not bld:
                return Response(
                    {
                        "address": "Unknown",
                        "total_violations": 0,
                        "open_violations": 0,
                        "total_complaints": 0,
                        "open_complaints": 0,
                        "eviction_filings": 0,
                    },
                    status=status.HTTP_200_OK,
                )

            # Calculate statistics
            violations = getattr(bld, "violations", []) or []
            complaints = getattr(bld, "complaints", []) or []
            evictions = getattr(bld, "evictions", []) or []

            total_violations = len(violations)
            open_violations = len(
                [
                    v
                    for v in violations
                    if getattr(v, "violation_status", "").lower()
                    not in ("closed", "resolved")
                ]
            )
            total_complaints = len(complaints)
            open_complaints = len(
                [
                    c
                    for c in complaints
                    if getattr(c, "complaint_status", "").lower()
                    not in ("closed", "resolved")
                ]
            )
            eviction_filings = len(evictions)
            address = self._get_address_from_building(bld, bbl)
            stats = {
                "address": address or f"Property {bbl}",
                "total_violations": total_violations,
                "open_violations": open_violations,
                "total_complaints": total_complaints,
                "open_complaints": open_complaints,
                "eviction_filings": eviction_filings,
            }
            print(f"Building stats for BBL {bbl}: {stats}")
            return Response(stats, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[BuildingStatsView] DB error: {e}")
            # Fallback mock stats. Avoid referencing `address` which may not
            # be defined if the exception occurred before it was computed.
            fallback_address = f"Property {bbl}"
            mock_stats = {
                "address": fallback_address,
                "total_violations": 2,
                "open_violations": 2,
                "total_complaints": 5,
                "open_complaints": 2,
                "eviction_filings": 1,
            }
            print("Returning mock stats:", mock_stats)
            return Response(mock_stats, status=status.HTTP_200_OK)

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


# NEW: Update building metadata (average rent, occupancy)
class BuildingUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, bbl):
        """Persist simple building metadata for a landlord-owned property.

        This endpoint performs a best-effort upsert into a lightweight
        `landlord_property_meta` table. If the table doesn't exist yet it will
        be created. This keeps the change local and avoids modifying existing
        crawled tables.
        """
        try:
            try:
                user_id = (
                    request.user.id
                    if request.user and request.user.is_authenticated
                    else None
                )
            except Exception:
                user_id = None

            if not user_id:
                return Response(
                    {"error": "Authentication required."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Verify ownership and validate inputs
            if not (isinstance(bbl, str) and bbl.isdigit() and len(bbl) == 10):
                return Response(
                    {"error": "Invalid BBL format. Must be 10 digits."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            avg = request.data.get("average_rent")
            occ = request.data.get("occupancy_rate")
            turnover = request.data.get("turnover_rate")
            # Optional landlord-provided metadata
            flagged_raw = request.data.get("flagged")
            notes = request.data.get("notes")
            source = request.data.get("source")

            # Basic validation for numeric fields (allow None to clear)
            try:
                avg_val = None if avg in (None, "") else float(avg)
            except Exception:
                return Response(
                    {"error": "Invalid average_rent. Must be numeric."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                occ_val = None if occ in (None, "") else float(occ)
            except Exception:
                return Response(
                    {"error": "Invalid occupancy_rate. Must be numeric."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                turnover_val = None if turnover in (None, "") else float(turnover)
            except Exception:
                return Response(
                    {"error": "Invalid turnover_rate. Must be numeric."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            with PostgresClient() as db:
                ownership = db.query_one(
                    """
                    SELECT bbl FROM landlord_owners
                    WHERE owner_user_id = %s AND bbl = %s AND deleted_at IS NULL
                    """,
                    (user_id, bbl),
                )

                if not ownership:
                    return Response(
                        {"error": "You don't have access to this property."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                # Upsert the values into the existing landlord_property_meta table.
                try:
                    # Normalize flagged input to boolean or NULL
                    if flagged_raw is None:
                        flagged_val = None
                    elif isinstance(flagged_raw, bool):
                        flagged_val = flagged_raw
                    elif isinstance(flagged_raw, (int, float)):
                        flagged_val = bool(flagged_raw)
                    else:
                        fr = str(flagged_raw).lower()
                        if fr in ("true", "1", "yes", "y"):
                            flagged_val = True
                        elif fr in ("false", "0", "no", "n"):
                            flagged_val = False
                        else:
                            flagged_val = None

                    db.execute(
                        """
                            INSERT INTO landlord_property_meta (bbl, average_rent, occupancy_rate, 
                            turnover_rate, flagged, notes, source, created_at, updated_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                            ON CONFLICT (bbl) DO UPDATE SET
                                average_rent = EXCLUDED.average_rent,
                                occupancy_rate = EXCLUDED.occupancy_rate,
                                turnover_rate = EXCLUDED.turnover_rate,
                                flagged = EXCLUDED.flagged,
                                notes = EXCLUDED.notes,
                                source = EXCLUDED.source,
                                updated_at = NOW()
                            """,
                        (
                            bbl,
                            avg_val,
                            occ_val,
                            turnover_val,
                            flagged_val,
                            notes,
                            source,
                        ),
                    )

                    # Return the current metadata row
                    row = db.query_one(
                        """
                        SELECT bbl, average_rent, occupancy_rate, turnover_rate, flagged, notes, source, created_at, updated_at
                        FROM landlord_property_meta WHERE bbl = %s
                        """,
                        (bbl,),
                    )
                except Exception as inner_e:
                    # If the table doesn't exist or another DB error occurred, do not
                    # attempt to create it at runtime. Return a clear error so the
                    # maintainers can create the table via migration or SQL.
                    err_msg = str(inner_e)
                    print(f"[BuildingUpdateView] DB error during upsert: {err_msg}")
                    if 'relation "landlord_property_meta" does not exist' in err_msg:
                        return Response(
                            {
                                "error": (
                                    "landlord_property_meta table not found. "
                                    "Please create the table before using this endpoint."
                                )
                            },
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        )
                    return Response(
                        {"error": "Database error performing update."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    )

            return Response({"data": row}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[BuildingUpdateView] DB error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

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


# NEW: Return PLUTO row data for a building
class BuildingPlutoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, bbl):
        try:
            try:
                user_id = (
                    request.user.id
                    if request.user and request.user.is_authenticated
                    else None
                )
            except Exception:
                user_id = None

            if not user_id:
                return Response(
                    {"error": "Authentication required."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            # Verify ownership
            with PostgresClient() as db:
                ownership = db.query_one(
                    """
                    SELECT bbl FROM landlord_owners
                    WHERE owner_user_id = %s AND bbl = %s AND deleted_at IS NULL
                    """,
                    (user_id, bbl),
                )

            if not ownership:
                return Response(
                    {"error": "You don't have access to this property."},
                    status=status.HTTP_403_FORBIDDEN,
                )

            repo = BuildingRepository()
            pluto = repo.get_pluto_by_bbl(bbl)

            if not pluto:
                return Response(None, status=status.HTTP_200_OK)

            return Response(pluto, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[BuildingPlutoView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# NEW: Get overall landlord stats
class LandlordStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return overall statistics for the landlord across all properties."""
        try:
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception:
            user_id = None

        print(f"Fetching landlord stats for user_id: {user_id}")

        try:
            # Get all BBLs for this landlord
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
                return Response(
                    {
                        "total_violations": 0,
                        "open_violations": 0,
                        "total_complaints": 0,
                        "open_complaints": 0,
                        "total_properties": 0,
                        "occupied_properties": 0,
                    },
                    status=status.HTTP_200_OK,
                )

            # Calculate aggregate stats across all properties
            repo = BuildingRepository()
            total_violations = 0
            open_violations = 0
            total_complaints = 0
            open_complaints = 0

            for bbl in bbls:
                bld = repo.get_by_bbl(bbl)
                if bld:
                    violations = getattr(bld, "violations", []) or []
                    complaints = getattr(bld, "complaints", []) or []

                    total_violations += len(violations)
                    open_violations += len(
                        [
                            v
                            for v in violations
                            if getattr(v, "violation_status", "").lower()
                            not in ("closed", "resolved")
                        ]
                    )
                    total_complaints += len(complaints)
                    open_complaints += len(
                        [
                            c
                            for c in complaints
                            if getattr(c, "complaint_status", "").lower()
                            not in ("closed", "resolved")
                        ]
                    )

            stats = {
                "total_violations": total_violations,
                "open_violations": open_violations,
                "total_complaints": total_complaints,
                "open_complaints": open_complaints,
                "total_properties": len(bbls),
                "occupied_properties": len(
                    bbls
                ),  # Simplified - you might want to calculate actual occupancy
            }

            return Response(stats, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[LandlordStatsView] DB error: {e}")
            # Fallback mock stats
            mock_stats = {
                "total_violations": 3,
                "open_violations": 2,
                "total_complaints": 6,
                "open_complaints": 2,
                "total_properties": 2,
                "occupied_properties": 1,
            }
            return Response(mock_stats, status=status.HTTP_200_OK)


# NEW: Toggle a violation's resolved state
class ViolationUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, violation_id):
        try:
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception:
            user_id = None

        if not user_id:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Require explicit boolean for 'resolved' to avoid coercion of
        # truthy/falsy strings (e.g. "yes", "no"). Return 400 if the
        # payload does not contain a boolean.
        raw_resolved = request.data.get("resolved", None)
        if not isinstance(raw_resolved, bool):
            return Response(
                {"error": "'resolved' must be a boolean."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resolved = raw_resolved

        try:
            with PostgresClient() as db:
                # Verify ownership: the violation's bbl must belong to this landlord
                row = db.query_one(
                    "SELECT bbl FROM building_violations WHERE violation_id = %s",
                    (violation_id,),
                )
                if not row:
                    return Response(
                        {"error": "Violation not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                ownership = db.query_one(
                    "SELECT bbl FROM landlord_owners WHERE owner_user_id = %s AND bbl = %s AND deleted_at IS NULL",
                    (user_id, row["bbl"]),
                )
                if not ownership:
                    return Response(
                        {"error": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN
                    )

                new_status = "Closed" if resolved else "Open"
                db.execute(
                    "UPDATE building_violations SET violation_status = %s WHERE violation_id = %s",
                    (new_status, violation_id),
                )

            return Response(
                {"violation_id": violation_id, "violation_status": new_status},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print(f"[ViolationUpdateView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# NEW: Toggle a complaint's resolved state
class ComplaintUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, complaint_id):
        try:
            user_id = (
                request.user.id
                if request.user and request.user.is_authenticated
                else None
            )
        except Exception:
            user_id = None

        if not user_id:
            return Response(
                {"error": "Authentication required."},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        # Require explicit boolean for 'resolved' to avoid coercion of
        # truthy/falsy strings. Return 400 if payload is not a boolean.
        raw_resolved = request.data.get("resolved", None)
        if not isinstance(raw_resolved, bool):
            return Response(
                {"error": "'resolved' must be a boolean."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        resolved = raw_resolved

        try:
            with PostgresClient() as db:
                row = db.query_one(
                    "SELECT bbl FROM building_complaints WHERE complaint_id = %s",
                    (complaint_id,),
                )
                if not row:
                    return Response(
                        {"error": "Complaint not found."},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                ownership = db.query_one(
                    "SELECT bbl FROM landlord_owners WHERE owner_user_id = %s AND bbl = %s AND deleted_at IS NULL",
                    (user_id, row["bbl"]),
                )
                if not ownership:
                    return Response(
                        {"error": "Unauthorized."}, status=status.HTTP_403_FORBIDDEN
                    )

                new_status = "Closed" if resolved else "Open"
                if resolved:
                    db.execute(
                        "UPDATE building_complaints SET complaint_status = %s, "
                        "complaint_status_date = CURRENT_DATE WHERE complaint_id = %s",
                        (new_status, complaint_id),
                    )
                else:
                    db.execute(
                        "UPDATE building_complaints SET complaint_status = %s, "
                        "complaint_status_date = NULL WHERE complaint_id = %s",
                        (new_status, complaint_id),
                    )

            return Response(
                {"complaint_id": complaint_id, "complaint_status": new_status},
                status=status.HTTP_200_OK,
            )
        except Exception as e:
            print(f"[ComplaintUpdateView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# NEW: Submit review response
class ReviewResponseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Submit a response to a tenant review."""
        try:
            data = request.data
            review_id = data.get("review_id")
            response = data.get("response")

            if not review_id or not response:
                return Response(
                    {"error": "Review ID and response are required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Get the authenticated user's ID
            user_id = request.user.id

            # Save the response to the database
            with PostgresClient() as db:
                # First, verify the review exists and belongs to a property the user owns
                review_exists = db.query_one(
                    """
                    SELECT cr.id 
                    FROM community_reviews cr
                    JOIN landlord_owners lo ON cr.bbl = lo.bbl
                    WHERE cr.id = %s AND lo.owner_user_id = %s AND lo.deleted_at IS NULL
                    """,
                    (review_id, user_id),
                )

                if not review_exists:
                    return Response(
                        {
                            "error": "Review not found or you don't have permission to respond."
                        },
                        status=status.HTTP_404_NOT_FOUND,
                    )

                # Insert the response into community_review_comments
                db.execute(
                    """
                    INSERT INTO community_review_comments (
                        review_id, user_id, body, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, NOW(), NOW())
                    """,
                    (review_id, user_id, response),
                )

            return Response(
                {"message": "Response submitted successfully."},
                status=status.HTTP_201_CREATED,
            )
        except Exception as e:
            print(f"[ReviewResponseView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# NEW: Flag a review
class FlagReviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Flag a review for admin review."""
        try:
            data = request.data
            review_id = data.get("review_id")
            reason = data.get("reason")

            if not review_id:
                return Response(
                    {"error": "Review ID is required."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # Persist flag via repository (updates community_reviews if possible,
            # otherwise records flag in a separate table).
            repo = LandlordRepository()
            user_id = None
            try:
                user_id = request.user.id
            except Exception:
                user_id = None

            if not user_id:
                return Response(
                    {"error": "Authentication required."},
                    status=status.HTTP_401_UNAUTHORIZED,
                )

            row = repo.flag_review(review_id, user_id, reason)
            print(f"Review {review_id} flagged by {user_id}: {row}")
            return Response({"data": row}, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[FlagReviewView] Error: {e}")
            return Response(
                {"error": "Internal server error."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class LandlordsByBBLView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, bbl):
        try:
            with PostgresClient() as db:
                rows = db.query_all(
                    """
                    SELECT DISTINCT
                        cu.id,
                        cu.username,
                        cu.email
                    FROM landlord_owners AS lo
                    JOIN custom_user AS cu
                      ON lo.owner_user_id = cu.id
                    WHERE lo.bbl = %s
                      AND lo.deleted_at IS NULL
                    """,
                    (bbl,),
                )

            landlords = [
                {
                    "user_id": row["id"],
                    "username": row["username"],
                    "email": row["email"],
                }
                for row in rows
            ]

            return Response(landlords, status=status.HTTP_200_OK)
        except Exception as e:
            print(f"[LandlordsByBBLView] DB error: {e}")
            return Response([], status=status.HTTP_200_OK)
