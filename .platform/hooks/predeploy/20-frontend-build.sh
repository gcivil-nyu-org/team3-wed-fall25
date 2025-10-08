#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/var/app/staging"
cd "$APP_DIR/frontend"

npm ci
npm run build  # tsc -b && vite predeploy && node copy-index.cjs

ls -la "$APP_DIR/backend/static/_app" || true
ls -la "$APP_DIR/backend/templates" || true
