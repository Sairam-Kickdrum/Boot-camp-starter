# Cohort Facilitator Guide

This guide covers everything a facilitator needs to run a boot camp cohort against the shared KickDrum Cognito User Pool.

---

## Overview

The boot camp uses **one shared AWS Cognito User Pool** in the KickDrum shared dev account. Each cohort gets its own Cognito group (`cohort-YYYY-MM`). Participants receive login credentials and run the app entirely locally — only Cognito auth calls reach AWS.

```
[AWS Cognito — shared KickDrum dev account]
  ├── Group: cohort-2026-06  ← provisioned per cohort
  │     ├── alice@yopmail.com
  │     └── bob@yopmail.com
  └── Group: admin           ← facilitators + coaches

Each participant's machine:
  apps/web  →  apps/api (local)  →  verifies JWT against shared Cognito JWKS
  Postgres  →  local Docker       (isolated per participant)
```

---

## Prerequisites (facilitator only)

| Requirement | Notes |
|---|---|
| AWS CLI v2 | `aws configure` with KickDrum shared dev account credentials |
| Cognito permissions | `AdminCreateUser`, `AdminSetUserPassword`, `AdminAddUserToGroup`, `CreateGroup`, `GetGroup`, `ListUsersInGroup`, `AdminDisableUser`, `AdminRemoveUserFromGroup` |
| `COGNITO_USER_POOL_ID` in `.env` | The shared pool — ask the platform team if you don't have it |

---

## Cohort lifecycle

### 1. Before the cohort — provision participants

Create a roster CSV from the template:

```bash
cp cohort-roster.example.csv cohort-roster.csv
# Edit cohort-roster.csv: one row per participant (name, email, role)
```

Run the provision script:

```bash
npm run cohort:provision -- --cohort 2026-06 --roster cohort-roster.csv
```

This will:
1. Create the `cohort-2026-06` group in Cognito (idempotent)
2. Create each participant's Cognito account with a permanent, randomly generated password
3. Add each participant to `cohort-2026-06` (and `admin` group for role=admin rows)
4. Write `credentials-2026-06.csv` to the repo root

**Distribute credentials:**
- Open `credentials-2026-06.csv` — it contains one row per participant with their email and password
- Send each participant their credentials via a **secure internal channel** (1Password, encrypted email, etc.)
- Also share the values of `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` — participants need these in their `.env`
- **Delete `credentials-2026-06.csv`** from your machine after distribution (it is gitignored)

### 2. During the cohort — monitor and support

List participants and their status:

```bash
npm run cohort:list -- --cohort 2026-06
```

Reset a participant's password (if they're locked out):

```bash
npm run cohort:reset -- --email alice.smith@yopmail.com
# Prints a new random password — share it with the participant
```

Set a specific password:

```bash
npm run cohort:reset -- --email alice.smith@yopmail.com --password "NewPass123!"
```

### 3. After the cohort — teardown

Disable all accounts in the cohort group:

```bash
npm run cohort:teardown -- --cohort 2026-06
```

Users are **disabled, not deleted** — they can be re-enabled via the AWS Console if needed.

---

## Participant onboarding (what to send them)

Send each participant:
1. Their email + password from `credentials-YYYY-MM.csv`
2. The values for `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID`
3. Link to the repo

**Participant setup steps:**
```bash
git clone <repo-url>
cd boot-camp-starter

# Copy the cohort env template and fill in the Cognito values
cp .env.cohort.example .env
# Edit .env: set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID

# One-command bootstrap (installs, starts Docker, migrates DB)
./scripts/bootstrap.sh

# Log in at http://localhost:5173 with the credentials you received
```

On first login, the app automatically creates a local DB user for the participant — no manual linking step required.

---

## How first login works

When a participant logs in for the first time:

1. Cognito verifies their credentials and returns an AccessToken (JWT)
2. The API verifies the JWT against Cognito's public JWKS
3. The API checks the local Postgres `users` table for a matching `cognito_sub`
4. If not found, it looks for a matching email row (e.g. from `db:seed`) and links the sub
5. If still not found, it creates a new `users` row automatically using the email from the JWT

No facilitator action is needed after provisioning — the local DB self-populates on first login.

---

## What participants do NOT need

- AWS credentials (`AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`) — not required for auth
- LocalStack for auth — Cognito is always real AWS; LocalStack is only used for exercise 3 (S3) and exercise 7 (SES)
- Running `seed-cognito.sh` — that script is for local dev only (creates the two example test users)

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid credentials` on participant login | Password not set to permanent | Re-run `cohort:provision` or `cohort:reset` |
| Participant gets `User not found` after login | First-login upsert failed (very unlikely) | Check API logs; verify `COGNITO_USER_POOL_ID` is correct in participant's `.env` |
| `cohort:provision` fails with `AccessDeniedException` | Facilitator IAM lacks Cognito permissions | Attach the required policy to your IAM user |
| Participant can't reach Cognito | `AWS_ENDPOINT_URL=http://localhost:4566` set in their `.env` | Remove or comment out `AWS_ENDPOINT_URL` — it's only for S3/SES exercises |
