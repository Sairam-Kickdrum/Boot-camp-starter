---
feat_id: Feat-0002
feature: bookings-api
type: backend-service
domain: bookings
criticality: high
touched_paths:
  - apps/api/src/routes/bookings.ts
  - apps/api/src/services/booking-service.ts
  - apps/api/src/repositories/booking-repository.ts
depends_on: [Feat-0001-auth-api, Feat-0003-rooms-api]
consumed_by: [Feat-0005-bookings-web]
implements: []
tags: [bookings, reservations]
---

# Bookings (API)

## Overview

| Field | Value |
|---|---|
| Type | backend-service |
| Package | `@boot-camp/api` |
| Path | `apps/api/src/routes/bookings.ts`, `services/booking-service.ts`, `repositories/booking-repository.ts` |
| Domain | bookings |
| Last updated | 2026-08-26 |

## Domain Purpose

Lets an authenticated participant reserve a room for a date range and see their own reservations,
while preventing two confirmed bookings from overlapping on the same room.

## Entities Owned

| Entity | Represents |
|---|---|
| [`bookings`](../../Schemas/schemas.md#bookings) | A room reservation for a date range, owned by one user |

## Status / State Machine

| Status | Business Meaning | Can Transition To | Trigger |
|---|---|---|---|
| `confirmed` | Active reservation, blocks overlapping bookings on the same room | `cancelled` | **No route exists to trigger this transition today** — see Gaps |
| `cancelled` | Reservation no longer holds the room | *(terminal — no route re-confirms)* | n/a |

- *Open question: the `booking_status` enum and `cancelled_at` column exist and are read by the
  frontend (status badges in [Feat-0005-bookings-web](../Feat-0005-bookings-web/Index.md)), but no
  backend route can ever produce a `"cancelled"` row. Was a cancel endpoint planned but not built?*

## Invariants

- A booking's `checkOut` must be strictly after `checkIn` — enforced at both the Zod layer and the
  DB `CHECK chk_dates` constraint (defense in depth).
- A user can only read their own bookings — `GET /bookings/:id` compares `booking.userId` to
  `request.sessionUser.id` and returns 403 on mismatch, translated from "not found" to avoid
  leaking whether another user's booking exists.
- `GET /bookings` is scoped server-side to the session user (`service.listForUser(sessionUser.id)`)
  — there is no client-controlled parameter that can widen this to another user's bookings.

## Access Control

**Model**: authentication (`requireAuth`) + explicit per-request ownership check — no role check.

| Action | Access Condition | Enforced In |
|---|---|---|
| `GET /bookings` | authenticated; scoped to `sessionUser.id` server-side | `apps/api/src/routes/bookings.ts:13-21` |
| `POST /bookings` | authenticated; booking created for `sessionUser.id`, not a client-supplied user | `apps/api/src/routes/bookings.ts:23-32` |
| `GET /bookings/:id` | authenticated + `booking.userId === sessionUser.id` | `apps/api/src/routes/bookings.ts:34-48` |

## Business Rules

| BR-NN | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | `checkOut > checkIn` | DB `CHECK chk_dates` (`db/migrations/0000_far_warhawk.sql`) + Zod refine (`booking-schemas.ts:20-22`) | CRITICAL |
| BR-02 | Only `status = "confirmed"` bookings block a new booking on the same room/date-range overlap | `apps/api/src/repositories/booking-repository.ts:27` | HIGH |
| BR-03 | Target room must exist before a booking can be created (throws `NotFoundError`, converted to `ForbiddenError` at the route to avoid leaking room existence) | `apps/api/src/services/booking-service.ts:21`, `apps/api/src/routes/bookings.ts:43` | HIGH |
| BR-04 | Overlapping date range on the same room → `409 Conflict` | `apps/api/src/services/booking-service.ts:27-34` | HIGH |
| BR-05 | User can only view their own booking by id | `apps/api/src/routes/bookings.ts:46` | CRITICAL |
| BR-06 | **No DB-level uniqueness prevents a race condition**: two concurrent requests can both pass the conflict check and create overlapping confirmed bookings — acknowledged in a code comment, not mitigated with `SELECT ... FOR UPDATE` or a partial unique/exclusion constraint | `apps/api/src/services/booking-service.ts:23-26` | CRITICAL |

## External Integrations

*None found.*

## API Endpoints

| Method | Path | Auth | Who Uses It | Description |
|---|---|---|---|---|
| GET | `/bookings` | `requireAuth` | [Feat-0005-bookings-web](../Feat-0005-bookings-web/Index.md) | List the session user's bookings |
| POST | `/bookings` | `requireAuth` | [Feat-0005-bookings-web](../Feat-0005-bookings-web/Index.md) | Create a booking for the session user |
| GET | `/bookings/:id` | `requireAuth` + ownership | *(defined; no frontend caller found — `getBooking` exists in the frontend API client but is unused)* | Fetch one booking, 403 if not owned |

## Safe vs Dangerous Changes

### Safe
- Adding a read-only field to the `Booking` response shape.
- Adding a new index to `bookings` that doesn't change query semantics.

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Adding a cancel-booking route | Must decide whether to release the overlap-block for that room/date range immediately | The overlap check only excludes `cancelled` status — get this right or double-bookings become possible on cancel+rebook |
| Any fix to the race condition (BR-06) | Must not deadlock or serialize all bookings globally | `hasConflict` already accepts an unused `excludeBookingId` param, suggesting a fix was anticipated but not finished |
| Deleting a `room` or `user` with existing bookings | No FK cascade or 409 handling exists today (see [`schemas.md`](../../Schemas/schemas.md#bookings)) | Per root `CLAUDE.md`'s FK-handling convention, this needs cascade-delete or an explicit 409 before either delete route is ever added |

### Human Escalation Required
- Any change to the overlap-detection query — it's the sole business-integrity guarantee this
  feature provides.

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Booking id doesn't exist | 404 → `NotFoundError` | `booking-repository.ts:20` |
| Booking exists but belongs to another user | 403 `ForbiddenError` | `bookings.ts:46` (existence intentionally not distinguished from ownership failure) |
| Target room doesn't exist | 403 `ForbiddenError` (translated from `NotFoundError`) | `bookings.ts:43` |
| Date range conflicts with an existing confirmed booking | 409 `ConflictError("Room is not available for the requested dates")` | `booking-service.ts:32` |
| No/invalid session | 401 | `plugins/auth.ts` (see [Feat-0001-auth-api](../Feat-0001-auth-api/Index.md)) |

## Testing Expectations

- `apps/api/src/services/booking-service.test.ts` exists and covers Tier 1 service-level logic —
  read it before changing `booking-service.ts` to see which scenarios are already pinned.
- No integration test found exercising `apps/api/src/routes/bookings.ts` directly (status codes,
  auth, ownership 403). Per `.claude/rules/testing-standards.md` (TEST-08), API changes here should
  add one.
- *Open question: is the race condition in BR-06 covered by any concurrency test? Not found in the
  scan — likely not, given no lock/serialization mechanism exists to test.*

## Architectural Decisions

| Decision | Reason | Do Not Change Without |
|---|---|---|
| Ownership-only authorization (no role check) | Bookings are always personal; no admin-view-all-bookings feature exists yet | Confirming whether an admin booking-management feature is in scope before adding `requireRole` here |

## Forbidden Patterns

- Never trust a client-supplied `userId` when creating or listing bookings — always use
  `request.sessionUser.id` (BR-05, BR-03 pattern).
- Never assume `cancelled` bookings are reachable via any current route — don't write code or
  tests assuming a cancel flow exists until one is added.

## Key Files

- `apps/api/src/routes/bookings.ts` — route dispatch, ownership guard
- `apps/api/src/services/booking-service.ts` — conflict/overlap business logic, room-existence check
- `apps/api/src/repositories/booking-repository.ts` — Drizzle queries, overlap-detection SQL
- `packages/shared-types/src/booking-schemas.ts` — Zod schemas
- `db/schema/index.ts`, `db/migrations/0000_far_warhawk.sql` — table + constraints

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0002-bookings-api | touching booking creation, listing, overlap/conflict logic, or booking ownership checks |

| Workflow | Sections to load |
|---|---|
| `/pr-review-backend` on a bookings change | Business Rules, Known Error Scenarios, Safe vs Dangerous Changes |
| `/plan` impact analysis for a cancel-booking feature | Status/State Machine, Business Rules BR-02/BR-04, Dependencies |
