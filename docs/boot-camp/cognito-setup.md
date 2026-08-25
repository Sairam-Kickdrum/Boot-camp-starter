# Cognito Setup Guide

Each boot camp cohort runs against a real AWS Cognito User Pool. This guide walks you through creating one in your AWS account and wiring it into the local app.

---

## Prerequisites

| Requirement | Check |
|-------------|-------|
| AWS account | Sign in at console.aws.amazon.com |
| AWS CLI v2 | `aws --version` — if missing, install from [AWS docs](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) |
| IAM permissions | `cognito-idp:CreateUserPool`, `AdminCreateUser`, `AdminSetUserPassword`, `AdminGetUser`, `InitiateAuth` |
| App bootstrapped | `./scripts/bootstrap.sh` already run — Docker + Postgres running |

---

## Part 1 — Configure AWS CLI credentials

You need this done first — both the CLI option in Part 2 and the seed script in Part 4 require valid AWS credentials.

```bash
aws configure
# AWS Access Key ID:     <your IAM access key>
# AWS Secret Access Key: <your IAM secret key>
# Default region name:   us-east-1
# Default output format: json
```

Verify it works before continuing:

```bash
aws sts get-caller-identity
# Should return your account ID, user ARN, and user ID
```

If you get `Unable to locate credentials`, the access key or secret is wrong — re-run `aws configure` with the correct values.

> **Where to get credentials:** AWS Console → your username (top-right) → **Security credentials** → **Access keys** → **Create access key**.

---

## Part 2 — Create the User Pool

### Option A: AWS Console (recommended for first-timers)

1. Sign in to the **AWS Console** and navigate to **Amazon Cognito → User pools → Create user pool**.

2. **Step 1 — Authentication providers**
   - Provider types: **Cognito user pool**
   - Cognito user pool sign-in options: **Email** ✓
   - Click **Next**

3. **Step 2 — Security requirements**
   - Password policy: defaults are fine. Ensure the policy allows `Bootcamp1!` (8+ chars, upper, lower, number, symbol).
   - MFA: **No MFA**
   - Click **Next**

4. **Step 3 — Sign-up experience**
   - Self-registration: **uncheck** "Allow users to register" (admin-only creation)
   - Click **Next** through the rest of this step

5. **Step 4 — Message delivery**
   - Email provider: **Send email with Cognito** (no SES setup needed)
   - Click **Next**

6. **Step 5 — Integrate your app**
   - User pool name: `boot-camp-dev`
   - **Do not** use the Hosted UI
   - App type: **Public client**
   - App client name: `boot-camp-web`
   - Client secret: **Don't generate** (unchecked)
   - Authentication flows: expand **Advanced** and check **ALLOW_USER_PASSWORD_AUTH**
   - Click **Next**

7. **Step 6 — Review and create** → click **Create user pool**

8. **Collect the two values you'll need:**
   - **User Pool ID** — shown at the top of the pool overview page (e.g. `us-east-1_Abc123XYZ`)
   - **Client ID** — navigate to **App integration → App clients** tab → copy the Client ID

---

### Option B: AWS CLI (faster, scriptable)

```bash
# 1. Create the user pool
POOL_ID=$(aws cognito-idp create-user-pool \
  --pool-name boot-camp-dev \
  --policies 'PasswordPolicy={MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=true}' \
  --admin-create-user-config 'AllowAdminCreateUserOnly=true' \
  --schema 'Name=email,AttributeDataType=String,Required=true,Mutable=false' \
  --username-attributes email \
  --auto-verified-attributes email \
  --region us-east-1 \
  --query 'UserPool.Id' \
  --output text)

echo "User Pool ID: $POOL_ID"

# 2. Create the app client (no secret, USER_PASSWORD_AUTH enabled)
CLIENT_ID=$(aws cognito-idp create-user-pool-client \
  --user-pool-id "$POOL_ID" \
  --client-name boot-camp-web \
  --no-generate-secret \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH \
  --region us-east-1 \
  --query 'UserPoolClient.ClientId' \
  --output text)

echo "Client ID: $CLIENT_ID"
```

---

## Part 3 — Configure your local environment

### Step 1: Update `.env`

Open `.env` in the repo root. Fill in the Cognito values from Part 2:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your access key>
AWS_SECRET_ACCESS_KEY=<your secret key>

COGNITO_USER_POOL_ID=us-east-1_Abc123XYZ    # from Part 2
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx  # from Part 2
```

> **Note**: `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env` override your `aws configure` profile. You can leave them blank if your AWS CLI default profile already has the correct credentials.

### Step 2: Seed users into Cognito

```bash
./scripts/seed-cognito.sh
```

This script:
1. Creates `participant@example.com` and `admin@example.com` in your Cognito User Pool with permanent passwords
2. Reads back their Cognito `sub` (UUID) values
3. Updates the Postgres `users` table so the app can look up users by their Cognito identity

Expected output:

```
  Seeding Cognito User Pool: us-east-1_Abc123XYZ
  Region: us-east-1

✓ participant@example.com — sub: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✓ admin@example.com      — sub: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
✓ Postgres users linked to Cognito subs

  Done!
```

---

## Part 4 — Verify

Start the app:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and log in:

| Field | Value |
|-------|-------|
| Email | `participant@example.com` |
| Password | `Bootcamp1!` |

If you reach the rooms listing, Cognito auth is working correctly.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| `Invalid credentials` on login | User not in Cognito or wrong password state | Re-run `./scripts/seed-cognito.sh` |
| `User not found` on login | Cognito user exists but `cognito_sub` not linked in Postgres, and email also not in DB | Re-run `./scripts/seed-cognito.sh` (local dev) or check API logs for upsert errors (cohort) |
| `JWKS fetch failed` / app crashes on start | `COGNITO_USER_POOL_ID` not set or wrong region | Check `.env` — `COGNITO_USER_POOL_ID` and `AWS_REGION` |
| `cognito-idp not yet implemented or pro feature` | `AWS_ENDPOINT_URL` is set to LocalStack in `.env`, routing Cognito to LocalStack | Remove or comment out `AWS_ENDPOINT_URL` from `.env` — it's only for S3/SES exercises |
| `AccessDeniedException` in seed script | IAM user lacks Cognito permissions | Attach the required permissions (see Prerequisites) |
| `UserAlreadyExistsException` in seed script | Already seeded — safe to ignore; script handles this | No action needed |
| Token expired (1 hour) | Cognito AccessToken TTL is 1 hour | Log in again |

---

## How it works (auth flow reference)

```
Login (POST /auth/login):
  1. Browser sends { email, password }
  2. API calls Cognito → InitiateAuth (USER_PASSWORD_AUTH flow)
  3. Cognito verifies credentials, returns an AccessToken (a JWT signed by AWS)
  4. API stores AccessToken in an httpOnly "session" cookie (1-hour TTL)
  5. Browser never sees the token — only the cookie

Per-request auth:
  1. Browser sends the session cookie automatically
  2. API reads the cookie and calls requireAuth
  3. jose verifies the token signature against Cognito's public JWKS:
     https://cognito-idp.{region}.amazonaws.com/{poolId}/.well-known/jwks.json
  4. API looks up the Postgres user by the token's `sub` (Cognito's user UUID)
  5. Attaches request.sessionUser = { id, email, role }
```

The frontend never talks to Cognito directly. All auth traffic goes through the API.

> **Production note:** In production, the app uses the same Cognito flow but against a real deployed User Pool. The `SESSION_SECRET` env var is retained for `@fastify/cookie` registration but is not used for token signing — the Cognito-issued JWT is self-contained.
