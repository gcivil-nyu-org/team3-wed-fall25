#!/usr/bin/env bash
set -euxo pipefail
chmod -R a+rX /var/app/current/static
chmod -R a+rX /var/app/current/backend/static
chmod -R a+rX /var/app/current/backend/templates