#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [ ! -f ".env" ]; then
  echo "Error: .env file not found in $(pwd)"
  echo "Copy .env.example to .env and set VITE_API_BASE_URL, HOST, and PORT."
  exit 1
fi

set -a
source .env
set +a

if [ -z "${VITE_API_BASE_URL:-}" ]; then
  echo "Error: VITE_API_BASE_URL is not set in .env"
  exit 1
fi

npm install
npm run build
exec npm run preview -- --host "${HOST:-0.0.0.0}" --port "${PORT:-5173}"
