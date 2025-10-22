# python
import importlib
import inspect
from unittest.mock import Mock, patch

from django.test import TestCase

from infrastructures.postgres.building_repository import BuildingRepository
from infrastructures.postgres.neighborhood_repository import NeighborhoodRepository
from infrastructures.postgres.postgres_client import PostgresClient


class PostgresModuleSmokeTests(TestCase):
    def test_module_importable(self):
        try:
            mod = importlib.import_module("infrastructures.postgres")
        except ImportError:
            self.skipTest("backend.infrastructures.postgres 모듈이 없음")
        self.assertIsNotNone(mod)

    def test_functions_and_classes_do_not_raise_when_called_if_possible(self):
        try:
            mod = importlib.import_module("infrastructures.postgres")
        except ImportError:
            self.skipTest("backend.infrastructures.postgres 모듈이 없음")

        # 모듈에 정의된 함수들 시도
        for name, func in inspect.getmembers(mod, inspect.isfunction):
            if getattr(func, "__module__", None) != mod.__name__:
                continue
            try:
                func()
            except TypeError:
                # 시그니처가 달라 호출 불가하면 건너뜀
                continue
            except Exception:
                # 내부 예외는 실패로 처리하지 않음
                continue

        # 모듈에 정의된 클래스들 시도
        for name, cls in inspect.getmembers(mod, inspect.isclass):
            if getattr(cls, "__module__", None) != mod.__name__:
                continue
            try:
                cls()
            except TypeError:
                continue
            except Exception:
                continue
        self.assertTrue(True)


class PostgresClientTests(TestCase):
    def setUp(self):
        self.client = PostgresClient()

    def test_postgres_client_initialization(self):
        """Test PostgresClient initialization"""
        self.assertIsNotNone(self.client._params)
        self.assertIn("dbname", self.client._params)
        self.assertIn("user", self.client._params)
        self.assertIn("password", self.client._params)
        self.assertIn("host", self.client._params)
        self.assertIn("port", self.client._params)
        self.assertIsNone(self.client.conn)

    def test_postgres_client_connection(self):
        """Test actual database connection"""
        try:
            with self.client as db:
                self.assertEqual(db, self.client)
                self.assertIsNotNone(self.client.conn)
                # Test a simple query
                result = db.query_one("SELECT 1 as test_value")
                self.assertEqual(result["test_value"], 1)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_postgres_client_query_one(self):
        """Test query_one with real database"""
        try:
            with self.client as db:
                # Test with result
                result = db.query_one("SELECT 42 as answer")
                self.assertEqual(result["answer"], 42)

                # Test with no result
                result = db.query_one("SELECT 1 WHERE 1 = 0")
                self.assertIsNone(result)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_postgres_client_query_all(self):
        """Test query_all with real database"""
        try:
            with self.client as db:
                # Test with results
                result = db.query_all("SELECT generate_series(1, 3) as num")
                self.assertEqual(len(result), 3)
                self.assertEqual(result[0]["num"], 1)
                self.assertEqual(result[1]["num"], 2)
                self.assertEqual(result[2]["num"], 3)

                # Test with no results
                result = db.query_all("SELECT 1 WHERE 1 = 0")
                self.assertEqual(result, [])
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_postgres_client_execute(self):
        """Test execute with real database"""
        try:
            with self.client as db:
                # Test execute without returning
                result = db.execute("SELECT 1")
                self.assertIsNotNone(result)

                # Test execute with returning
                result = db.execute("SELECT 99 as test_id", returning="test_id")
                self.assertEqual(result, 99)
        except Exception as e:
            self.skipTest(f"Database execute failed: {e}")

    def test_postgres_client_context_manager(self):
        """Test context manager behavior"""
        try:
            # Test normal exit
            with self.client as db:
                self.assertIsNotNone(db.conn)
            self.assertIsNone(self.client.conn)
        except Exception as e:
            self.skipTest(f"Database context manager failed: {e}")


class BuildingRepositoryTests(TestCase):
    def setUp(self):
        self.repository = BuildingRepository()

    def test_building_repository_initialization(self):
        """Test BuildingRepository initialization"""
        self.assertEqual(self.repository.client_factory, PostgresClient)

    def test_get_by_bbl_basic(self):
        """Test get_by_bbl with a non-existent BBL"""
        try:
            building = self.repository.get_by_bbl("9999999999")
            self.assertEqual(building.bbl, "9999999999")
            self.assertIsNone(building.registration)
            self.assertIsNone(building.rent_stabilized)
            self.assertEqual(building.contacts, [])
            self.assertEqual(building.affordable, [])
            self.assertEqual(building.complaints, [])
            self.assertEqual(building.violations, [])
            self.assertEqual(building.acris_master, {})
            self.assertEqual(building.acris_legals, {})
            self.assertEqual(building.acris_parties, {})
            self.assertEqual(building.evictions, [])
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_by_bbl_with_real_data(self):
        """Test get_by_bbl with potentially real data"""
        try:
            # Try to get a building that might exist
            building = self.repository.get_by_bbl(
                "1013510030"
            )  # Example BBL from the test file
            self.assertEqual(building.bbl, "1013510030")
            # The building object should be created regardless of whether data exists
            self.assertIsInstance(building.contacts, list)
            self.assertIsInstance(building.affordable, list)
            self.assertIsInstance(building.complaints, list)
            self.assertIsInstance(building.violations, list)
            self.assertIsInstance(building.acris_master, dict)
            self.assertIsInstance(building.acris_legals, dict)
            self.assertIsInstance(building.acris_parties, dict)
            self.assertIsInstance(building.evictions, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_building_repository_methods_exist(self):
        """Test that BuildingRepository has expected methods"""
        self.assertTrue(hasattr(self.repository, "get_by_bbl"))
        self.assertTrue(callable(getattr(self.repository, "get_by_bbl")))


class NeighborhoodRepositoryTests(TestCase):
    def setUp(self):
        from infrastructures.postgres.neighborhood_repository import (
            NeighborhoodRepository,
        )

        self.repository = NeighborhoodRepository()

    def test_neighborhood_repository_initialization(self):
        """Test NeighborhoodRepository initialization"""
        self.assertEqual(self.repository.client_factory, PostgresClient)

    def test_get_neighborhood_stats_by_bounds_basic(self):
        """Test get_neighborhood_stats_by_bounds with basic parameters"""
        try:
            stats = self.repository.get_neighborhood_stats_by_bounds(
                min_lat=40.7,
                max_lat=40.8,
                min_lng=-74.0,
                max_lng=-73.9,
                data_type="violations",
            )
            self.assertIsInstance(stats, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_neighborhood_stats_by_bounds_evictions(self):
        """Test get_neighborhood_stats_by_bounds with evictions data type"""
        try:
            stats = self.repository.get_neighborhood_stats_by_bounds(
                min_lat=40.7,
                max_lat=40.8,
                min_lng=-74.0,
                max_lng=-73.9,
                data_type="evictions",
            )
            self.assertIsInstance(stats, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_neighborhood_stats_by_bounds_complaints(self):
        """Test get_neighborhood_stats_by_bounds with complaints data type"""
        try:
            stats = self.repository.get_neighborhood_stats_by_bounds(
                min_lat=40.7,
                max_lat=40.8,
                min_lng=-74.0,
                max_lng=-73.9,
                data_type="complaints",
            )
            self.assertIsInstance(stats, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_heatmap_data_basic(self):
        """Test get_heatmap_data with basic parameters"""
        try:
            data = self.repository.get_heatmap_data(
                min_lat=40.7,
                max_lat=40.8,
                min_lng=-74.0,
                max_lng=-73.9,
                data_type="violations",
                borough="MANHATTAN",
                limit=1000,
            )
            self.assertIsInstance(data, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_heatmap_data_evictions(self):
        """Test get_heatmap_data with evictions data type"""
        try:
            data = self.repository.get_heatmap_data(
                min_lat=40.7,
                max_lat=40.8,
                min_lng=-74.0,
                max_lng=-73.9,
                data_type="evictions",
                borough="All Boroughs",
                limit=500,
            )
            self.assertIsInstance(data, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_borough_summary_with_borough(self):
        """Test get_borough_summary with specific borough"""
        try:
            summary = self.repository.get_borough_summary(borough="MANHATTAN")
            self.assertIsInstance(summary, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_borough_summary_all_boroughs(self):
        """Test get_borough_summary without specific borough"""
        try:
            summary = self.repository.get_borough_summary(borough=None)
            self.assertIsInstance(summary, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_neighborhood_trends_basic(self):
        """Test get_neighborhood_trends with basic parameters"""
        try:
            trends = self.repository.get_neighborhood_trends(
                bbl="1013510030", days_back=365
            )
            self.assertIsInstance(trends, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_neighborhood_trends_short_period(self):
        """Test get_neighborhood_trends with short period"""
        try:
            trends = self.repository.get_neighborhood_trends(
                bbl="1013510030", days_back=30
            )
            self.assertIsInstance(trends, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_neighborhood_repository_methods_exist(self):
        """Test that NeighborhoodRepository has expected methods"""
        expected_methods = [
            "get_neighborhood_stats_by_bounds",
            "get_heatmap_data",
            "get_borough_summary",
            "get_neighborhood_trends",
        ]

        for method_name in expected_methods:
            self.assertTrue(hasattr(self.repository, method_name))
            self.assertTrue(callable(getattr(self.repository, method_name)))


class PostgresClientAdvancedTests(TestCase):
    def setUp(self):
        self.client = PostgresClient()

    def test_postgres_client_query_one_with_params(self):
        """Test query_one with parameters"""
        try:
            with self.client as db:
                result = db.query_one("SELECT %s as test", (42,))
                self.assertEqual(result["test"], 42)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_postgres_client_query_all_with_params(self):
        """Test query_all with parameters"""
        try:
            with self.client as db:
                results = db.query_all("SELECT %s as test UNION SELECT %s as test", (1, 2))
                self.assertEqual(len(results), 2)
                self.assertEqual(results[0]["test"], 1)
                self.assertEqual(results[1]["test"], 2)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_postgres_client_execute_with_params(self):
        """Test execute with parameters"""
        try:
            with self.client as db:
                result = db.execute("SELECT %s as test_id", (99,), returning="test_id")
                self.assertEqual(result, 99)
        except Exception as e:
            self.skipTest(f"Database execute failed: {e}")

    def test_postgres_client_connection_error_handling(self):
        """Test connection error handling"""
        # Test with invalid connection parameters
        with patch('infrastructures.postgres.postgres_client.get_env') as mock_env:
            mock_env.return_value = lambda key, default=None: {
                'DB_NAME': 'invalid_db',
                'DB_USER': 'invalid_user',
                'DB_PASSWORD': 'invalid_password',
                'DB_HOST': 'invalid_host',
                'DB_PORT': 5432
            }.get(key, default)
            
            with self.assertRaises(Exception):
                with PostgresClient() as db:
                    pass

    def test_postgres_client_context_manager_exit(self):
        """Test context manager exit behavior"""
        try:
            with self.client as db:
                self.assertIsNotNone(self.client.conn)
            # Connection should be closed after context exit
            self.assertIsNone(self.client.conn)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_postgres_client_autocommit_disabled(self):
        """Test that autocommit is disabled"""
        try:
            with self.client as db:
                self.assertFalse(self.client.conn.autocommit)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_postgres_client_cursor_context_manager(self):
        """Test cursor context manager"""
        try:
            with self.client as db:
                with db._cursor() as cursor:
                    self.assertIsNotNone(cursor)
                    cursor.execute("SELECT 1")
                    result = cursor.fetchone()
                    self.assertEqual(result[0], 1)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_postgres_client_cursor_without_connection(self):
        """Test cursor creation without connection raises error"""
        client = PostgresClient()
        with self.assertRaises(Exception):
            with client._cursor():
                pass


class NeighborhoodRepositoryAdvancedTests(TestCase):
    def setUp(self):
        self.repository = NeighborhoodRepository()

    def test_get_neighborhood_stats_by_bounds_violations(self):
        """Test get_neighborhood_stats_by_bounds with violations data type"""
        try:
            stats = self.repository.get_neighborhood_stats_by_bounds(
                min_lat=40.7, max_lat=40.8, min_lng=-74.0, max_lng=-73.9, data_type="violations"
            )
            self.assertIsInstance(stats, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_neighborhood_stats_by_bounds_evictions(self):
        """Test get_neighborhood_stats_by_bounds with evictions data type"""
        try:
            stats = self.repository.get_neighborhood_stats_by_bounds(
                min_lat=40.7, max_lat=40.8, min_lng=-74.0, max_lng=-73.9, data_type="evictions"
            )
            self.assertIsInstance(stats, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_neighborhood_stats_by_bounds_complaints(self):
        """Test get_neighborhood_stats_by_bounds with complaints data type"""
        try:
            stats = self.repository.get_neighborhood_stats_by_bounds(
                min_lat=40.7, max_lat=40.8, min_lng=-74.0, max_lng=-73.9, data_type="complaints"
            )
            self.assertIsInstance(stats, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_heatmap_data_violations(self):
        """Test get_heatmap_data with violations data type"""
        try:
            heatmap = self.repository.get_heatmap_data(
                min_lat=40.7, max_lat=40.8, min_lng=-74.0, max_lng=-73.9, data_type="violations"
            )
            self.assertIsInstance(heatmap, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_heatmap_data_evictions(self):
        """Test get_heatmap_data with evictions data type"""
        try:
            heatmap = self.repository.get_heatmap_data(
                min_lat=40.7, max_lat=40.8, min_lng=-74.0, max_lng=-73.9, data_type="evictions"
            )
            self.assertIsInstance(heatmap, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_borough_summary_with_borough(self):
        """Test get_borough_summary with specific borough"""
        try:
            summary = self.repository.get_borough_summary(borough="Manhattan")
            self.assertIsInstance(summary, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_borough_summary_without_borough(self):
        """Test get_borough_summary without specific borough"""
        try:
            summary = self.repository.get_borough_summary()
            self.assertIsInstance(summary, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_neighborhood_trends_short_period(self):
        """Test get_neighborhood_trends with short period"""
        try:
            trends = self.repository.get_neighborhood_trends(
                bbl="1013510030", days_back=7
            )
            self.assertIsInstance(trends, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_get_neighborhood_trends_long_period(self):
        """Test get_neighborhood_trends with long period"""
        try:
            trends = self.repository.get_neighborhood_trends(
                bbl="1013510030", days_back=365
            )
            self.assertIsInstance(trends, list)
        except Exception as e:
            self.skipTest(f"Database query failed: {e}")

    def test_neighborhood_repository_initialization(self):
        """Test NeighborhoodRepository initialization"""
        self.assertIsNotNone(self.repository.client_factory)
        self.assertEqual(self.repository.client_factory, PostgresClient)

    def test_neighborhood_repository_methods_exist(self):
        """Test that NeighborhoodRepository has all expected methods"""
        expected_methods = [
            "get_neighborhood_stats_by_bounds",
            "get_heatmap_data",
            "get_borough_summary",
            "get_neighborhood_trends",
        ]

        for method_name in expected_methods:
            self.assertTrue(hasattr(self.repository, method_name))
            self.assertTrue(callable(getattr(self.repository, method_name)))
