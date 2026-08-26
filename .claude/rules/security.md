---
paths:
  - "apps/api/**"
  - "apps/web/**"
---

# Security Rules

## Project Auth Model

Populated by `onboard.sh`. Read this section before reviewing any access control logic.

| Field | Value |
|-------|-------|
| **Model** | Session-based authentication via AWS Cognito, plus a per-resource ownership check for bookings. A role primitive (`user` \| `admin`) exists on the user record and an `app.requireRole()` preHandler is implemented, but no route currently uses it — every existing endpoint only requires authentication, not a specific role. Treat any future `admin`-only endpoint as needing `app.requireRole("admin")` explicitly; its absence today is not evidence the app is open by design. |
| **Mechanism** | AWS Cognito User Pools. Login calls Cognito `InitiateAuth` (`USER_PASSWORD_AUTH`) via `apps/api/src/routes/auth.ts`; the returned Cognito AccessToken is set as an httpOnly `session` cookie. Every request re-verifies that token against Cognito's JWKS (`jose`, `createRemoteJWKSet`) in `apps/api/src/plugins/auth.ts` — no server-side session store. Only the `session` cookie is accepted; an `Authorization` header is never honored (see `apps/api/CLAUDE.md`). |
| **Access primitive** | `app.requireAuth` (Fastify `preHandler`) — verifies the JWT, resolves/auto-provisions the local Postgres user by `cognito_sub`, and attaches `request.sessionUser`. Every protected route must list it in `preHandler`. `app.requireRole(role)` is the role-check primitive, defined but currently unused by any route. Resource-level ownership (e.g. a booking belongs to the requesting user) is enforced ad hoc in route handlers, not by a shared primitive — see `bookings.ts`'s `booking.userId !== request.sessionUser!.id` check. |
| **Roles / scopes** | `user`, `admin` (`users.role` column, `packages/shared-types/src/auth-schemas.ts`). Assigned at first login from Cognito group membership (`cognito:groups` containing `admin`) — see `apps/api/src/plugins/auth.ts`. No endpoint currently branches on role; a reviewer should flag any new admin-only capability that skips `requireRole`. |

**Frontend**: `apps/web/src/lib/auth/context.tsx` (`AuthProvider`/`useAuth()`) fetches the current user via `GET /me` and treats a `401` as logged-out — it holds no tokens itself (the `session` cookie is httpOnly and never touched by client JS). There is no client-side role gating today; the frontend does not branch rendering on `role`. Any UI-only restriction is advisory, not a security boundary — the backend `preHandler`s in `apps/api/src/plugins/auth.ts` are the actual enforcement point and must be checked independently.

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
