---
feat_id: Feat-0001
feature: apps-api
type: backend-service
domain: room-booking
criticality: high
touched_paths:
  - apps/api/src
  - db/schema
  - db/migrations
depends_on: [Feat-0003]
consumed_by: [Feat-0002]
implements: []
tags: [booking, auth, rooms]
---

## Overview

| Field | Value |
|---|---|
| Type | backend-service |
| Package | `@boot-camp/api` |
| Path | `apps/api/` |
| Domain | room-booking |
| Last updated | 2026-08-26 |

## Domain Purpose

Lets an authenticated cohort participant browse bookable rooms and reserve one for a date range,
while preventing two people from double-booking the same room on overlapping dates.

## Entities Owned

| Entity | Represents |
|---|---|
| [`users`](../../Schemas/schemas.md#users) | A person who can log in and hold bookings; linked 1:1 to a Cognito identity |
| [`rooms`](../../Schemas/schemas.md#rooms) | A bookable room; read-only from the API, seeded out-of-band |
| [`bookings`](../../Schemas/schemas.md#bookings) | One user's reservation of one room for a check-in/check-out date range |

## Status / State Machine

| Status | Business Meaning | Can Transition To | Trigger |
|---|---|---|---|
| `confirmed` | Booking holds the room for its dates and blocks other overlapping bookings | `cancelled` | *Open question: no route exists to change a booking's status — the transition is defined in the schema (`booking_status` enum) but unreachable via the current API. Was a cancel endpoint planned and not yet built?* |
| `cancelled` | Booking no longer blocks room availability | — | terminal today (unreachable) |

## Invariants

- A user's email is globally unique; a Cognito `sub` is globally unique once set.
- A booking's `check_out` is always strictly after its `check_in` (DB `CHECK` + app-layer Zod refine).
- Only `confirmed` bookings block room availability — `cancelled` bookings are inert.
- A protected route without `app.requireAuth` in its `preHandler` is a bug, not a feature — every
  existing protected route includes it (see Access Control).
- A user can only read their own booking by ID — enforced by an inline ownership check, not a
  shared guard (see Business Rules, BR-03).

## Access Control

**Model**: Session-based authentication via AWS Cognito (see Mechanism below); no route currently
enforces role (`admin` vs `user`) even though the primitive exists. Resource ownership
(bookings) is checked ad hoc per-route, not via a shared guard.

| Action | Access Condition | Enforced In |
|---|---|---|
| `POST /auth/login`, `POST /auth/logout` | none — public | `apps/api/src/routes/auth.ts` |
| `GET /me` | any authenticated user | `app.requireAuth` — `apps/api/src/routes/me.ts:7` |
| `GET /rooms`, `GET /rooms/:id` | any authenticated user | `app.requireAuth` — `apps/api/src/routes/rooms.ts:9,20` |
| `GET /bookings`, `POST /bookings` | any authenticated user | `app.requireAuth` — `apps/api/src/routes/bookings.ts:15,25` |
| `GET /bookings/:id` | authenticated **and** `booking.userId === sessionUser.id` | `app.requireAuth` + inline check — `apps/api/src/routes/bookings.ts:36,46` |
| *(none yet)* | role-restricted (`admin`) | `app.requireRole(role)` exists (`apps/api/src/plugins/auth.ts:82-89`) but no route uses it |

## Business Rules

| ID | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | A room cannot have two `confirmed` bookings with overlapping date ranges | `booking-service.ts:27-34` (check) + `booking-repository.ts:24-38` (overlap query) | CRITICAL |
| BR-02 | `check_out` must be strictly after `check_in` | DB `CHECK chk_dates` + `booking-schemas.ts` Zod refine | CRITICAL |
| BR-03 | A user may only view their own booking by ID | `bookings.ts:46` — inline `booking.userId !== sessionUser.id` | HIGH |
| BR-04 | Only `confirmed` bookings count toward room availability | `booking-repository.ts:21-25` — `status = 'confirmed'` filter | HIGH |
| BR-05 | A brand-new cohort participant (no local user row, but a valid Cognito login) is auto-created, with role taken from Cognito group `admin` membership | `plugins/auth.ts:65-75` | MEDIUM |
| BR-06 | A first-time cohort participant seeded by email is linked to their Cognito identity on first login (`cognito_sub` backfilled) | `plugins/auth.ts:56-63` | MEDIUM |
| BR-07 | Session auth only ever comes from the httpOnly `session` cookie — an `Authorization` header is never accepted (documented invariant, not code-enforced by a single guard) | `apps/api/CLAUDE.md`, `plugins/auth.ts:35` | HIGH |

## External Integrations

| System | Trigger | What Happens |
|---|---|---|
| AWS Cognito (`InitiateAuth`, `USER_PASSWORD_AUTH`) | `POST /auth/login` | Verifies email/password; on success wraps the returned AccessToken in an httpOnly `session` cookie (1h TTL, matching Cognito's default) |
| AWS Cognito JWKS (`https://cognito-idp.{region}.amazonaws.com/{poolId}/.well-known/jwks.json`) | every request through `app.requireAuth` | Verifies the `session` cookie's JWT signature and claims (`token_use === "access"`, `iss`) via `jose`'s `createRemoteJWKSet` (cached) |
| Postgres | every DB-backed route | Reads/writes via Drizzle ORM, connection pooled in `plugins/db.ts` |

No scheduled jobs, queue consumers, or webhooks — *None found.*

## API Endpoints

| Method | Path | Auth | Who Uses It | Description |
|---|---|---|---|---|
| POST | `/auth/login` | none | Feat-0002 `LoginPage` | Cognito login; sets `session` cookie |
| POST | `/auth/logout` | none | Feat-0002 `Nav` | Clears `session` cookie |
| GET | `/me` | `requireAuth` | Feat-0002 `AuthProvider` | Current user (id, email, displayName, role) |
| GET | `/rooms` | `requireAuth` | Feat-0002 `RoomsPage` | List rooms, optional `checkIn`/`checkOut` availability filter |
| GET | `/rooms/:id` | `requireAuth` | Feat-0002 `BookingPage` | Single room |
| GET | `/bookings` | `requireAuth` | Feat-0002 `BookingsPage` | Current user's bookings |
| POST | `/bookings` | `requireAuth` | Feat-0002 `BookingPage` | Create a booking (409 on date overlap) |
| GET | `/bookings/:id` | `requireAuth` + ownership | *(defined, not yet called by the frontend)* | Single booking, 403 if not the owner |
| GET | `/health` | none | infra probes (assumed) | *Open question: no consumer found in either scanned target — confirm it's used by a health-check probe and not dead code* |

## Safe vs Dangerous Changes

### Safe
- Adding a new field to `rooms` that isn't used in the overlap query
- Adding a new read-only route that doesn't touch `bookings`
- Extending `RoomListQuerySchema` with a new optional filter

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Adding a route that deletes a `room` or `user` | Will throw an unhandled FK constraint violation if any `bookings` row references it | Both FKs are `ON DELETE NO ACTION` (see `Schemas/schemas.md#bookings`) — no cascade or 409-conflict handling exists |
| Building a "cancel booking" endpoint | Silent double-booking risk if it doesn't also re-run the overlap check on the *next* booking attempt | `bookings.status` transitions aren't wired up anywhere yet; a naive implementation could accidentally free capacity incorrectly |
| Changing `booking-service.ts`'s overlap check without adding a uniqueness/exclusion constraint | Reintroduces or worsens the acknowledged TOCTOU race (see Known Error Scenarios) | The check-then-insert is not wrapped in a transaction or `SELECT ... FOR UPDATE` |
| Using `app.requireRole()` for the first time | Untested code path — no route currently exercises it | If wired to the wrong role string, request handling silently 403s |

### Human Escalation Required
- Any change to how the `session` cookie is issued, verified, or scoped (auth is the app's entire trust boundary)
- Any change to the `chk_dates` CHECK constraint or the overlap query's semantics

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Wrong email/password at login | 401 `UNAUTHORIZED` ("Invalid credentials") | Cognito `NotAuthorizedException`/`UserNotFoundException` caught in `auth.ts:38-40` |
| No/expired/invalid `session` cookie | 401 `UNAUTHORIZED` | `plugins/auth.ts:36,47-48` |
| Cognito-verified user has no matching local row and no seed email match | 401 `UNAUTHORIZED` ("User not found") | `plugins/auth.ts:77` |
| Room ID doesn't exist | 404 `NOT_FOUND` | `room-repository.ts:35` |
| Requesting another user's booking by ID | 403 `FORBIDDEN` (booking's existence is deliberately not revealed) | `bookings.ts:42-46` |
| Overlapping confirmed booking for the same room/dates | 409 `CONFLICT` ("Room is not available for the requested dates") | `booking-service.ts:33` |
| Invalid request body | 400 `VALIDATION_ERROR` | Zod `.parse()` throw → `plugins/error-handler.ts` |

## Testing Expectations

Two-tier strategy per `.claude/rules/testing-standards.md` and `.claude/skills/backend-test/`:
service tests (mocked repositories) for business-rule branches, integration tests for API/DB
contracts. Existing coverage: `services/booking-service.test.ts` (service tier),
`errors/app-error.test.ts`. *Open question: no integration tests exist yet exercising the actual
Fastify routes against a real Postgres instance — is that intentional for a teaching repo, or a
gap to close?*

- Critical assertion: any new booking-overlap logic must assert both the "blocked" and
  "allowed" boundary (adjacent-but-non-overlapping dates) cases, not just the obvious overlap case.

## Forbidden Patterns
- Never accept credentials via an `Authorization` header — the `session` httpOnly cookie is the
  only accepted transport (`apps/api/CLAUDE.md`).
- Never call `repositories/*` directly from `routes/*` — always go through `services/*`.
- Never hand-write SQL DDL — `db/schema/` is the single source of truth; generate migrations from it.

## Key Files
- `apps/api/src/index.ts` — entry point; registers plugins/routes, starts Fastify on port 3000
- `apps/api/src/plugins/auth.ts` — JWT verification, JWKS fetch, local-user auto-provisioning, `requireAuth`/`requireRole` (the sole auth enforcement point)
- `apps/api/src/plugins/error-handler.ts` — maps `AppError` subclasses to HTTP status codes
- `apps/api/src/plugins/db.ts` — Drizzle/Postgres connection, injects `app.db`
- `apps/api/src/routes/{auth,me,rooms,bookings}.ts` — one file per resource
- `apps/api/src/services/booking-service.ts` — overlap check + booking creation
- `apps/api/src/repositories/{booking,room}-repository.ts` — Drizzle queries
- `db/schema/index.ts` — table/enum definitions (source of truth)
- `db/migrations/0000_far_warhawk.sql`, `0001_third_talos.sql` — applied migrations

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0001 (this page) | touching `apps/api/**`, `db/schema/**`, or `db/migrations/**` |
| Feat-0002 | a frontend change needs to know which endpoint/shape backs it |
| Feat-0003 | changing a request/response shape shared across API and web |

| Workflow | Sections to load |
|---|---|
| `/plan` impact analysis | Business Rules, Safe vs Dangerous Changes, API Endpoints |
| `/pr-review-backend` | Business Rules, Access Control, Known Error Scenarios, Forbidden Patterns |
| alignment loop (ticket vs reality) | Domain Purpose, Business Rules, Status/State Machine |
