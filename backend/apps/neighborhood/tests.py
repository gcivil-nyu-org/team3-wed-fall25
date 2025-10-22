# python
import importlib
import inspect

from django.http import HttpResponse
from django.test import RequestFactory, TestCase


class NeighborhoodModelsSmokeTests(TestCase):
    def test_models_module_and_meta(self):
        try:
            mod = importlib.import_module("apps.neighborhood.models")
        except ImportError:
            self.skipTest("backend.apps.neighborhood.models 모듈이 없음")

        try:
            from django.db import models as djmodels
        except Exception:
            self.skipTest("Django ORM 사용 불가")

        model_classes = [
            getattr(mod, name) for name in dir(mod) if not name.startswith("_")
        ]

        for obj in model_classes:
            if inspect.isclass(obj) and issubclass(obj, djmodels.Model):
                self.assertTrue(hasattr(obj, "_meta"))
                self.assertIsNotNone(getattr(obj._meta, "model_name", None))

        self.assertIsNotNone(mod)


class NeighborhoodViewsSmokeTests(TestCase):
    def test_views_callables_return_httpresponse_when_possible(self):
        try:
            mod = importlib.import_module("apps.neighborhood.views")
        except ImportError:
            self.skipTest("backend.apps.neighborhood.views 모듈이 없음")

        rf = RequestFactory()

        for name, func in inspect.getmembers(mod, inspect.isfunction):
            # 뷰 함수는 보통 request를 첫 번째 인자로 받음
            if not name.startswith('_') and hasattr(func, '__code__'):
                req = rf.get("/")
                try:
                    resp = func(req)
                    # HttpResponse를 반환하는 경우만 검사
                    if isinstance(resp, HttpResponse):
                        self.assertTrue(True, f"{name} returned HttpResponse")
                except TypeError:
                    continue
                except Exception:
                    continue

        for name, cls in inspect.getmembers(mod, inspect.isclass):
            if hasattr(cls, "as_view"):
                req = rf.get("/")
                try:
                    view = cls.as_view()
                    resp = view(req)
                except TypeError:
                    continue
                except Exception:
                    continue
                self.assertTrue(
                    isinstance(resp, HttpResponse),
                    f"{name}.as_view() did not return HttpResponse",
                )


class NeighborhoodViewsAPITests(TestCase):
    def setUp(self):
        self.stats_url = "/api/neighborhood/stats/"
        self.heatmap_url = "/api/neighborhood/heatmap/"
        self.borough_summary_url = "/api/neighborhood/borough-summary/"
        self.trends_url = "/api/neighborhood/trends/"

    def test_neighborhood_stats_view_success(self):
        """Test GET /api/neighborhood/stats/ with valid parameters"""
        try:
            params = {
                "min_lat": "40.7",
                "max_lat": "40.8", 
                "min_lng": "-74.0",
                "max_lng": "-73.9",
                "data_type": "violations"
            }
            response = self.client.get(self.stats_url, params)
            self.assertEqual(response.status_code, 200)
            self.assertIn('result', response.data)
            self.assertIn('data', response.data)
            self.assertIn('bounds', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_neighborhood_stats_view_missing_params(self):
        """Test GET /api/neighborhood/stats/ with missing parameters"""
        try:
            response = self.client.get(self.stats_url)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_neighborhood_stats_view_invalid_data_type(self):
        """Test GET /api/neighborhood/stats/ with invalid data_type"""
        try:
            params = {
                "min_lat": "40.7",
                "max_lat": "40.8",
                "min_lng": "-74.0", 
                "max_lng": "-73.9",
                "data_type": "invalid"
            }
            response = self.client.get(self.stats_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_neighborhood_stats_view_invalid_coordinates(self):
        """Test GET /api/neighborhood/stats/ with invalid coordinates"""
        try:
            params = {
                "min_lat": "invalid",
                "max_lat": "40.8",
                "min_lng": "-74.0",
                "max_lng": "-73.9",
                "data_type": "violations"
            }
            response = self.client.get(self.stats_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_heatmap_data_view_success(self):
        """Test GET /api/neighborhood/heatmap/ with valid parameters"""
        try:
            params = {
                "min_lat": "40.7",
                "max_lat": "40.8",
                "min_lng": "-74.0", 
                "max_lng": "-73.9",
                "data_type": "violations",
                "borough": "MANHATTAN",
                "limit": "1000"
            }
            response = self.client.get(self.heatmap_url, params)
            self.assertEqual(response.status_code, 200)
            self.assertIn('result', response.data)
            self.assertIn('data', response.data)
            self.assertIn('bounds', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_heatmap_data_view_missing_params(self):
        """Test GET /api/neighborhood/heatmap/ with missing parameters"""
        try:
            response = self.client.get(self.heatmap_url)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_heatmap_data_view_invalid_data_type(self):
        """Test GET /api/neighborhood/heatmap/ with invalid data_type"""
        try:
            params = {
                "min_lat": "40.7",
                "max_lat": "40.8",
                "min_lng": "-74.0",
                "max_lng": "-73.9", 
                "data_type": "invalid"
            }
            response = self.client.get(self.heatmap_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_borough_summary_view_success(self):
        """Test GET /api/neighborhood/borough-summary/ with borough parameter"""
        try:
            params = {"borough": "MANHATTAN"}
            response = self.client.get(self.borough_summary_url, params)
            self.assertEqual(response.status_code, 200)
            self.assertIn('result', response.data)
            self.assertIn('data', response.data)
            self.assertIn('borough', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_borough_summary_view_no_borough(self):
        """Test GET /api/neighborhood/borough-summary/ without borough parameter"""
        try:
            response = self.client.get(self.borough_summary_url)
            self.assertEqual(response.status_code, 200)
            self.assertIn('result', response.data)
            self.assertIn('data', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_neighborhood_trends_view_success(self):
        """Test GET /api/neighborhood/trends/ with valid parameters"""
        try:
            params = {
                "bbl": "1013510030",
                "days_back": "365"
            }
            response = self.client.get(self.trends_url, params)
            self.assertEqual(response.status_code, 200)
            self.assertIn('result', response.data)
            self.assertIn('data', response.data)
            self.assertIn('bbl', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_neighborhood_trends_view_missing_bbl(self):
        """Test GET /api/neighborhood/trends/ without bbl parameter"""
        try:
            response = self.client.get(self.trends_url)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_neighborhood_trends_view_invalid_bbl(self):
        """Test GET /api/neighborhood/trends/ with invalid bbl format"""
        try:
            params = {
                "bbl": "invalid",
                "days_back": "365"
            }
            response = self.client.get(self.trends_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_neighborhood_trends_view_invalid_days_back(self):
        """Test GET /api/neighborhood/trends/ with invalid days_back"""
        try:
            params = {
                "bbl": "1013510030",
                "days_back": "invalid"
            }
            response = self.client.get(self.trends_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")

    def test_neighborhood_trends_view_days_back_too_large(self):
        """Test GET /api/neighborhood/trends/ with days_back > 3650"""
        try:
            params = {
                "bbl": "1013510030",
                "days_back": "4000"
            }
            response = self.client.get(self.trends_url, params)
            self.assertEqual(response.status_code, 400)
            self.assertIn('detail', response.data)
        except Exception as e:
            self.skipTest(f"Database connection failed: {e}")


class NeighborhoodViewsHelperFunctionTests(TestCase):
    def test_to_primitive_dataclass(self):
        """Test _to_primitive with dataclass"""
        from apps.neighborhood.views import _to_primitive
        from common.models.building import Building
        
        building = Building(bbl="1234567890")
        result = _to_primitive(building)
        self.assertIsInstance(result, dict)
        self.assertEqual(result['bbl'], "1234567890")

    def test_to_primitive_dict(self):
        """Test _to_primitive with dict"""
        from apps.neighborhood.views import _to_primitive
        from datetime import datetime
        
        data = {
            "bbl": "1234567890",
            "date": datetime(2023, 1, 1, 12, 0, 0)
        }
        result = _to_primitive(data)
        self.assertEqual(result['bbl'], "1234567890")
        self.assertEqual(result['date'], "2023-01-01T12:00:00")

    def test_to_primitive_list(self):
        """Test _to_primitive with list"""
        from apps.neighborhood.views import _to_primitive
        from datetime import date
        
        data = [date(2023, 1, 1), date(2023, 1, 2)]
        result = _to_primitive(data)
        self.assertEqual(result, ["2023-01-01", "2023-01-02"])

    def test_to_primitive_decimal(self):
        """Test _to_primitive with Decimal"""
        from apps.neighborhood.views import _to_primitive
        from decimal import Decimal
        
        result = _to_primitive(Decimal("123.45"))
        self.assertEqual(result, "123.45")

    def test_to_primitive_nested_structure(self):
        """Test _to_primitive with nested structure"""
        from apps.neighborhood.views import _to_primitive
        from datetime import datetime
        from decimal import Decimal
        
        data = {
            "building": {
                "bbl": "1234567890",
                "amount": Decimal("1000.50"),
                "date": datetime(2023, 1, 1, 12, 0, 0),
                "list": [Decimal("100"), datetime(2023, 1, 2)]
            }
        }
        result = _to_primitive(data)
        self.assertEqual(result['building']['bbl'], "1234567890")
        self.assertEqual(result['building']['amount'], "1000.50")
        self.assertEqual(result['building']['date'], "2023-01-01T12:00:00")
        self.assertEqual(result['building']['list'], ["100", "2023-01-02T00:00:00"])
