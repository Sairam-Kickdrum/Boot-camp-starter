---
feat_id: Feat-0002
feature: bookings-backend
type: backend-service
domain: booking
criticality: high
touched_paths:
  - apps/api/src/routes/bookings.ts
  - apps/api/src/services/booking-service.ts
  - apps/api/src/repositories/booking-repository.ts
depends_on: [Feat-0001, Feat-0003, Feat-0007]
consumed_by: [Feat-0005]
implements: []
tags: [booking, reservation]
---

## Overview

| Type | Package | Path | Domain | Last updated |
|---|---|---|---|---|
| backend-service | apps/api | `apps/api/src/routes/bookings.ts`, `services/booking-service.ts`, `repositories/booking-repository.ts` | booking | 2026-09-08 |

## Domain Purpose

Lets an authenticated user reserve a room for a date range, and lets them see only their own
reservations — the core transaction of the booking app.

## Entities Owned

| Entity | Represents |
|---|---|
| [`bookings`](../../Schemas/schemas.md#bookings) | One user's reservation of one room for a date range |

## Invariants

- A booking's `check_out` is always strictly after `check_in` (Zod refine + DB `CHECK chk_dates`).
- A user can never read another user's booking (dual-enforced: route-level ownership check + repo-level `WHERE user_id = $1`).
- A booking can only be created for a room that exists (checked before conflict detection).

## Access Control

**Model**: Authentication + per-resource ownership check (not role-based — any authenticated user can book any room).

| Action | Access Condition | Enforced In |
|---|---|---|
| `GET /bookings` | Authenticated; results filtered to caller | `routes/bookings.ts:16` (`preHandler`) + `booking-repository.ts` `WHERE user_id = $1` |
| `POST /bookings` | Authenticated | `routes/bookings.ts:26` (`preHandler`) |
| `GET /bookings/:id` | Authenticated + `booking.userId === request.sessionUser.id` | `routes/bookings.ts:46` — non-owner gets `ForbiddenError` (404-vs-403 note below) |

## Business Rules

| BR-NN | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | Room must exist before a booking can be created | `services/booking-service.ts:21` (`NotFoundError`) | HIGH |
| BR-02 | No two `confirmed` bookings may overlap for the same room | `services/booking-service.ts:27-34` (`ConflictError`, "Room is not available for the requested dates") | CRITICAL |
| BR-03 | `check_out` must be strictly after `check_in` | `packages/shared-types/src/booking-schemas.ts:20-22` (Zod `.refine()`) + DB `chk_dates` | CRITICAL |
| BR-04 | A user may only view their own bookings | `routes/bookings.ts:46` + repo `WHERE user_id` | CRITICAL |
| BR-05 | New bookings default to `status: "confirmed"` | `db/schema/index.ts` default | MEDIUM |

## Safe vs Dangerous Changes

### Safe
- Adding a new read-only field to the `Booking` response shape that's already stored.
- Adding a new `GET` endpoint scoped by the existing ownership check pattern.

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Adding a cancel/update endpoint | Needs BR-04's ownership check re-applied, and a real state-machine decision for `status` | `cancelled_at`/`status: cancelled` exist in the schema but no code path sets them yet |
| Touching `hasConflict()` / the create sequence in `bookRoom` | Race condition | Check-then-insert is not atomic (see Known Error Scenarios) — a fix needs a DB-level constraint or `SELECT ... FOR UPDATE`, not just an app-level tweak |
| Changing 404-vs-403 behavior on `GET /bookings/:id` | Info leak vs UX | Route intentionally converts "not found" into `ForbiddenError` for non-owners so existence of another user's booking isn't confirmed by status code alone |

### Human Escalation Required
- Any schema change to `bookings.status` transitions — there is currently no cancellation flow at all.

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Room doesn't exist | 404 | `RoomRepository.findById` throws `NotFoundError` |
| Overlapping dates for same room | 409 | `hasConflict()` returns true |
| Booking not found | 404 | `BookingRepository.findById` throws |
| Non-owner reads a booking | 403 (not 404) | Route intentionally masks existence |
| **Race condition (unmitigated)** | Two overlapping bookings can both be created | `hasConflict()` check and `create()` are separate round-trips with no DB constraint or row lock between them — acknowledged in a code comment in `booking-service.ts` but not fixed |

## Testing Expectations

- `apps/api/src/services/booking-service.test.ts` covers the happy path and the conflict/not-found branches with mocked repositories (Tier 1).
- No Tier 2 integration test exists yet for the bookings routes.
- `e2e/reference/booking-flow.spec.ts` covers the happy path and a conflict scenario end-to-end.

## Forbidden Patterns

- Never return another user's booking body, even to explain a 403/404 — no partial leakage of `userId`, dates, or room.

## Key Files

- `apps/api/src/routes/bookings.ts`
- `apps/api/src/services/booking-service.ts`
- `apps/api/src/services/booking-service.test.ts`
- `apps/api/src/repositories/booking-repository.ts`
- `e2e/reference/booking-flow.spec.ts`

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0002 | Touching booking creation/listing, conflict detection, or the (currently missing) cancellation flow |
