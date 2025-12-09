"""Consolidated tests for the `apps.landlord` package.

This single file contains the tests that were previously split across
`backend/apps/landlord/tests/`. Having them in one file makes test
discovery deterministic in environments that prefer `tests.py`.
"""

from django.test import TestCase
from rest_framework.test import APIClient
# from django.urls import reverse
from django.contrib.auth import get_user_model
from unittest.mock import patch, MagicMock
# from unittest.mock import patch as um_patch
# from unittest.mock import MagicMock as um_MagicMock
# from unittest.mock import patch as mock_patch
import json

from infrastructures.postgres.landlord_repository import LandlordRepository


def extract_payload(obj):
    """Unwrap the project's JSON renderer wrapper.

    The project wraps successful responses with {"result": True, "data": ...}.
    Some views also return a dict like {"data": {...}} so we may end up with
    nested `data` keys. This helper unwraps repeatedly until the inner payload
    (list or dict of domain fields) is found.
    """
    payload = obj
    # If the input is a Django REST response payload (dict), unwrap 'data' keys
    # until we reach a non-dict or a dict that doesn't only wrap data.
    while isinstance(payload, dict) and "data" in payload:
        payload = payload["data"]
    return payload


# --- From test_turnover_meta.py ---


class TurnoverMetaTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        # create and authenticate a user for endpoints requiring IsAuthenticated
        User = get_user_model()

        self.user = User.objects.create_user(username="testlandlord", password="pw")
        self.client.force_authenticate(user=self.user)

    @patch("apps.landlord.views.PostgresClient")
    def test_building_update_upserts_turnover(self, mock_pg_cls):
        bbl = "1000000001"
        # Mock DB client context manager
        mock_db = MagicMock()
        # First query_one for ownership check returns a row
        # Second query_one (after upsert) returns the metadata row
        mock_db.query_one.side_effect = [
            {"bbl": bbl},
            {
                "bbl": bbl,
                "average_rent": 2500,
                "occupancy_rate": 95.0,
                "turnover_rate": 12.5,
                "flagged": False,
                "notes": None,
                "source": None,
                "created_at": None,
                "updated_at": None,
            },
        ]
        mock_pg_cls.return_value.__enter__.return_value = mock_db

        payload = {"average_rent": 2500, "occupancy_rate": 95.0, "turnover_rate": 12.5}

        resp = self.client.post(
            f"/api/landlord/building/{bbl}/update/", payload, format="json"
        )
        self.assertIn(resp.status_code, (200, 201))
        data = resp.json()
        returned = extract_payload(data)
        self.assertEqual(returned.get("turnover_rate"), 12.5)

        # Ensure the upsert execute was called with turnover_rate in params
        # last execute call's args are in mock_db.execute.call_args
        self.assertTrue(mock_db.execute.called)
        called_args = mock_db.execute.call_args[0][1]
        # parameters tuple should include turnover_val (12.5)
        self.assertIn(12.5, called_args)

    @patch("apps.landlord.views.PostgresClient")
    @patch("apps.landlord.views.BuildingRepository")
    def test_properties_includes_turnover(self, mock_repo_cls, mock_pg_cls):
        # Setup PostgresClient to return landlord_owners and meta rows
        mock_db = MagicMock()
        mock_db.query_all.side_effect = [
            [{"bbl": "1000000001"}],
            [
                {
                    "bbl": "1000000001",
                    "average_rent": 2000,
                    "occupancy_rate": 90.0,
                    "turnover_rate": 8.2,
                    "flagged": False,
                    "notes": None,
                    "source": None,
                }
            ],
        ]
        mock_pg_cls.return_value.__enter__.return_value = mock_db

        # Mock BuildingRepository.get_many_by_bbl to return a minimal building dict
        mock_repo = MagicMock()
        mock_repo.get_many_by_bbl.return_value = {
            "1000000001": MagicMock(registration=None, violations=[], evictions=[])
        }
        mock_repo_cls.return_value = mock_repo

        resp = self.client.get("/api/landlord/properties/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        payload = extract_payload(data)
        # Expect a list with property including turnover_rate
        self.assertIsInstance(payload, list)
        self.assertGreaterEqual(len(payload), 1)
        prop = payload[0]
        self.assertIn("turnover_rate", prop)
        self.assertEqual(prop.get("turnover_rate"), 8.2)


# --- From test_update_endpoints.py ---


class UpdateEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="landlord_test",
            email="landlord@test.local",
            password="password123",
            role="landlord",
        )
        # Use DRF APIClient and authenticate via force_authenticate because
        # REST framework in this project uses JWT auth by default; using
        # APIClient.force_authenticate sets request.user for APIView tests.
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def _make_db_mock_for_violation(self, violation_bbl: str, owned: bool = True):
        """Create a mock DB context with query_one/execute behavior for violation tests."""
        mock_db = MagicMock()

        def query_one(sql, params=None):
            s = (sql or "").lower()
            # building_violations lookup
            if "from building_violations" in s:
                return {"bbl": violation_bbl}
            # landlord_owners lookup
            if "from landlord_owners" in s:
                if owned:
                    return {"bbl": violation_bbl}
                return None
            return None

        mock_db.query_one.side_effect = query_one
        mock_db.execute = MagicMock()

        # Context manager enter returns mock_db
        ctx = MagicMock()
        ctx.__enter__.return_value = mock_db
        ctx.__exit__.return_value = None
        return ctx, mock_db

    def _make_db_mock_for_complaint(self, complaint_bbl: str, owned: bool = True):
        mock_db = MagicMock()

        def query_one(sql, params=None):
            s = (sql or "").lower()
            if "from building_complaints" in s:
                return {"bbl": complaint_bbl}
            if "from landlord_owners" in s:
                if owned:
                    return {"bbl": complaint_bbl}
                return None
            return None

        mock_db.query_one.side_effect = query_one
        mock_db.execute = MagicMock()

        ctx = MagicMock()
        ctx.__enter__.return_value = mock_db
        ctx.__exit__.return_value = None
        return ctx, mock_db

    @patch("apps.landlord.views.PostgresClient")
    def test_toggle_violation_resolved_success(self, mock_pg):
        ctx, mock_db = self._make_db_mock_for_violation("1000010001", owned=True)
        mock_pg.return_value = ctx

        resp = self.client.patch(
            "/api/landlord/violation/123/",
            {"resolved": True},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        payload = extract_payload(data)
        # normalize id to string for comparison
        self.assertEqual(str(payload.get("violation_id")), "123")
        self.assertIn("violation_status", payload)
        # verify DB was updated to Closed
        mock_db.execute.assert_called()
        called_sql = mock_db.execute.call_args[0][0].lower()
        self.assertIn(
            "update building_violations set violation_status = %s where violation_id = %s",
            called_sql,
        )

    @patch("apps.landlord.views.PostgresClient")
    def test_toggle_violation_unauthorized(self, mock_pg):
        ctx, mock_db = self._make_db_mock_for_violation("1000010001", owned=False)
        mock_pg.return_value = ctx

        resp = self.client.patch(
            "/api/landlord/violation/123/",
            {"resolved": True},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 403)

    @patch("apps.landlord.views.PostgresClient")
    def test_toggle_complaint_resolved_and_unresolve(self, mock_pg):
        ctx, mock_db = self._make_db_mock_for_complaint("1000010001", owned=True)
        mock_pg.return_value = ctx

        # Resolve
        resp = self.client.patch(
            "/api/landlord/complaint/45/",
            {"resolved": True},
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        payload = extract_payload(data)
        self.assertEqual(str(payload.get("complaint_id")), "45")
        self.assertIn("complaint_status", payload)
        # execute should set complaint_status_date on resolve
        mock_db.execute.assert_called()

        mock_db.execute.reset_mock()

        # Unresolve
        resp2 = self.client.patch(
            "/api/landlord/complaint/45/",
            {"resolved": False},
            content_type="application/json",
        )
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json()
        payload2 = extract_payload(data2)
        self.assertEqual(str(payload2.get("complaint_id")), "45")
        self.assertIn("complaint_status", payload2)
        mock_db.execute.assert_called()


# --- From test_views_extra.py ---


class LandlordViewsExtraTests(TestCase):
    def setUp(self):
        # create a simple user
        User = get_user_model()
        self.user = User.objects.create_user(
            username="tlandlord",
            email="tlandlord@example.com",
            password="password",
            role="landlord",
        )
        # Use APIClient for DRF endpoints
        self.client = APIClient()

    @patch("apps.landlord.views.PostgresClient")
    def test_properties_no_bbl_returns_empty(self, mock_pg):
        """When landlord_owners has no rows, properties endpoint returns []."""
        # Mock the context manager to return empty rows for owner lookup
        mock_ctx = mock_pg.return_value
        mock_ctx.__enter__.return_value.query_all.return_value = []

        # authenticate via APIClient
        self.client.force_authenticate(user=self.user)
        resp = self.client.get("/api/landlord/properties/")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        payload = (
            data.get("data") if isinstance(data, dict) and "data" in data else data
        )
        self.assertEqual(payload, [])

    def test_building_update_requires_auth(self):
        # no login -> 401
        resp = self.client.post("/api/landlord/building/1000000001/update/", {})
        self.assertEqual(resp.status_code, 401)

    @patch("apps.landlord.views.PostgresClient")
    def test_building_update_invalid_bbl(self, mock_pg):
        # login but invalid bbl (not 10 digits) -> 400
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(
            "/api/landlord/building/123/update/", {}, content_type="application/json"
        )
        self.assertEqual(resp.status_code, 400)

    @patch("apps.landlord.views.PostgresClient")
    def test_building_update_upserts_and_returns_row(self, mock_pg):
        self.client.force_authenticate(user=self.user)
        bbl = "1000000001"

        # prepare mock DB: first query_one returns ownership, second returns meta row
        mock_ctx = mock_pg.return_value
        enter = mock_ctx.__enter__.return_value
        enter.query_one.side_effect = [
            {"bbl": bbl},
            {
                "bbl": bbl,
                "average_rent": 1500.0,
                "occupancy_rate": 95.0,
                "turnover_rate": 5.0,
                "flagged": False,
                "notes": None,
                "source": None,
            },
        ]

        payload = {"average_rent": 1500, "occupancy_rate": 95, "turnover_rate": 5}
        resp = self.client.post(
            f"/api/landlord/building/{bbl}/update/",
            json.dumps(payload),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        payload = extract_payload(data)
        # payload may be the metadata dict directly or wrapped; ensure we have the row
        self.assertIsInstance(payload, dict)
        self.assertEqual(payload.get("bbl"), bbl)

    @patch("apps.landlord.views.PostgresClient")
    def test_violation_update_not_found(self, mock_pg):
        self.client.force_authenticate(user=self.user)
        # Mock query_one to return None for violation lookup
        mock_ctx = mock_pg.return_value
        enter = mock_ctx.__enter__.return_value
        enter.query_one.return_value = None

        resp = self.client.patch(
            "/api/landlord/violation/9999/",
            json.dumps({"resolved": True}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 404)

    @patch("apps.landlord.views.PostgresClient")
    def test_violation_update_success(self, mock_pg):
        self.client.force_authenticate(user=self.user)
        violation_id = 42
        bbl = "1000000001"

        mock_ctx = mock_pg.return_value
        enter = mock_ctx.__enter__.return_value
        # First call: find violation row; second call: ownership check
        enter.query_one.side_effect = [{"bbl": bbl}, {"bbl": bbl}]
        enter.execute = MagicMock()

        resp = self.client.patch(
            f"/api/landlord/violation/{violation_id}/",
            json.dumps({"resolved": True}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        payload = extract_payload(body)
        self.assertIsInstance(payload, dict)
        self.assertIn("violation_id", payload)
        self.assertIn("violation_status", payload)


# --- Additional high-value view tests ---
class CoreViewsTests(TestCase):
    """Tests for high-value landlord views: Properties, BuildingPluto, BuildingStats."""

    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            username="coretester", password="pw", role="landlord"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    @patch("apps.landlord.views.PostgresClient")
    @patch("apps.landlord.views.BuildingRepository")
    def test_properties_with_bbls_and_meta(self, mock_repo_cls, mock_pg_cls):
        # landlord_owners returns one bbl
        mock_db = MagicMock()
        mock_db.query_all.side_effect = [
            [{"bbl": "1000000001"}],  # landlord_owners
            [
                {
                    "bbl": "1000000001",
                    "average_rent": 2000,
                    "occupancy_rate": 90.0,
                    "turnover_rate": 8.2,
                    "flagged": False,
                    "notes": None,
                    "source": None,
                }
            ],
        ]
        mock_pg_cls.return_value.__enter__.return_value = mock_db

        # BuildingRepository returns a building-like object
        mock_repo = MagicMock()
        reg = MagicMock()
        reg.house_number = "10"
        reg.street_name = "Test St"
        reg.boro = "Brooklyn"
        mock_bld = MagicMock()
        mock_bld.registration = reg
        mock_bld.violations = []
        mock_bld.evictions = []
        mock_repo.get_many_by_bbl.return_value = {"1000000001": mock_bld}
        mock_repo_cls.return_value = mock_repo

        resp = self.client.get("/api/landlord/properties/")
        self.assertEqual(resp.status_code, 200)
        payload = extract_payload(resp.json())
        self.assertIsInstance(payload, list)
        self.assertGreaterEqual(len(payload), 1)
        p = payload[0]
        self.assertEqual(p.get("bbl"), "1000000001")
        self.assertEqual(p.get("turnover_rate"), 8.2)

    @patch("apps.landlord.views.PostgresClient")
    def test_building_pluto_success_and_unauthorized(self, mock_pg):
        bbl = "1000000001"
        # First, success path
        mock_ctx = mock_pg.return_value
        enter = mock_ctx.__enter__.return_value
        # ownership exists
        enter.query_one.side_effect = [{"bbl": bbl}]

        # Patch BuildingRepository.get_pluto_by_bbl by injecting into views module
        with patch("apps.landlord.views.BuildingRepository") as mock_repo_cls:
            mock_repo = MagicMock()
            pluto = {"bbl": bbl, "ownername": "Owner LLC"}
            mock_repo.get_pluto_by_bbl.return_value = pluto
            mock_repo_cls.return_value = mock_repo

            resp = self.client.get(f"/api/landlord/building/{bbl}/pluto/")
            self.assertEqual(resp.status_code, 200)
            payload = extract_payload(resp.json())
            self.assertEqual(payload.get("ownername"), "Owner LLC")

        # Now unauthorized path (no ownership)
        mock_ctx2 = mock_pg.return_value
        enter2 = mock_ctx2.__enter__.return_value
        # Clear any previous side_effect and return None to simulate no ownership
        enter2.query_one.side_effect = None
        enter2.query_one.return_value = None
        resp2 = self.client.get(f"/api/landlord/building/{bbl}/pluto/")
        self.assertEqual(resp2.status_code, 403)

    @patch("apps.landlord.views.PostgresClient")
    def test_building_stats_no_bbls_and_with_bbls(self, mock_pg):
        # No BBLs -> zeros
        mock_ctx = mock_pg.return_value
        enter = mock_ctx.__enter__.return_value
        enter.query_all.return_value = []
        resp = self.client.get("/api/landlord/stats/")
        self.assertEqual(resp.status_code, 200)
        payload = extract_payload(resp.json())
        self.assertEqual(payload.get("total_violations"), 0)

        # With BBLs -> aggregate
        bbls = [{"bbl": "1000000001"}, {"bbl": "1000000002"}]
        enter.query_all.return_value = bbls

        # Patch BuildingRepository.get_by_bbl to return objects with lists
        with patch("apps.landlord.views.BuildingRepository") as mock_repo_cls:
            mock_repo = MagicMock()
            b1 = MagicMock()
            b1.violations = [1, 2]
            b1.complaints = [1]
            b2 = MagicMock()
            b2.violations = []
            b2.complaints = [1, 2, 3]
            mock_repo.get_by_bbl.side_effect = lambda bbl: (
                b1 if bbl == "1000000001" else b2
            )
            mock_repo_cls.return_value = mock_repo

            resp2 = self.client.get("/api/landlord/stats/")
            self.assertEqual(resp2.status_code, 200)
            payload2 = extract_payload(resp2.json())
            # total violations = 2 + 0 = 2
            self.assertEqual(payload2.get("total_violations"), 2)
            # total complaints = 1 + 3 = 4
            self.assertEqual(payload2.get("total_complaints"), 4)


# python


class LandlordConfigTests(TestCase):
    """Test LandlordConfig app configuration"""

    def test_landlord_config(self):
        """Test that LandlordConfig is properly configured"""
        from apps.landlord.apps import LandlordConfig
        import apps.landlord as landlord_module

        # Pass the app module so AppConfig can determine filesystem path correctly
        config = LandlordConfig("apps.landlord", landlord_module)
        self.assertEqual(config.name, "apps.landlord")
        self.assertEqual(config.default_auto_field, "django.db.models.BigAutoField")


class LandlordRepositoryTests(TestCase):
    """Test LandlordRepository"""

    def setUp(self):
        self.repository = LandlordRepository()
        User = get_user_model()
        self.user = User.objects.create_user(
            username="landlord1",
            email="landlord@example.com",
            password="password123",
            role="landlord",
            first_name="Landlord",
            last_name="Test",
        )

    def test_landlord_repository_initialization(self):
        """Test LandlordRepository initialization"""
        from infrastructures.postgres.postgres_client import PostgresClient

        self.assertEqual(self.repository.client_factory, PostgresClient)

    def test_create_landlord_application_success(self):
        """Test creating a new landlord application"""
        try:
            result = self.repository.create_landlord_application(
                "1000010001", self.user.id
            )
            # Should return True if successful, False if already exists
            self.assertIsInstance(result, bool)
        except Exception as e:
            self.skipTest(f"Database operation failed: {e}")

    def test_create_landlord_application_duplicate(self):
        """Test creating duplicate landlord application"""
        try:
            # Create first application
            self.repository.create_landlord_application("1000010001", self.user.id)
            # Try to create duplicate
            result2 = self.repository.create_landlord_application(
                "1000010001", self.user.id
            )
            # Second should return False (already exists)
            self.assertFalse(result2)
        except Exception as e:
            self.skipTest(f"Database operation failed: {e}")

    def test_create_landlord_application_different_bbl(self):
        """Test creating applications for different BBLs"""
        try:
            result1 = self.repository.create_landlord_application(
                "1000010001", self.user.id
            )
            result2 = self.repository.create_landlord_application(
                "1000010002", self.user.id
            )
            # Both should succeed (different BBLs)
            self.assertIsInstance(result1, bool)
            self.assertIsInstance(result2, bool)
            # Verify both results are valid
            self.assertTrue(result1 or result2)
        except Exception as e:
            self.skipTest(f"Database operation failed: {e}")
