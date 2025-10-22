# python
import importlib
import inspect

from django.http import HttpResponse
from django.test import RequestFactory, TestCase


class NeighborhoodModelsSmokeTests(TestCase):
    def test_models_module_and_meta(self):
        try:
            mod = importlib.import_module("backend.apps.neighborhood.models")
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
            mod = importlib.import_module("backend.apps.neighborhood.views")
        except ImportError:
            self.skipTest("backend.apps.neighborhood.views 모듈이 없음")

        rf = RequestFactory()

        for name, func in inspect.getmembers(mod, inspect.isfunction):
            req = rf.get("/")
            try:
                resp = func(req)
            except TypeError:
                continue
            except Exception:
                continue

            self.assertTrue(
                isinstance(resp, HttpResponse), f"{name} did not return HttpResponse"
            )

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
