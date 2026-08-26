---
paths:
  - "apps/api/**" # backend
  - "apps/web/**" # frontend
---

# Security Rules

## Project Auth Model

Populated by `onboard.sh`. Read this section before reviewing any access control logic.

| Field | Value |
|-------|-------|
| **Model** | Cookie-based session backed by AWS Cognito. There is no role-based authorization enforced on any live route — only ownership checks. |
| **Mechanism** | Login (`POST /auth/login`, `apps/api/src/routes/auth.ts`) calls Cognito `InitiateAuthCommand` (USER_PASSWORD_AUTH); the returned Cognito AccessToken is set into an httpOnly `session` cookie (`secure` in prod, `sameSite: "lax"`). Every protected route verifies that cookie per-request via `jose`'s `jwtVerify` against the Cognito JWKS endpoint (`apps/api/src/plugins/auth.ts`) — no `Authorization` header is accepted. |
| **Access primitive** | Fastify decorator `app.requireAuth`, defined in `apps/api/src/plugins/auth.ts` and applied per-route as `preHandler: [app.requireAuth]` (e.g. `apps/api/src/routes/bookings.ts`, `rooms.ts`, `me.ts`). It verifies the session cookie, resolves/auto-provisions the local Postgres user by `cognito_sub`, and attaches `request.sessionUser = { id, email, displayName, role }`. |
| **Roles / scopes** | DB enum `role: "user" \| "admin"` (`db/schema/index.ts`), assigned from the Cognito `cognito:groups` claim on first login. A `app.requireRole(role)` preHandler factory exists (`apps/api/src/plugins/auth.ts`) but **is not wired into any route** — treat any PR that assumes role-gated authorization already exists as introducing it fresh. Actual authorization today is ownership-based only, e.g. `apps/api/src/routes/bookings.ts` checks `booking.userId === request.sessionUser.id` and returns 403 (translated from "not found" to avoid leaking existence of another user's booking). |

**Frontend note:** The frontend never reads or stores the session token — `apps/web/src/lib/api/client.ts` sends `credentials: "include"` on every `fetch` so the browser attaches the httpOnly cookie automatically; there is no `localStorage`/`sessionStorage` token handling. `ProtectedRoute` (`apps/web/src/App.tsx`) redirects to `/login` when `AuthProvider`'s mount-time `getMe()` call (`apps/web/src/lib/auth/context.tsx`) returns a 401. There is no global 401 interceptor for calls made after mount, and no component branches on `user.role` — client-side role checks are not implemented.

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
