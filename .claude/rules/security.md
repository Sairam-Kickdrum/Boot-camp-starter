---
paths:
  - "**" # <!-- CUSTOMIZE: glob pattern for your backend repo -->
  - "**" # <!-- CUSTOMIZE: glob pattern for your frontend repo -->
---

# Security Rules

## Project Auth Model

Populated by `onboard.sh`. Read this section before reviewing any access control logic.

| Field | Value |
|-------|-------|
| **Model** | Role-based, with per-resource ownership checks layered on top |
| **Mechanism** | AWS Cognito User Pools. `POST /auth/login` calls Cognito `InitiateAuth` (`USER_PASSWORD_AUTH`) and stores the returned Cognito AccessToken in an httpOnly `session` cookie (`apps/api/src/routes/auth.ts`). Every request verifies that token against the pool's JWKS via `jose` (`apps/api/src/plugins/auth.ts`), then maps the token's `sub` to a Postgres `users` row by `cognito_sub` — auto-provisioning the row on first login (role taken from the `cognito:groups` claim). No `Authorization` header path exists; the cookie is the only accepted credential. |
| **Access primitive** | `preHandler: [app.requireAuth]` on every protected route, which populates `request.sessionUser`; `app.requireRole(role)` for role-gated routes; explicit ownership checks in handlers where a resource belongs to a specific user (e.g. `bookings.ts` compares `booking.userId` to `request.sessionUser.id` and returns 403 on mismatch). |
| **Roles / scopes** | Two roles on `users.role`: `user`, `admin`. No finer-grained scopes. |

Frontend (`apps/web`) does no role-based gating of its own — `AuthContext` (`apps/web/src/lib/auth/context.tsx`) only tracks logged-in/logged-out state via `GET /me` and treats a 401 as logged-out; the `role` field it receives is not currently used to conditionally render anything. Treat all authorization as server-enforced only — do not add a frontend check in place of a backend one.

## SEC-01: Authentication on endpoints <!-- severity: blocker -->
Every new API endpoint must require authentication unless explicitly intended to be public. Check for security annotations, configuration, or middleware that enforces auth. Compare with similar existing endpoints.

## SEC-02: Authorization and access control <!-- severity: blocker -->
Operations on resources must verify the requesting user has permission to access/modify that specific resource — not just that they are authenticated. Look for missing ownership checks (e.g., user A can modify user B's data). Check role-based access enforcement.

## SEC-03: Input validation <!-- severity: blocker -->
All user-supplied input (request bodies, query params, path params, headers) must be validated before use. Check for: missing validation annotations on request DTOs, missing schema validation, unbounded string lengths, negative numbers where only positive are valid, enum values not checked.

## SEC-04: SQL injection <!-- severity: blocker -->
Database queries must use parameterized queries or ORM criteria — never string concatenation with user input. Check for raw SQL queries built with string interpolation.

<!-- CUSTOMIZE: Replace examples below with your language/ORM's patterns -->
**Bad**: `@Query("SELECT * FROM users WHERE name = '" + name + "'")`
**Good**: `@Query("SELECT u FROM User u WHERE u.name = :name")`

## SEC-05: Secrets and credentials <!-- severity: blocker -->
No API keys, passwords, tokens, or secrets hardcoded in source code, committed config files, or log statements. Check for: hardcoded strings that look like keys/tokens, credentials in config that aren't environment variable references, secrets logged at any level.

## SEC-06: XSS prevention <!-- severity: blocker -->
User-supplied content rendered in the UI must be sanitized or escaped. Avoid injecting user input as raw HTML. Check that user input displayed in the UI goes through the framework's default escaping and is not injected as raw HTML.

## SEC-07: Sensitive data exposure <!-- severity: suggestion -->
API responses should not include sensitive fields unnecessarily (passwords, tokens, SSNs, internal IDs). Check that DTOs exclude sensitive entity fields. Verify that error responses don't leak stack traces, internal paths, or database details.

## SEC-08: CORS and request origin <!-- severity: suggestion -->
If the PR modifies CORS configuration, verify allowed origins are specific (not `*` in production). Check that CORS is not accidentally widened.

## SEC-09: File upload safety <!-- severity: blocker -->
If the PR handles file uploads, verify: file type validation (not just extension — check content type), file size limits, sanitized file names (no path traversal), storage in a safe location, and virus scanning if applicable.

## SEC-10: Rate limiting and abuse prevention <!-- severity: suggestion -->
Public-facing or expensive endpoints (login, search, report generation, file upload) should have rate limiting. Check if the new endpoint is a candidate for rate limiting based on its cost and exposure.
