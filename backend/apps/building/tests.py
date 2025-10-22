# Create your tests here.
# python
import importlib
import inspect
from django.test import TestCase, RequestFactory
from django.http import HttpResponse


class ModelsSmokeTests(TestCase):
    def test_models_module_and_meta(self):
        try:
            mod = importlib.import_module('backend.apps.building.models')
        except ImportError:
            self.skipTest('backend.apps.building.models 모듈이 없음')

        # Django 모델 클래스인지 검사
        try:
            from django.db import models as djmodels
        except Exception:
            self.skipTest('Django ORM 사용 불가')

        model_classes = [
            getattr(mod, name)
            for name in dir(mod)
            if not name.startswith('_')
        ]

        for obj in model_classes:
            if inspect.isclass(obj) and issubclass(obj, djmodels.Model):
                self.assertTrue(hasattr(obj, '_meta'))
                self.assertIsNotNone(getattr(obj._meta, 'model_name', None))
        self.assertTrue(mod is not None)


class ViewsSmokeTests(TestCase):
    def test_views_callables_return_httpresponse_when_possible(self):
        try:
            mod = importlib.import_module('backend.apps.building.views')
        except ImportError:
            self.skipTest('backend.apps.building.views 모듈이 없음')

        rf = RequestFactory()
        # 함수형 뷰 검사
        for name, func in inspect.getmembers(mod, inspect.isfunction):
            req = rf.get('/')
            try:
                resp = func(req)
            except TypeError:
                # 인자가 달라서 호출 불가하면 건너뜀
                continue
            except Exception:
                # 뷰 내부에서 예외가 나면 테스트를 실패시키지 않고 건너뜀
                continue

            self.assertTrue(isinstance(resp, HttpResponse), f'{name} did not return HttpResponse')

        # 클래스 기반 뷰 검사 (as_view 제공하는 클래스)
        for name, cls in inspect.getmembers(mod, inspect.isclass):
            if hasattr(cls, 'as_view'):
                req = rf.get('/')
                try:
                    view = cls.as_view()
                    resp = view(req)
                except TypeError:
                    continue
                except Exception:
                    continue
                self.assertTrue(isinstance(resp, HttpResponse), f'{name}.as_view() did not return HttpResponse')
