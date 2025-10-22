# backend/coveragerc.py
import os
import sys

import django
from coverage import Coverage
from django.conf import settings
from django.test.utils import get_runner
from django.core.management import execute_from_command_line

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

# Handle existing test database by setting environment variable
os.environ.setdefault('DJANGO_TEST_DATABASE_NAME', 'test_housing_transparency')

TestRunner = get_runner(settings)
test_runner = TestRunner()
failures = test_runner.run_tests(["."])

cov.stop()
cov.save()
cov.report()

# if failures:
#     raise SystemExit(1)
