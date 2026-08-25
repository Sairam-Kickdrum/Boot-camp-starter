#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# ── colours ──────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*"; }
fail() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

echo ""
echo "  Boot Camp Starter — bootstrap"
echo "  ────────────────────────────"
echo ""

# ── pre-flight checks ─────────────────────────────────────────────────────────
check_cmd() {
  command -v "$1" &>/dev/null || fail "Required: $1 not found. Install it and re-run."
}
check_version() {
  local cmd="$1" flag="$2" min="$3" actual
  actual="$($cmd $flag 2>&1 | grep -oE '[0-9]+\.[0-9]+' | head -1)"
  local major; major="${actual%%.*}"
  [[ "$major" -ge "$min" ]] || fail "$cmd >= $min required (found $actual)."
}

echo "Checking prerequisites..."
check_cmd node
check_cmd npm
check_cmd docker

check_version node --version 20
check_version npm --version 9

ok "Prerequisites OK (node=$(node -v), npm=$(npm -v))"

# ── .env setup ────────────────────────────────────────────────────────────────
if [[ ! -f .env ]]; then
  # Cohort participants: copy .env.cohort.example and fill in the Cognito values
  # from your facilitator before running this script.
  # Local dev: copy .env.example and follow docs/boot-camp/cognito-setup.md.
  if [[ -f .env.cohort.example ]]; then
    cp .env.example .env
    ok "Created .env from .env.example — if you are a cohort participant, copy .env.cohort.example to .env instead and fill in your Cognito values"
  else
    cp .env.example .env
    ok "Created .env from .env.example"
  fi
else
  warn ".env already exists — skipping copy"
fi

# ── npm install ───────────────────────────────────────────────────────────────
echo ""
echo "Installing dependencies..."
npm install --silent
ok "Dependencies installed"

# ── Docker services ───────────────────────────────────────────────────────────
echo ""
echo "Starting Docker services (postgres + localstack)..."
docker compose up -d

echo -n "Waiting for Postgres..."
for i in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U bootcamp &>/dev/null && break
  echo -n "."
  sleep 2
done
echo ""
ok "Postgres ready"

# LocalStack starts in the background — needed for exercise 3 (S3) and exercise 7 (SES).
# We don't block on it here; run `docker compose ps` to check when you need it.

# ── DB migrate + seed ─────────────────────────────────────────────────────────
echo ""
echo "Running database migrations..."
npm run db:migrate

echo "Seeding database..."
npm run db:seed

ok "Database ready"

# ── done ─────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Bootstrap complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Start the app:"
echo "    npm run dev"
echo ""
echo "  Open in browser:"
echo "    http://localhost:5173"
echo ""

if grep -q "COGNITO_USER_POOL_ID=<provided" .env 2>/dev/null; then
  echo "  Next step (cohort participant):"
  echo "    Fill in COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in .env"
  echo "    with the values provided by your facilitator, then run:"
  echo "    npm run dev"
  echo ""
  echo "  Log in at http://localhost:5173 with the credentials your facilitator sent."
else
  echo "  Next step (local dev — if not done yet):"
  echo "    Fill in COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in .env"
  echo "    then run:  ./scripts/seed-cognito.sh"
  echo ""
  echo "  Test credentials (after seed-cognito.sh):"
  echo "    Email:    participant@example.com"
  echo "    Password: Bootcamp1!"
fi
echo ""
