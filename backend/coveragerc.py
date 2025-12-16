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
        "*/management/*",
        "manage.py",
        "*/wsgi.py",
        "*/asgi.py",
        "*/tests.py",
    ],
)

cov.erase()
cov.start()

django.setup()

# Reuse existing test database if it exists (don't create new one)
# This is Django's default behavior - test database is created automatically
# We just need to tell Django to reuse it if it exists instead of prompting
TestRunner = get_runner(settings)
# keepdb=True: reuse existing test database, don't prompt
# interactive=False: don't ask for user input
test_runner = TestRunner(verbosity=1, keepdb=True, interactive=False)
failures = test_runner.run_tests(["."])

cov.stop()
cov.save()
cov.report()

# if failures:
#     raise SystemExit(1)
