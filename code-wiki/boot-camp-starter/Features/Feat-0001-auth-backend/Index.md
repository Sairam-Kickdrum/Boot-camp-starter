---
feat_id: Feat-0001
feature: auth-backend
type: backend-service
domain: identity
criticality: high
touched_paths:
  - apps/api/src/routes/auth.ts
  - apps/api/src/routes/me.ts
  - apps/api/src/plugins/auth.ts
depends_on: [Feat-0007]
consumed_by: [Feat-0002, Feat-0003, Feat-0004]
implements: []
tags: [auth, cognito, session]
---

## Overview

| Type | Package | Path | Domain | Last updated |
|---|---|---|---|---|
| backend-service | apps/api | `apps/api/src/routes/auth.ts`, `apps/api/src/routes/me.ts`, `apps/api/src/plugins/auth.ts` | identity | 2026-09-08 |

## Domain Purpose

Authenticates a user against AWS Cognito and turns the result into a per-request identity every
other backend feature can trust — without any feature having to talk to Cognito itself.

## Entities Owned

| Entity | Represents |
|---|---|
| [`users`](../../Schemas/schemas.md#users) | A Postgres-side identity linked to a Cognito user by `cognito_sub` |

## Invariants

- Session authentication is cookie-based only — no `Authorization` header is ever accepted (`apps/api/src/plugins/auth.ts`).
- Every protected route must include `preHandler: [app.requireAuth]`; there is no other enforcement mechanism.
- The Cognito JWKS is fetched once per process and cached — rotation only takes effect on restart.
- `request.sessionUser` is only ever set by `requireAuth`; nothing else may set it.

## Access Control

**Model**: Role-based (`user` | `admin`) via Cognito-issued JWT, decorated onto the request by a single Fastify plugin.

| Action | Access Condition | Enforced In |
|---|---|---|
| Any protected route | Valid `session` cookie → verified Cognito AccessToken → linked/auto-created `users` row | `apps/api/src/plugins/auth.ts:34-79` (`requireAuth`) |
| Role-gated route | `request.sessionUser.role === role` | `apps/api/src/plugins/auth.ts:82-89` (`requireRole`) — **defined but not currently used by any route** |

## Business Rules

| BR-NN | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | Login requires valid Cognito credentials (email + password via `USER_PASSWORD_AUTH`) | `apps/api/src/routes/auth.ts:22-54` | CRITICAL |
| BR-02 | Session cookie is `httpOnly`, `secure` in production, `sameSite: lax`, 1-hour `maxAge` | `apps/api/src/routes/auth.ts:44-50` | HIGH |
| BR-03 | AccessToken JWT must have `token_use === "access"` (rejects ID tokens) | `apps/api/src/plugins/auth.ts:43` | CRITICAL |
| BR-04 | First cohort login links Cognito `sub` to a pre-seeded user row by matching email, only if `cognito_sub` is still null | `apps/api/src/plugins/auth.ts:57-63` | HIGH |
| BR-05 | Unmatched first login auto-creates a `users` row; role comes from the Cognito `cognito:groups` claim (`admin` group → `admin`, else `user`) | `apps/api/src/plugins/auth.ts:66-75` | HIGH |
| BR-06 | `email` and `cognito_sub` are unique at the DB level | `db/migrations/0000_far_warhawk.sql` | CRITICAL |

## Safe vs Dangerous Changes

### Safe
- Adding a new field to `CurrentUserResponse` that's already on `request.sessionUser`.
- Adding a new protected route with `preHandler: [app.requireAuth]`.

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Changing the auto-create role-derivation logic (BR-05) | Privilege escalation | A cohort participant could land in the `admin` group unintentionally |
| Removing the `token_use` check (BR-03) | Auth bypass | Would accept ID tokens as session tokens, widening what's accepted as a valid session |
| Wiring up `requireRole` for the first time | Behavior change for existing routes | Currently unused — the first caller should confirm no route silently depended on its absence |

### Human Escalation Required
- Any change to how `cognito:groups` maps to the local `role` column.

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Bad email/password | 401, "Invalid credentials" | Cognito `NotAuthorizedException`/`UserNotFoundException` |
| No `session` cookie | 401, "No session cookie" | `requireAuth` |
| Expired/invalid/wrong-issuer JWT | 401, "Invalid session" | `jwtVerify` throws |
| Token not an access token | 401, "Invalid session" | BR-03 |
| No linked/creatable user | 401, "User not found" | Race on `onConflictDoNothing()` insert, or seed data missing |

## Testing Expectations

- No unit or integration tests currently exist for `routes/auth.ts`, `routes/me.ts`, or `plugins/auth.ts` — this is a gap, not a convention to preserve.
- Any new test should mock the Cognito SDK client, not hit real Cognito.

## Forbidden Patterns

- Never accept credentials via any header other than the `session` cookie.
- Never log the raw AccessToken.

## Key Files

- `apps/api/src/plugins/auth.ts` — JWT verification, user lookup/linking/auto-creation, `requireAuth`/`requireRole` decorators
- `apps/api/src/routes/auth.ts` — `/auth/login`, `/auth/logout`
- `apps/api/src/routes/me.ts` — `/me`, returns the current `sessionUser`

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0001 | Touching login/session/Cognito, or adding any new protected route |
