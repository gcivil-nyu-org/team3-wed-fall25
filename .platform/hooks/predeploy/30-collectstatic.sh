#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/app/staging"
cd "$APP_DIR/backend"

/var/app/venv/*/bin/python manage.py collectstatic --noinput
