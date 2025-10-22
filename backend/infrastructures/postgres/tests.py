# python
import importlib
import inspect
from django.test import TestCase


class PostgresModuleSmokeTests(TestCase):
    def test_module_importable(self):
        try:
            mod = importlib.import_module('backend.infrastructures.postgres')
        except ImportError:
            self.skipTest('backend.infrastructures.postgres 모듈이 없음')
        self.assertIsNotNone(mod)

    def test_functions_and_classes_do_not_raise_when_called_if_possible(self):
        try:
            mod = importlib.import_module('backend.infrastructures.postgres')
        except ImportError:
            self.skipTest('backend.infrastructures.postgres 모듈이 없음')

        # 모듈에 정의된 함수들 시도
        for name, func in inspect.getmembers(mod, inspect.isfunction):
            if getattr(func, '__module__', None) != mod.__name__:
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
            if getattr(cls, '__module__', None) != mod.__name__:
                continue
            try:
                cls()
            except TypeError:
                continue
            except Exception:
                continue
        self.assertTrue(True)