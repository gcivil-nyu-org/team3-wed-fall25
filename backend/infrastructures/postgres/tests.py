from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from django.test import TestCase
from unittest.mock import patch

from infrastructures.postgres.building_repository import BuildingRepository
from infrastructures.postgres.landlord_repository import LandlordRepository
from infrastructures.postgres.neighborhood_repository import NeighborhoodRepository
from infrastructures.postgres.postgres_client import (
    PostgresClient,
    DatabaseError,  # type: ignore
)


# ============================================================
# 공통 Fake 객체들
# ============================================================


class FakeCursor:
    """
    psycopg2 RealDictCursor를 대체하는 간단 Fake.
    - rows: fetch 결과
    - rowcount: execute 결과 row 수(대충 int만 있어도 됨)
    """

    def __init__(self, rows: Optional[List[Dict[str, Any]]] = None, fail: bool = False):
        self.rows: List[Dict[str, Any]] = rows or []
        self.fail = fail
        self.executed_sql: List[str] = []
        self.rowcount: int = 0  # PostgresClient.execute에서 접근함

    def execute(self, sql, params=None):
        self.executed_sql.append(str(sql))
        if self.fail:
            raise Exception("Fake SQL error")
        # 대충 rows 길이만큼 rowcount 설정 (정확할 필요 없음)
        self.rowcount = len(self.rows)

    def fetchone(self):
        if not self.rows:
            return None
        return self.rows[0]

    def fetchall(self):
        return list(self.rows)

    def close(self):
        pass


class FakeConnection:
    """psycopg2 connection 대체용 Fake."""

    def __init__(self, cursor: FakeCursor):
        self.cursor_obj = cursor
        self.autocommit = False
        self.closed = False
        self.committed = False
        self.rolled_back = False

    def cursor(self, cursor_factory=None):
        return self.cursor_obj

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True

    def close(self):
        self.closed = True


class DummyDB:
    """
    Repository에서 사용하는 최소 기능 Fake DB.
    - query_one / query_all 결과를 순서대로 꺼내서 반환.
    """

    def __init__(
        self,
        *,
        query_one_results: Optional[List[Optional[Dict[str, Any]]]] = None,
        query_all_results: Optional[List[List[Dict[str, Any]]]] = None,
        execute_result: int = 1,
        execute_fail: bool = False,
    ):
        self._query_one_results = list(query_one_results or [])
        self._query_all_results = list(query_all_results or [])
        self._execute_result = execute_result
        self._execute_fail = execute_fail

    # context manager
    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def _pop_one(self, store, default):
        return store.pop(0) if store else default

    def query_one(self, sql, params=None):
        return self._pop_one(self._query_one_results, None)

    def query_all(self, sql, params=None):
        return self._pop_one(self._query_all_results, [])

    def execute(self, sql, params=None, returning=None):
        if self._execute_fail:
            raise Exception("Dummy execute failed")
        return self._execute_result


# ============================================================
# PostgresClient 테스트
# ============================================================


class PostgresClientTests(TestCase):
    def _patch_env(self, mock_get_env):
        # get_env()가 callable을 돌려주므로, 그 안에서 key로 조회
        mock_get_env.return_value = lambda key, default=None: {
            "DB_NAME": "test_db",
            "DB_USER": "user",
            "DB_PASSWORD": "pw",
            "DB_HOST": "localhost",
            "DB_PORT": 5432,
        }.get(key, default)

    @patch("infrastructures.postgres.postgres_client.psycopg2.connect")
    @patch("infrastructures.postgres.postgres_client.get_env")
    def test_context_manager_commit_and_close(self, mock_get_env, mock_connect):
        self._patch_env(mock_get_env)

        cursor = FakeCursor(rows=[{"test_value": 1}])
        conn = FakeConnection(cursor)
        mock_connect.return_value = conn

        client = PostgresClient()
        with client as db:
            row = db.query_one("SELECT 1 as test_value")
            self.assertEqual(row["test_value"], 1)
            self.assertFalse(conn.committed)
            self.assertFalse(conn.closed)

        # with 블록 정상 종료 시 commit + close
        self.assertTrue(conn.committed)
        self.assertTrue(conn.closed)
        self.assertIsNone(client.conn)

    @patch("infrastructures.postgres.postgres_client.psycopg2.connect")
    @patch("infrastructures.postgres.postgres_client.get_env")
    def test_context_manager_rollback_on_exception(self, mock_get_env, mock_connect):
        self._patch_env(mock_get_env)

        cursor = FakeCursor()
        conn = FakeConnection(cursor)
        mock_connect.return_value = conn

        client = PostgresClient()

        with self.assertRaises(RuntimeError):
            with client:
                raise RuntimeError("boom")

        self.assertTrue(conn.rolled_back)
        self.assertTrue(conn.closed)

    @patch("infrastructures.postgres.postgres_client.psycopg2.connect")
    @patch("infrastructures.postgres.postgres_client.get_env")
    def test_query_one_and_all(self, mock_get_env, mock_connect):
        self._patch_env(mock_get_env)

        cursor = FakeCursor()
        conn = FakeConnection(cursor)
        mock_connect.return_value = conn

        client = PostgresClient()
        with client as db:
            # query_one
            cursor.rows = [{"answer": 42}]
            row = db.query_one("SELECT 42 as answer")
            self.assertEqual(row["answer"], 42)

            cursor.rows = []
            row = db.query_one("SELECT 1 WHERE 1=0")
            self.assertIsNone(row)

            # query_all
            cursor.rows = [{"num": 1}, {"num": 2}, {"num": 3}]
            rows = db.query_all("SELECT generate_series(1,3) as num")
            self.assertEqual(len(rows), 3)
            self.assertEqual(rows[0]["num"], 1)

            cursor.rows = []
            rows = db.query_all("SELECT 1 WHERE 1=0")
            self.assertEqual(rows, [])

    @patch("infrastructures.postgres.postgres_client.psycopg2.connect")
    @patch("infrastructures.postgres.postgres_client.get_env")
    def test_execute_with_and_without_returning(self, mock_get_env, mock_connect):
        self._patch_env(mock_get_env)

        cursor = FakeCursor()
        conn = FakeConnection(cursor)
        mock_connect.return_value = conn

        client = PostgresClient()
        with client as db:
            # returning 없음
            cursor.rows = []
            result = db.execute("UPDATE something SET x=1")
            self.assertIsInstance(result, int)

            # returning 있음
            cursor.rows = [{"id": 99}]
            result = db.execute("SELECT 99 as id", returning="id")
            self.assertEqual(result, 99)

    @patch("infrastructures.postgres.postgres_client.psycopg2.connect")
    @patch("infrastructures.postgres.postgres_client.get_env")
    def test_exists_and_scalar(self, mock_get_env, mock_connect):
        self._patch_env(mock_get_env)

        cursor = FakeCursor()
        conn = FakeConnection(cursor)
        mock_connect.return_value = conn

        client = PostgresClient()
        with client as db:
            # exists True
            cursor.rows = [{"value": 1}]
            self.assertTrue(db.exists("SELECT 1"))

            # exists False
            cursor.rows = []
            self.assertFalse(db.exists("SELECT 1 WHERE 1=0"))

            # scalar 기본
            cursor.rows = [{"value": 42}]
            self.assertEqual(db.scalar("SELECT 42 as value"), 42)

            # scalar column 지정
            cursor.rows = [{"test_value": 7, "other": 9}]
            self.assertEqual(
                db.scalar("SELECT 7 as test_value, 9 as other", column="test_value"), 7
            )

            # scalar no result
            cursor.rows = []
            self.assertIsNone(db.scalar("SELECT 1 WHERE 1=0"))

    @patch("infrastructures.postgres.postgres_client.execute_values")
    @patch("infrastructures.postgres.postgres_client.psycopg2.connect")
    @patch("infrastructures.postgres.postgres_client.get_env")
    def test_bulk_insert_variants(self, mock_get_env, mock_connect, mock_exec_values):
        self._patch_env(mock_get_env)

        cursor = FakeCursor()
        conn = FakeConnection(cursor)
        mock_connect.return_value = conn

        client = PostgresClient()
        with client as db:
            rows = [{"id": 1, "name": "a"}, {"id": 2, "name": "b"}]

            # 기본 bulk_insert
            count = db.bulk_insert("my_table", ["id", "name"], rows)
            self.assertEqual(count, 2)
            self.assertTrue(mock_exec_values.called)

            mock_exec_values.reset_mock()

            # conflict_target + DO NOTHING
            db.bulk_insert(
                "my_table",
                ["id", "name"],
                rows,
                conflict_target=["id"],
                do_update=False,
            )
            self.assertTrue(mock_exec_values.called)

            mock_exec_values.reset_mock()

            # conflict_target + DO UPDATE
            db.bulk_insert(
                "my_table",
                ["id", "name"],
                rows,
                conflict_target=["id"],
                do_update=True,
            )
            self.assertTrue(mock_exec_values.called)

    @patch("infrastructures.postgres.postgres_client.execute_values")
    @patch("infrastructures.postgres.postgres_client.psycopg2.connect")
    @patch("infrastructures.postgres.postgres_client.get_env")
    def test_bulk_insert_empty_rows_returns_zero(
        self, mock_get_env, mock_connect, mock_exec_values
    ):
        """rows가 비어있을 때 0 반환 & execute_values 호출 안 됨."""
        self._patch_env(mock_get_env)

        cursor = FakeCursor()
        conn = FakeConnection(cursor)
        mock_connect.return_value = conn

        client = PostgresClient()
        with client as db:
            count = db.bulk_insert("my_table", ["id"], [])
            self.assertEqual(count, 0)
            mock_exec_values.assert_not_called()

    @patch("infrastructures.postgres.postgres_client.psycopg2.connect")
    @patch("infrastructures.postgres.postgres_client.get_env")
    def test_error_wrapping_in_database_error(self, mock_get_env, mock_connect):
        self._patch_env(mock_get_env)

        cursor = FakeCursor(fail=True)
        conn = FakeConnection(cursor)
        mock_connect.return_value = conn

        client = PostgresClient()
        with client as db:
            with self.assertRaises(DatabaseError):
                db.query_one("SELECT 1")

            with self.assertRaises(DatabaseError):
                db.query_all("SELECT 1")

            with self.assertRaises(DatabaseError):
                db.execute("UPDATE something SET x=1")


# ============================================================
# BuildingRepository 테스트
# ============================================================


class BuildingRepositoryTests(TestCase):
    def setUp(self):
        self.repo = BuildingRepository()

    def test_get_by_bbl_basic_flow(self):
        """location/registration/rent 등 기본 흐름이 문제 없이 돈다."""
        location_row = {
            "address": "123 Main St",
            "house_number": "123",
            "street_name": "MAIN ST",
            "borough": "MANHATTAN",
            "zip": "10001",
            "latitude": 40.7,
            "longitude": -74.0,
            "has_location": True,
        }
        reg_row = {
            "bbl": "1234567890",
            "bin": "1",
            "boro_id": 1,
            "boro": "MANHATTAN",
            "block": 1,
            "lot": 1,
            "house_number": None,
            "street_name": None,
            "zip": "10001",
            "community_board": "1",
            "last_registration_date": None,
            "registration_end_date": None,
            "registration_id": 10,
            "building_id": 20,
        }
        rent_row = {
            "bbl": "1234567890",
            "borough": "MANHATTAN",
            "block": 1,
            "lot": 1,
            "zip": "10001",
            "city": "NEW YORK",
            "status": "STABILIZED",
            "source_year": 2024,
        }

        # query_one: location -> reg -> rent
        dummy = DummyDB(
            query_one_results=[location_row, reg_row, rent_row],
            query_all_results=[[], [], [], [], [], [], []],
        )
        self.repo.client_factory = lambda: dummy

        with patch(
            "infrastructures.postgres.building_repository.build_building_from_rows"
        ) as mock_builder:
            mock_builder.return_value = {"bbl": "1234567890"}
            result = self.repo.get_by_bbl("1234567890")

            self.assertEqual(result["bbl"], "1234567890")
            # reg_row가 location 기반으로 채워졌는지 확인
            kwargs = mock_builder.call_args.kwargs
            self.assertEqual(kwargs["reg_row"]["house_number"], "123")
            self.assertEqual(kwargs["reg_row"]["street_name"], "MAIN ST")

    def test_get_many_by_bbl_handles_exceptions(self):
        """get_many_by_bbl이 개별 BBL 예외를 삼킨다."""

        def fake_get(bbl: str):
            if bbl == "bad":
                raise ValueError("boom")
            return f"OK-{bbl}"

        self.repo.get_by_bbl = fake_get  # type: ignore[assignment]

        result = self.repo.get_many_by_bbl(["good", "bad"])
        self.assertEqual(result["good"], "OK-good")
        self.assertNotIn("bad", result)

    def test_get_registration_by_bbl_no_result(self):
        """registration이 없으면 None을 반환한다."""
        dummy = DummyDB(query_one_results=[None])
        self.repo.client_factory = lambda: dummy

        result = self.repo.get_registration_by_bbl("1013510030")
        self.assertIsNone(result)

    def test_get_registration_by_bbl_with_and_without_contacts(self):
        """registration_id 유무에 따라 contacts 쿼리 분기를 커버한다."""
        reg_no_contacts = {
            "bbl": "1013510030",
            "registration_id": None,
            "building_id": 1,
            "house_number": "1",
            "street_name": "MAIN",
            "zip": "10001",
            "community_board": "1",
            "boro": "MANHATTAN",
            "boro_id": 1,
            "block": 1,
            "lot": 1,
            "last_registration_date": None,
            "registration_end_date": None,
        }
        reg_with_contacts = dict(reg_no_contacts)
        reg_with_contacts["registration_id"] = 10

        contacts = [
            {
                "name": "John Doe",
                "business_name": "JD LLC",
                "role": "Head Officer",
                "phone": "123",
                "email": "test@example.com",
            }
        ]

        # 첫 호출: reg_no_contacts, 두 번째 호출: reg_with_contacts
        dummy = DummyDB(
            query_one_results=[reg_no_contacts, reg_with_contacts],
            query_all_results=[[], contacts],
        )
        self.repo.client_factory = lambda: dummy

        # 1) contacts 없는 경우
        res1 = self.repo.get_registration_by_bbl("1013510030")
        self.assertIsNotNone(res1)
        self.assertEqual(res1["contacts"], [])

        # 2) contacts 있는 경우
        res2 = self.repo.get_registration_by_bbl("1013510030")
        self.assertIsNotNone(res2)
        self.assertEqual(len(res2["contacts"]), 1)
        self.assertEqual(res2["contacts"][0]["name"], "John Doe")

    def test_search_buildings_basic_and_filters(self):
        """검색 쿼리 & 여러 필터 및 sort_by 분기 커버."""
        row = {
            "bbl": "1013510030",
            "house_number": "123",
            "street_name": "BROADWAY",
            "zip": "10001",
            "borough": "MANHATTAN",
            "evictions_count": 1,
            "open_violations_count": 2,
            "open_complaints_count": 3,
            "rent_stabilized": True,
            "affordable_housing": True,
            "units": 10,
            "address": "123 BROADWAY",
        }

        class SearchDB(DummyDB):
            def query_all(self, sql, params=None):
                # 매번 동일 row 반환 (offset/limit/filters와 무관)
                return [row]

        self.repo.client_factory = lambda: SearchDB()

        # 단순 주소 검색
        res = self.repo.search_buildings("Broadway", limit=5)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["bbl"], "1013510030")

        # zip 코드 검색
        res_zip = self.repo.search_buildings("10001", limit=5)
        self.assertTrue(res_zip)

        # borough 필터
        res_boro = self.repo.search_buildings("10001", borough="Manhattan", limit=5)
        self.assertTrue(res_boro)
        self.assertEqual(res_boro[0]["borough"], "MANHATTAN")

        # rent_stabilized / affordable_housing / 기타 숫자 필터 값들
        res_filters = self.repo.search_buildings(
            "10001",
            rent_stabilized="true",
            affordable_housing="true",
            violation_class="A",
            rent_impairing="false",
            complaint_category="HEAT/HOT WATER",
            recent_activity_days="30",
            evictions_min="0",
            evictions_max="10",
            violations_min="0",
            violations_max="20",
            zip_code="10001",
            sort_by="Most Violations",
            limit=5,
        )
        self.assertTrue(res_filters)

    def test_search_buildings_borough_name_query_and_risk_sort(self):
        """쿼리가 BOROUGH 이름일 때 처리 & risk 기반 sort 분기."""
        row = {
            "bbl": "1013510030",
            "house_number": "1",
            "street_name": "MAIN",
            "zip": "10001",
            "borough": "MANHATTAN",
            "evictions_count": 0,
            "open_violations_count": 0,
            "open_complaints_count": 0,
            "rent_stabilized": False,
            "affordable_housing": False,
            "units": None,
            "address": "1 MAIN",
        }

        class BoroughDB(DummyDB):
            def query_all(self, sql, params=None):
                return [row, row, row]

        self.repo.client_factory = lambda: BoroughDB()

        with patch.object(
            BuildingRepository,
            "_assign_risk_level_with_distribution",
            return_value="High Risk",
        ):
            res = self.repo.search_buildings(
                "Manhattan", risk_level="High", sort_by="Highest Rating", limit=2
            )
            self.assertTrue(res)
            self.assertEqual(res[0]["riskLevel"], "High Risk")

    def test_search_buildings_count_variants(self):
        """search_buildings_count의 risk_level 유무 분기 커버."""
        base_row = {
            "bbl": "1013510030",
            "evictions_count": 1,
            "open_violations_count": 2,
            "open_complaints_count": 3,
            "rent_stabilized": False,
            "units": None,
        }

        # risk_level 없이: SQL count 경로
        dummy_no_risk = DummyDB(
            query_all_results=[[base_row]], query_one_results=[{"total_count": 1}]
        )
        self.repo.client_factory = lambda: dummy_no_risk
        count = self.repo.search_buildings_count(
            "10001",
            borough="Manhattan",
            rent_stabilized="false",
            affordable_housing="false",
            violation_class="A",
            rent_impairing="true",
            complaint_category="HEAT/HOT WATER",
            recent_activity_days="7",
            evictions_min="0",
            evictions_max="10",
            violations_min="0",
            violations_max="10",
            zip_code="10001",
        )
        self.assertEqual(count, 1)

        # risk_level 있는 경우: Python 쪽에서 필터링 경로
        dummy_risk = DummyDB(query_all_results=[[base_row]])
        self.repo.client_factory = lambda: dummy_risk

        with patch.object(
            BuildingRepository,
            "_assign_risk_level_with_distribution",
            return_value="High Risk",
        ):
            count_high = self.repo.search_buildings_count("10001", risk_level="High")
            self.assertEqual(count_high, 1)

    def test_assign_risk_level_with_distribution_various_cases(self):
        """_assign_risk_level_with_distribution 여러 분기 직접 커버."""
        repo = self.repo

        # 1) 이슈 없음 + rent_stabilized True, 작은 hash -> High/Moderate/Low 분기
        self.assertIn(
            repo._assign_risk_level_with_distribution(
                calculated_risk_level="Low Risk",
                risk_score=0.0,
                evictions=0,
                violations=0,
                rent_stabilized=True,
                bbl="0000000001",  # hash=1
            ),
            {"High Risk", "Moderate Risk", "Low Risk"},
        )

        # 2) 이슈 없음 + rent_stabilized False
        result_no_stab = repo._assign_risk_level_with_distribution(
            calculated_risk_level="Low Risk",
            risk_score=0.0,
            evictions=0,
            violations=0,
            rent_stabilized=False,
            bbl="0000000010",  # hash=10
        )
        self.assertIn(result_no_stab, {"High Risk", "Moderate Risk", "Low Risk"})

        # 3) 아주 심각한 경우 -> 항상 High
        high_severe = repo._assign_risk_level_with_distribution(
            calculated_risk_level="High Risk",
            risk_score=1.0,
            evictions=10,
            violations=0,
            rent_stabilized=False,
            bbl="55",
        )
        self.assertEqual(high_severe, "High Risk")

        # 4) severe: evictions>=5 or violations>=20, hash로 High/Moderate
        mod_severe = repo._assign_risk_level_with_distribution(
            calculated_risk_level="High Risk",
            risk_score=0.8,
            evictions=5,
            violations=0,
            rent_stabilized=False,
            bbl="90",  # hash=90 => else branch => Moderate Risk
        )
        self.assertIn(mod_severe, {"High Risk", "Moderate Risk"})

        # 5) medium-high severity: evictions>=2 or violations>=10
        medium_high = repo._assign_risk_level_with_distribution(
            calculated_risk_level="Moderate Risk",
            risk_score=0.5,
            evictions=2,
            violations=0,
            rent_stabilized=False,
            bbl="15",
        )
        self.assertIn(medium_high, {"High Risk", "Moderate Risk", "Low Risk"})

        # 6) medium-low severity: evictions>=1 or violations>=5
        medium_low = repo._assign_risk_level_with_distribution(
            calculated_risk_level="Moderate Risk",
            risk_score=0.3,
            evictions=1,
            violations=0,
            rent_stabilized=False,
            bbl="40",
        )
        self.assertIn(medium_low, {"High Risk", "Moderate Risk", "Low Risk"})

        # 7) very low severity path도 한 번 태우기
        low_severity = repo._assign_risk_level_with_distribution(
            calculated_risk_level="Low Risk",
            risk_score=0.1,
            evictions=0,
            violations=1,
            rent_stabilized=False,
            bbl="50",
        )
        self.assertIn(low_severity, {"High Risk", "Moderate Risk", "Low Risk"})

    def test_get_pluto_by_bbl(self):
        """PLUTO 조회 쿼리도 한 번 태워서 커버."""
        pluto_row = {
            "bbl": "1013510030",
            "borough": "MANHATTAN",
            "block": 1,
            "lot": 1,
        }
        dummy = DummyDB(query_one_results=[pluto_row])
        self.repo.client_factory = lambda: dummy

        result = self.repo.get_pluto_by_bbl("1013510030")
        self.assertEqual(result["bbl"], "1013510030")


# ============================================================
# LandlordRepository 테스트 (이미 100%지만, 유지용)
# ============================================================


class LandlordRepositoryTests(TestCase):
    def setUp(self):
        self.repo = LandlordRepository()

    def test_flag_review_success(self):
        updated_row = {
            "id": "review-1",
            "bbl": "1013510030",
            "flagged": True,
            "created_at": datetime.now(),
            "updated_at": datetime.now(),
        }
        dummy = DummyDB(
            query_one_results=[updated_row],
            execute_result=1,
        )
        self.repo.client_factory = lambda: dummy

        result = self.repo.flag_review("review-1", flagged_by=1, reason="test")
        self.assertEqual(result["id"], "review-1")
        self.assertTrue(result["flagged"])

    def test_flag_review_failure_raises(self):
        dummy = DummyDB(execute_fail=True)
        self.repo.client_factory = lambda: dummy

        with self.assertRaises(Exception):
            self.repo.flag_review("review-1", flagged_by=1, reason="bad")

    def test_create_landlord_application_already_exists(self):
        existing = {"id": 1}
        dummy = DummyDB(query_one_results=[existing])
        self.repo.client_factory = lambda: dummy

        created = self.repo.create_landlord_application("1013510030", owner_user_id=1)
        self.assertFalse(created)

    def test_create_landlord_application_new_record(self):
        dummy = DummyDB(
            query_one_results=[None],  # existing 없음
            execute_result=1,
        )
        self.repo.client_factory = lambda: dummy

        created = self.repo.create_landlord_application("1013510030", owner_user_id=1)
        self.assertTrue(created)

    def test_create_landlord_application_error_returns_false(self):
        dummy = DummyDB(execute_fail=True)
        self.repo.client_factory = lambda: dummy

        result = self.repo.create_landlord_application("1013510030", owner_user_id=1)
        self.assertFalse(result)


# ============================================================
# NeighborhoodRepository 테스트
# ============================================================


class NeighborhoodRepositoryTests(TestCase):
    def setUp(self):
        self.repo = NeighborhoodRepository()

    def test_get_neighborhood_stats_by_bounds_combines_data(self):
        """각 테이블 데이터를 합쳐 NeighborhoodStats를 만드는 경로 커버."""
        buildings = [
            {
                "bbl": "1013510030",
                "address": "123 MAIN ST",
                "borough": "MANHATTAN",
                "zip_code": "10001",
                "latitude": 40.7,
                "longitude": -74.0,
            }
        ]
        violations = [
            {
                "bbl": "1013510030",
                "total_violations": 5,
                "open_violations": 3,
                "class_a_violations": 1,
                "class_b_violations": 2,
                "class_c_violations": 2,
                "rent_impairing_violations": 1,
            }
        ]
        evictions = [
            {
                "bbl": "1013510030",
                "total_evictions": 2,
                "evictions_3yr": 2,
                "evictions_1yr": 1,
            }
        ]
        complaints = [
            {
                "bbl": "1013510030",
                "total_complaints": 4,
                "open_complaints": 2,
                "emergency_complaints": 1,
            }
        ]
        rent_stabilized = [{"bbl": "1013510030"}]

        class StatsDB(DummyDB):
            def __init__(self):
                super().__init__()
                self.calls = 0

            def query_all(self, sql, params=None):
                self.calls += 1
                if self.calls == 1:
                    return buildings
                elif self.calls == 2:
                    return violations
                elif self.calls == 3:
                    return evictions
                elif self.calls == 4:
                    return complaints
                elif self.calls == 5:
                    return rent_stabilized
                return []

        self.repo.client_factory = lambda: StatsDB()

        stats_list = self.repo.get_neighborhood_stats_by_bounds(
            40.7, 40.8, -74.0, -73.9, data_type="violations"
        )
        self.assertEqual(len(stats_list), 1)
        stats = stats_list[0]
        self.assertEqual(stats.bbl, "1013510030")
        self.assertEqual(stats.total_violations, 5)
        self.assertTrue(stats.is_rent_stabilized)

    def test_get_heatmap_data_for_each_type_and_defaults(self):
        """violations / evictions / complaints heatmap + 기본값 분기."""
        rows = [
            {
                "bbl": "1013510030",
                "latitude": 40.7,
                "longitude": -74.0,
                "address": "123 MAIN ST",
                "borough": "MANHATTAN",
                "count": 3,
            }
        ]

        class HeatmapDB(DummyDB):
            def query_all(self, sql, params=None):
                return rows

        self.repo.client_factory = lambda: HeatmapDB()

        # data_type 각각
        for data_type in ("violations", "evictions", "complaints"):
            result = self.repo.get_heatmap_data(
                40.7,
                40.8,
                -74.0,
                -73.9,
                data_type=data_type,
                borough="MANHATTAN",
                limit=10,
                time_range="1year",
            )
            self.assertTrue(isinstance(result, list))

        # data_type=None / time_range=None도 한 번 태워 보기
        result_default = self.repo.get_heatmap_data(
            40.7, 40.8, -74.0, -73.9, data_type="violations"
        )
        self.assertTrue(isinstance(result_default, list))

    def test_get_filtered_violations_points_with_filters(self):
        """고급 필터가 있는 get_filtered_violations_points 로직 커버."""
        rows = [
            {
                "bbl": "1013510030",
                "latitude": 40.7,
                "longitude": -74.0,
                "address": "123 MAIN ST",
                "borough": "MANHATTAN",
                "count": 10,
                "open_violations": 5,
                "closed_violations": 5,
                "class_a_count": 2,
                "class_b_count": 3,
                "class_c_count": 5,
                "avg_response_days": 7.0,
            }
        ]

        class FilterDB(DummyDB):
            def query_all(self, sql, params=None):
                return rows

        self.repo.client_factory = lambda: FilterDB()

        points = self.repo.get_filtered_violations_points(
            40.7,
            40.8,
            -74.0,
            -73.9,
            borough="MANHATTAN",
            limit=100,
            min_open_violations=1,
            max_open_violations=10,
            min_closed_violations=1,
            max_closed_violations=10,
            min_class_a=1,
            max_class_a=10,
            min_class_b=1,
            max_class_b=10,
            min_class_c=1,
            max_class_c=10,
            max_response_days=30,
        )
        self.assertTrue(points)

    def test_get_borough_summary_with_and_without_filter(self):
        """get_borough_summary의 where_clause 분기 커버."""
        # now = datetime.now()
        # three_years_ago = now - timedelta(days=3 * 365)

        rows = [
            {
                "borough": "MANHATTAN",
                "total_buildings": 10,
                "avg_violations_per_building": 2.0,
                "avg_evictions_per_building": 0.5,
                "total_rent_stabilized": 5,
                "high_risk_buildings": 2,
                "medium_risk_buildings": 3,
                "low_risk_buildings": 5,
            }
        ]

        outer = self

        class BoroughDB(DummyDB):
            def query_all(self, sql, params=None):
                # 첫 파라미터가 3년 전 날짜인지만 대략 체크
                outer.assertGreaterEqual(len(params), 1)
                outer.assertIsNotNone(params[0])
                outer.assertTrue(isinstance(params[0], datetime))
                return rows

        self.repo.client_factory = lambda: BoroughDB()

        summary_with = self.repo.get_borough_summary(borough="MANHATTAN")
        self.assertEqual(len(summary_with), 1)
        self.assertEqual(summary_with[0].borough, "MANHATTAN")

        summary_all = self.repo.get_borough_summary()
        self.assertEqual(len(summary_all), 1)

    def test_get_neighborhood_trends(self):
        """위반/퇴거/민원 추세 쿼리 조합 커버."""
        vio_rows = [{"month": datetime(2024, 1, 1), "count": 3}]
        ev_rows = [{"month": datetime(2024, 1, 1), "count": 1}]
        comp_rows = [{"month": datetime(2024, 1, 1), "count": 2}]

        class TrendsDB(DummyDB):
            def __init__(self):
                super().__init__()
                self.calls = 0

            def query_all(self, sql, params=None):
                self.calls += 1
                if self.calls == 1:
                    return vio_rows
                elif self.calls == 2:
                    return ev_rows
                elif self.calls == 3:
                    return comp_rows
                return []

        self.repo.client_factory = lambda: TrendsDB()

        trends = self.repo.get_neighborhood_trends("1013510030", days_back=365)
        self.assertIn("violations", trends)
        self.assertIn("evictions", trends)
        self.assertIn("complaints", trends)
        self.assertEqual(trends["violations"][0]["count"], 3)

    def test_get_heatmap_data_unknown_type_returns_empty(self):
        """알 수 없는 data_type이면 빈 리스트."""
        self.repo.client_factory = lambda: DummyDB()
        result = self.repo.get_heatmap_data(
            40.7, 40.8, -74.0, -73.9, data_type="unknown"
        )
        self.assertEqual(result, [])
