#!/usr/bin/env bash
# Creates the two test users in your Cognito User Pool and links their sub IDs to Postgres.
# Run this once after completing docs/boot-camp/cognito-setup.md.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}!${NC} $*" >&2; }
fail() { echo -e "${RED}✗${NC} $*" >&2; exit 1; }

# ── Load .env ─────────────────────────────────────────────────────────────────
if [[ -f .env ]]; then
  set -o allexport
  # shellcheck disable=SC1091
  source .env
  set +o allexport
fi

# AWS_ENDPOINT_URL (if set for LocalStack S3/SES exercises) must not redirect
# Cognito calls to LocalStack — Cognito is a Pro feature there. Always use real AWS.
unset AWS_ENDPOINT_URL

# ── Validate required vars ─────────────────────────────────────────────────────
[[ -z "${COGNITO_USER_POOL_ID:-}" ]] && fail "COGNITO_USER_POOL_ID not set in .env — see docs/boot-camp/cognito-setup.md"
[[ -z "${COGNITO_CLIENT_ID:-}" ]]    && fail "COGNITO_CLIENT_ID not set in .env — see docs/boot-camp/cognito-setup.md"

REGION="${AWS_REGION:-us-east-1}"

echo ""
echo "  Seeding Cognito User Pool: $COGNITO_USER_POOL_ID"
echo "  Region: $REGION"
echo ""

# ── Helper: create a user and return their Cognito sub ────────────────────────
seed_user() {
  local email="$1"
  local password="$2"

  # Create user — suppress the welcome email, ignore "already exists"
  aws cognito-idp admin-create-user \
    --region "$REGION" \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$email" \
    --user-attributes Name=email,Value="$email" Name=email_verified,Value=true \
    --message-action SUPPRESS \
    --output text > /dev/null 2>&1 || warn "$email already exists in Cognito — updating password"

  # Set permanent password (moves user out of FORCE_CHANGE_PASSWORD state)
  aws cognito-idp admin-set-user-password \
    --region "$REGION" \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$email" \
    --password "$password" \
    --permanent

  # Return the Cognito sub UUID
  aws cognito-idp admin-get-user \
    --region "$REGION" \
    --user-pool-id "$COGNITO_USER_POOL_ID" \
    --username "$email" \
    --query 'UserAttributes[?Name==`sub`].Value' \
    --output text
}

# ── Seed users ─────────────────────────────────────────────────────────────────
UUID_RE='^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'

PARTICIPANT_SUB=$(seed_user "participant@example.com" "Bootcamp1!")
[[ "$PARTICIPANT_SUB" =~ $UUID_RE ]] || fail "Unexpected Cognito sub format for participant (got: $PARTICIPANT_SUB)"
ok "participant@example.com — seeded"

ADMIN_SUB=$(seed_user "admin@example.com" "Bootcamp1!")
[[ "$ADMIN_SUB" =~ $UUID_RE ]] || fail "Unexpected Cognito sub format for admin (got: $ADMIN_SUB)"
ok "admin@example.com      — seeded"

# ── Link subs to Postgres ──────────────────────────────────────────────────────
echo ""
echo "Linking Cognito subs to Postgres..."

# Verify the users table exists before attempting the update
TABLE_EXISTS=$(docker compose exec -T postgres psql -U bootcamp -d bootcamp -tAc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users');")

if [[ "$TABLE_EXISTS" != "t" ]]; then
  fail "Postgres 'users' table not found. Run 'npm run db:migrate && npm run db:seed' first, then re-run this script."
fi

# In CI, postgres is a service container — psql connects via DATABASE_URL.
# In local dev without psql, fall back to docker compose exec.
# Use psql -v for safe parameterised substitution (no SQL injection via sub values).
UPDATE_SQL="UPDATE users SET cognito_sub = :'p_sub' WHERE email = 'participant@example.com';
UPDATE users SET cognito_sub = :'a_sub' WHERE email = 'admin@example.com';"

if psql "${DATABASE_URL}" -c "SELECT 1;" > /dev/null 2>&1; then
  psql "${DATABASE_URL}" \
    -v "p_sub=${PARTICIPANT_SUB}" \
    -v "a_sub=${ADMIN_SUB}" \
    -c "$UPDATE_SQL"
else
  docker compose exec -T postgres psql -U bootcamp -d bootcamp \
    -v "p_sub=${PARTICIPANT_SUB}" \
    -v "a_sub=${ADMIN_SUB}" \
    -c "$UPDATE_SQL"
fi

ok "Postgres users linked to Cognito subs"

echo ""
echo "  Done!"
echo ""
