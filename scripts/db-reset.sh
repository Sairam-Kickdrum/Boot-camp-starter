#!/usr/bin/env bash
set -euo pipefail

echo "→ Resetting database..."
PGPASSWORD=bootcamp psql -h localhost -U bootcamp -d postgres -c \
  "DROP DATABASE IF EXISTS bootcamp; CREATE DATABASE bootcamp;" 2>/dev/null || true

echo "→ Running migrations..."
npm run db:migrate --prefix "$(dirname "$0")/.."

echo "→ Seeding..."
npm run db:seed --prefix "$(dirname "$0")/.."

echo "✓ Database reset complete."
