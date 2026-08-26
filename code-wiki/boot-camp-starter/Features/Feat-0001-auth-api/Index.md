---
feat_id: Feat-0001
feature: auth-api
type: backend-service
domain: auth
criticality: high
touched_paths:
  - apps/api/src/routes/auth.ts
  - apps/api/src/routes/me.ts
  - apps/api/src/plugins/auth.ts
depends_on: []
consumed_by: [Feat-0002-bookings-api, Feat-0003-rooms-api, Feat-0004-auth-web]
implements: []
tags: [auth, cognito, session]
---

# Auth (API)

## Overview

| Field | Value |
|---|---|
| Type | backend-service |
| Package | `@boot-camp/api` |
| Path | `apps/api/src/routes/auth.ts`, `apps/api/src/routes/me.ts`, `apps/api/src/plugins/auth.ts` |
| Domain | auth |
| Last updated | 2026-08-26 |

## Domain Purpose

Authenticates participants against AWS Cognito and establishes a server-side session so every
other feature can identify "who is making this request" without re-implementing verification.

## Entities Owned

| Entity | Represents |
|---|---|
| [`users`](../../Schemas/schemas.md#users) | A logged-in participant or admin, linked 1:1 to a Cognito user by `cognito_sub` |

## Invariants

- Every protected route must include `{ preHandler: [app.requireAuth] }` — a route missing this
  is unprotected, and `requireAuth` is the **only** function enforcing authentication anywhere in
  the API.
- The `session` cookie is `httpOnly` — it is never readable by frontend JavaScript, only sent by
  the browser on requests (`credentials: "include"`).
- No `Authorization` header is ever accepted — session state travels exclusively through the
  `session` cookie (documented convention in `apps/api/CLAUDE.md`).
- JWT verification against the Cognito JWKS endpoint happens on **every** request to a protected
  route — there is no server-side token cache beyond JWKS key rotation caching in `jose`.

## Access Control

**Model**: Cookie-session authentication (Cognito AccessToken, verified via JWKS) — see root
[`security.md`](../../../../.claude/rules/security.md) for the project-wide summary. **No route
in this codebase enforces role-based authorization** — `requireRole` exists but is unused (see
Business Rules and Forbidden Patterns below).

| Action | Access Condition | Enforced In |
|---|---|---|
| `POST /auth/login` | none — public | `apps/api/src/routes/auth.ts` |
| `POST /auth/logout` | none — public | `apps/api/src/routes/auth.ts` |
| `GET /me` | valid `session` cookie | `apps/api/src/routes/me.ts:7` (`preHandler: [app.requireAuth]`) |

## Business Rules

| BR-NN | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | `session` cookie must carry a Cognito AccessToken (`token_use === "access"`), verified via JWKS | `apps/api/src/plugins/auth.ts:32-49` | CRITICAL |
| BR-02 | On first-ever verified request, if `cognito_sub` isn't yet linked to a matching `email`, link it; if no matching user exists at all, auto-provision one | `apps/api/src/plugins/auth.ts:54-75` | HIGH |
| BR-03 | New user's `role` is `"admin"` iff the Cognito `cognito:groups` claim includes `"admin"`, else `"user"` | `apps/api/src/plugins/auth.ts:67` | HIGH |
| BR-04 | `email` and `cognito_sub` are each unique at the DB level | `db/migrations/0000_far_warhawk.sql` (`UNIQUE` constraints), see [`users`](../../Schemas/schemas.md#users) | CRITICAL |
| BR-05 | `requireRole(role)` exists as an authorization primitive but is **not called by any route** — role is stored and returned, never enforced | `apps/api/src/plugins/auth.ts:82-89` (defined); no callers found repo-wide | MEDIUM |
| BR-06 | Session cookie: `httpOnly`, `secure` in production, `sameSite: "lax"`, `maxAge: 3600s` | `apps/api/src/routes/auth.ts:44-50` | HIGH |
| BR-07 | Cognito `NotAuthorizedException` / `UserNotFoundException` on login both map to a generic 401 (`"Invalid credentials"`) — does not distinguish wrong password from unknown user | `apps/api/src/routes/auth.ts:38-40` | LOW |

## External Integrations

| System | Trigger | What Happens |
|---|---|---|
| AWS Cognito (`InitiateAuthCommand`, `USER_PASSWORD_AUTH`) | `POST /auth/login` | Exchanges email/password for a Cognito AccessToken, stored in the `session` cookie |
| AWS Cognito JWKS endpoint (`https://cognito-idp.{region}.amazonaws.com/{pool}/.well-known/jwks.json`) | every request to a `requireAuth`-guarded route | JWT signature verification via `jose`'s `createRemoteJWKSet` |

## API Endpoints

| Method | Path | Auth | Who Uses It | Description |
|---|---|---|---|---|
| POST | `/auth/login` | none | [Feat-0004-auth-web](../Feat-0004-auth-web/Index.md) | Cognito login, sets `session` cookie |
| POST | `/auth/logout` | none | [Feat-0004-auth-web](../Feat-0004-auth-web/Index.md) | Clears the `session` cookie |
| GET | `/me` | `requireAuth` | [Feat-0004-auth-web](../Feat-0004-auth-web/Index.md) | Returns the current session user |

## Safe vs Dangerous Changes

### Safe
- Adding a new field to `CurrentUserResponse` that's optional on the frontend.
- Adjusting the session cookie's `maxAge`.

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Wiring `requireRole` into a route | Behavior change for every admin-provisioned user | No route currently gates on role; adding one changes who can call it, and there is no test coverage for `requireRole` today |
| Changing the `cognito:groups` → `role` mapping | Silent privilege change | Existing users get re-evaluated on every login (BR-03 runs per-request, not just at signup) |
| Removing the email-linking fallback (BR-02) | Breaks first-login for seeded/cohort users | Cohort participants are seeded in Postgres by email before Cognito accounts are provisioned; this fallback is how the two get linked |

### Human Escalation Required
- Any change to what `requireAuth` treats as a valid session — this is the sole enforcement
  point for every protected route in the API.

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Wrong password or unknown email | 401 `UnauthorizedError("Invalid credentials")` | Cognito `NotAuthorizedException`/`UserNotFoundException` caught in `auth.ts:38-40` |
| Missing `session` cookie | 401 `UnauthorizedError("No session cookie")` | `plugins/auth.ts:36` |
| Expired/invalid JWT | 401 `UnauthorizedError("Invalid session")` | `plugins/auth.ts:47-49` |
| Verified token but no matching/provisionable user | 401 `UnauthorizedError("User not found")` | `plugins/auth.ts:77` |

## Testing Expectations

*Open question: no test file exists for `apps/api/src/plugins/auth.ts` or `apps/api/src/routes/auth.ts` — the scan found tests only for `apps/api/src/errors/app-error.test.ts` and `apps/api/src/services/booking-service.test.ts`. Per `.claude/rules/testing-standards.md` (TEST-01), this business logic (Cognito verification, auto-provisioning, role derivation) should have Tier 1 service tests and at least one Tier 2 integration test per endpoint.*

## Forbidden Patterns

- Never accept auth credentials outside the `session` cookie (no `Authorization` header) —
  documented convention in `apps/api/CLAUDE.md`.
- Never assume `requireRole` is enforced anywhere just because it exists — verify by grep before
  relying on it in a review or a plan.

## Key Files

- `apps/api/src/routes/auth.ts` — login/logout handlers, Cognito integration
- `apps/api/src/routes/me.ts` — current-user endpoint
- `apps/api/src/plugins/auth.ts` — `requireAuth`/`requireRole` decorators, JWT verification, user auto-provisioning
- `apps/api/src/index.ts` — plugin/cookie registration
- `packages/shared-types/src/auth-schemas.ts` — `LoginRequestSchema`, `CurrentUserResponseSchema`
- `apps/api/src/errors/app-error.ts` — `UnauthorizedError`, `ForbiddenError`

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0001-auth-api | touching login/logout/session verification, role derivation, or any `requireAuth`/`requireRole` usage |

| Workflow | Sections to load |
|---|---|
| `/pr-review-backend` on an auth change | Business Rules, Access Control, Safe vs Dangerous Changes |
| `/plan` impact analysis touching `requireAuth` | Invariants, Business Rules, Dependencies (consumed_by) |
