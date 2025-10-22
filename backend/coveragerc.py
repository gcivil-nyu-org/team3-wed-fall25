# backend/coveragerc.py
import os

import django
from coverage import Coverage
from django.conf import settings
from django.test.utils import get_runner

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

cov = Coverage(
    branch=True,
    source=["apps", "infrastructures", "common", "config"],
    omit=[
        "*/migrations/*",
        "manage.py",
        "*/wsgi.py",
        "*/asgi.py",
        "crawlers/*",
    ],
)

cov.erase()
cov.start()

django.setup()

TestRunner = get_runner(settings)
test_runner = TestRunner()
failures = test_runner.run_tests(["."])

cov.stop()
cov.save()
cov.report()

# if failures:
#     raise SystemExit(1)
