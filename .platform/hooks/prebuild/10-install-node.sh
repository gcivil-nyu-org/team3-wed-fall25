#!/usr/bin/env bash
set -euo pipefail

curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs
node -v
npm -v
