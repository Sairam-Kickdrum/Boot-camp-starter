# Local Setup & End-to-End Verification

This document walks you through setting up the boot camp starter for the first time and verifying that every layer of the stack is working correctly. Follow every section in order — each step builds on the previous one.

**Time to complete:** ~10 minutes on a typical developer laptop (mostly waiting for Docker pulls on the first run).

> **Auth note:** The app uses **AWS Cognito User Pools** for authentication. You need an AWS account and a Cognito User Pool configured before you can log in. Follow `docs/boot-camp/cognito-setup.md` after bootstrapping. LocalStack runs in the background only for exercises that need S3 or SES (exercises 3 and 7).

---

## 1. Prerequisites

Check each of these before running anything else. The bootstrap script will fail with a clear error if something is missing.

| Tool | Minimum version | How to check |
|------|----------------|--------------|
| Node.js | 20.x (24.x recommended) | `node --version` |
| npm | 9.x | `npm --version` |
| Docker Desktop | Any recent | `docker --version` and confirm Docker Desktop is running |

**Node 20+** is required (Node 24 recommended). If you have an older version, use `nvm` or `fnm` to switch:
```bash
nvm install 24 && nvm use 24
node --version   # should print v24.x.x
```

**Docker Desktop must be running** before you start. Check the whale icon in your menu bar.

---

## 2. Clone the repo

```bash
git clone <repo-url> boot-camp-starter
cd boot-camp-starter
```

If you're working within the `ai-foundry` monorepo, navigate into the subfolder:
```bash
cd boot-camp-starter
```

Confirm you're in the right place:
```bash
ls package.json CLAUDE.md docker-compose.yml
# should list all three — if not, you're in the wrong directory
```

---

## 3. Generate the initial database migration

**Required before running bootstrap.** The bootstrap script runs `npm run db:migrate`, which needs at least one migration file. The migration file is generated from the Drizzle schema and is not committed to the repo, so you create it once:

```bash
# Install dependencies first (bootstrap also does this, but db:generate needs them)
npm install

# Generate the migration from db/schema/index.ts
npm run db:generate
```

Expected output:
```
1 migration(s) generated
```

Verify the file exists:
```bash
ls db/migrations/
# should list at least one .sql file (e.g. 0000_initial_schema.sql)
```

---

## 4. Run bootstrap

```bash
./scripts/bootstrap.sh
```

What to expect:

| Step | What you see | Normal wait |
|------|-------------|-------------|
| Prerequisites check | `✓ Prerequisites OK (node=v24.x.x, npm=9.x.x)` | Instant |
| .env copy | `✓ Created .env from .env.example` | Instant |
| `npm install` | Silent (already done) | Instant |
| Docker services start | `Starting Docker services...` | 5–30 sec (first run pulls images) |
| Waiting for Postgres | Dots, then `✓ Postgres ready` | 5–15 sec |
| DB migrate | `Running database migrations...` | 2–5 sec |
| DB seed | `Seeding database...` | 2 sec |
| Done | Green success banner | — |

LocalStack starts in the background (for exercises 3 and 7) but bootstrap does not block on it.

**Expected final output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Bootstrap complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Start the app:
    npm run dev

  Open in browser:
    http://localhost:5173

  Test credentials:
    Email:    participant@example.com
    Password: Bootcamp1!

  Admin credentials:
    Email:    admin@example.com
    Password: Bootcamp1!
```

---

## 5. Verify Docker services

```bash
docker compose ps
```

Postgres must be `healthy`. LocalStack can still be `starting` — that's fine for now.

```
NAME           IMAGE                       STATUS
postgres       postgres:16-alpine          Up (healthy)
localstack     localstack/localstack:3.5   Up (starting)   ← OK at this stage
```

If Postgres stays `unhealthy`:
```bash
docker compose logs postgres
```

---

## 6. Verify the database

Confirm tables and seed data exist:

```bash
docker compose exec postgres psql -U bootcamp -d bootcamp -c "\dt"
```

Expected — three tables:
```
         List of relations
 Schema |   Name   | Type  |  Owner
--------+----------+-------+---------
 public | bookings | table | bootcamp
 public | rooms    | table | bootcamp
 public | users    | table | bootcamp
```

Verify rooms:
```bash
docker compose exec postgres psql -U bootcamp -d bootcamp \
  -c "SELECT name, price_per_night_cents, capacity FROM rooms;"
```

Expected — 5 rooms:
```
       name       | price_per_night_cents | capacity
------------------+-----------------------+----------
 Lakeside Studio  |                  8500 |        1
 Garden Suite     |                 12000 |        2
 The Loft         |                 15000 |        3
 Family Cottage   |                 22000 |        5
 Penthouse        |                 45000 |        4
```

Verify users:
```bash
docker compose exec postgres psql -U bootcamp -d bootcamp \
  -c "SELECT email, display_name, role, cognito_sub IS NOT NULL AS cognito_linked FROM users;"
```

Expected after seeding Postgres only (before `seed-cognito.sh`):
```
           email            |   display_name    |  role  | cognito_linked
----------------------------+-------------------+--------+----------------
 participant@example.com    | Test Participant   | user   | f
 admin@example.com          | Test Admin        | admin  | f
```

After running `./scripts/seed-cognito.sh`, both rows will show `cognito_linked = t`.

---

## 7. Set up Cognito auth

The app authenticates via AWS Cognito. Before you can log in, you need to:

1. Create a Cognito User Pool in your AWS account
2. Fill in `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` in `.env`
3. Run `./scripts/seed-cognito.sh` to create test users in Cognito and link them to Postgres

**Follow the full guide:** `docs/boot-camp/cognito-setup.md`

Once the seed script runs successfully, continue with the next step.

---

## 8. Start the development servers

```bash
npm run dev
```

Expected output (interleaved):
```
[api] Server listening at http://0.0.0.0:3000
[web] VITE v8.x.x  ready in xxx ms
[web]   ➜  Local:   http://localhost:5173/
```

If you see a TypeScript or module error from the API, check the troubleshooting section.

---

## 9. Verify the API health check

In a new terminal (keep `npm run dev` running):

```bash
curl -s http://localhost:3000/health | python3 -m json.tool
```

Expected:
```json
{ "status": "ok" }
```

---

## 10. Verify the login endpoint

```bash
curl -s -c /tmp/cookies.txt -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "participant@example.com", "password": "Bootcamp1!"}' \
  | python3 -m json.tool
```

Expected:
```json
{ "ok": true }
```

Verify the session cookie was set:
```bash
grep session /tmp/cookies.txt
# should print a line with a long JWT value
```

Verify `/me` works with the cookie:
```bash
curl -s -b /tmp/cookies.txt http://localhost:3000/me | python3 -m json.tool
```

Expected:
```json
{
  "id": "...",
  "email": "participant@example.com",
  "displayName": "Test Participant",
  "role": "user"
}
```

---

## 11. Verify the rooms endpoint

```bash
curl -s -b /tmp/cookies.txt http://localhost:3000/rooms | python3 -m json.tool
```

Expected — JSON with 5 rooms under a `rooms` key.

---

## 12. End-to-end browser verification

Open `http://localhost:5173`.

**Step 1 — Login**
- Login form is pre-filled with `participant@example.com` / `Bootcamp1!`
- Click **Sign in** → redirected to `/rooms`

**Step 2 — Rooms list**
- Grid of 5 room cards, each with name, description, capacity, price
- Penthouse card has a photo

**Step 3 — Book a room**
- Click **Book this room** on any card
- Pick a future check-in and check-out date
- Click **Confirm booking**

**Step 4 — Confirmation**
- Green "Booking confirmed!" message

**Step 5 — My Bookings**
- Click **View my bookings** → one booking with status `confirmed`

All 5 steps working = full stack verified.

---

## 13. Run unit tests

```bash
npm test
```

All tests pass. If few tests run, that's expected at this stage — unit tests are authored per-exercise.

---

## 14. Run the Playwright E2E test

**Requires `npm run dev` running in another terminal.**

```bash
# First time only — installs Chromium (~150 MB)
npx playwright install chromium

npm run test:e2e
```

Expected:
```
✓  e2e/reference/booking-flow.spec.ts › Reference booking flow › user can log in... (Xms)

1 passed (Xs)
```

Watch it run visually:
```bash
npx playwright test --headed
```

---

## 15. Verify CDK synth

Validates the AWS infrastructure code locally — no AWS account or deployment involved.

```bash
npm run cdk:synth
```

If you see TypeScript errors: `cd infra/cdk && npm install && cd ../..`, then retry.

---

## 16. Verification checklist

Tick these off before starting exercises:

- [ ] `docker compose ps` — Postgres is `healthy`
- [ ] 5 rooms in the `rooms` table
- [ ] 2 users in the `users` table with `cognito_linked = t` for both (after `seed-cognito.sh`)
- [ ] `GET /health` → `{"status":"ok"}`
- [ ] `POST /auth/login` → `{"ok":true}` with a session cookie set
- [ ] `GET /me` → returns participant user with `displayName` filled in
- [ ] `GET /rooms` → 5 rooms
- [ ] Browser: login → rooms → book → confirm → my bookings all work
- [ ] `npm test` passes
- [ ] `npm run test:e2e` passes (1 test, green)
- [ ] `npm run cdk:synth` passes

---

## 17. Reset to clean state

Fresh database only (keeps Docker volumes):
```bash
./scripts/db-reset.sh
```

Full reset (wipes everything, re-bootstraps):
```bash
docker compose down -v    # removes all volumes
rm -f db/migrations/*.sql # remove old migrations
npm run db:generate       # regenerate from schema
./scripts/bootstrap.sh
```

---

## Troubleshooting

### `npm run db:migrate` fails with "no migrations found"

Generate the migration file first:
```bash
npm run db:generate
```

### `npm run db:generate` hangs or errors

Drizzle Kit needs the database to be running when generating migrations in some configurations. Make sure Docker is up:
```bash
docker compose up -d postgres
# wait a few seconds, then:
npm run db:generate
```

### API fails to start: `Cannot find module` or TypeScript error

Re-install dependencies — a package may be missing:
```bash
npm install
npm run dev
```

### API fails to start: "Cannot connect to database"

Postgres isn't ready yet, or `DATABASE_URL` in `.env` is wrong:
```bash
docker compose ps               # postgres should be 'healthy'
grep DATABASE_URL .env          # should be postgresql://bootcamp:bootcamp@localhost:5432/bootcamp
```

### `POST /auth/login` returns 401 "Invalid credentials"

Either the Cognito user doesn't exist or the Postgres `cognito_sub` isn't linked. Check:
```bash
docker compose exec postgres psql -U bootcamp -d bootcamp \
  -c "SELECT email, cognito_sub IS NOT NULL AS cognito_linked FROM users;"
```

If `cognito_linked = f`, re-run the seed:
```bash
./scripts/seed-cognito.sh
```

If it fails with an AWS error, check that `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, and your AWS credentials are set in `.env`.

### `GET /me` returns 401 after successful login

The session cookie is httpOnly and scoped to `localhost` — it won't work across domains or in Postman without cookie support enabled. Use `-b /tmp/cookies.txt` in curl (as shown in step 10), or test in the browser.

### Port already in use (3000 or 5173)

```bash
lsof -ti:3000 | xargs kill
lsof -ti:5173 | xargs kill
```

### `npm run cdk:synth` fails with TypeScript errors

The CDK workspace has its own `node_modules`:
```bash
cd infra/cdk && npm install && cd ../..
npm run cdk:synth
```

### LocalStack is unhealthy

LocalStack is not needed for the core login/rooms/booking flow. It's only required for exercise 3 (S3 file upload) and exercise 7 (SES email). If it's unhealthy, ignore it until you reach those exercises:
```bash
docker compose logs localstack   # check what's wrong
docker compose restart localstack
```

---

## Ports reference

| Service | Port | URL |
|---------|------|-----|
| Web (Vite) | 5173 | http://localhost:5173 |
| API (Fastify) | 3000 | http://localhost:3000 |
| Postgres | 5432 | `psql -U bootcamp -d bootcamp -h localhost` |
| LocalStack | 4566 | http://localhost:4566/_localstack/health |
