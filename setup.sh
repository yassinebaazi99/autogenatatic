#!/usr/bin/env bash
# Nivara installer — macOS / Linux.
#   ./setup.sh           full install + DB migrate
#   ./setup.sh --seed    also load the test corpus
#   ./setup.sh --reset   drop & recreate the DB
#
# If it isn't executable yet:  chmod +x setup.sh
set -euo pipefail

# Always run from the directory this script lives in (the project root).
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "✗ Node.js is not installed or not on your PATH."
  echo "  Install Node 20+ from https://nodejs.org or:  nvm install 20 && nvm use 20"
  exit 1
fi

exec node scripts/setup.mjs "$@"
