---
feat_id: Feat-0003
feature: rooms-api
type: backend-service
domain: rooms
criticality: medium
touched_paths:
  - apps/api/src/routes/rooms.ts
  - apps/api/src/services/room-service.ts
  - apps/api/src/repositories/room-repository.ts
depends_on: [Feat-0001-auth-api]
consumed_by: [Feat-0002-bookings-api, Feat-0006-rooms-web]
implements: []
tags: [rooms, availability]
---

# Rooms (API)

## Overview

| Field | Value |
|---|---|
| Type | backend-service |
| Package | `@boot-camp/api` |
| Path | `apps/api/src/routes/rooms.ts`, `services/room-service.ts`, `repositories/room-repository.ts` |
| Domain | rooms |
| Last updated | 2026-08-26 |

## Domain Purpose

Serves the catalog of bookable rooms and, given a date range, which rooms are actually available
to book.

## Entities Owned

| Entity | Represents |
|---|---|
| [`rooms`](../../Schemas/schemas.md#rooms) | A bookable room — immutable through the API |

## Invariants

- Rooms are never created, updated, or deleted through any API route — read-only surface.
- `GET /rooms` and `GET /rooms/:id` both require authentication; there is no public/anonymous
  room listing.

## Access Control

**Model**: authentication only (`requireAuth`) — no ownership or role dimension, since rooms are
a shared resource, not per-user data.

| Action | Access Condition | Enforced In |
|---|---|---|
| `GET /rooms` | authenticated | `apps/api/src/routes/rooms.ts:9` |
| `GET /rooms/:id` | authenticated | `apps/api/src/routes/rooms.ts:20` |

## Business Rules

| BR-NN | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | A room is "available" for a date range iff it has no `confirmed` booking whose `[checkIn, checkOut]` overlaps the query range | `apps/api/src/repositories/room-repository.ts:10-30` | HIGH |
| BR-02 | Overlap definition: `bookings.check_in <= queryCheckOut AND bookings.check_out >= queryCheckIn` | `apps/api/src/repositories/room-repository.ts:20-24` | HIGH |
| BR-03 | If no `checkIn`/`checkOut` query params are given, `GET /rooms` returns every room unfiltered | `apps/api/src/repositories/room-repository.ts:11-13` | MEDIUM |
| BR-04 | `GET /rooms/:id` for a non-existent id throws `NotFoundError` → 404 | `apps/api/src/repositories/room-repository.ts:33-36` | MEDIUM |
| BR-05 | `pricePerNightCents`/`capacity` positivity is validated only at the Zod layer, not a DB `CHECK` — see [`schemas.md`](../../Schemas/schemas.md#rooms) open question | *(Zod only)* | LOW |

## External Integrations

*None found.*

## API Endpoints

| Method | Path | Auth | Who Uses It | Description |
|---|---|---|---|---|
| GET | `/rooms` | `requireAuth` | [Feat-0006-rooms-web](../Feat-0006-rooms-web/Index.md) | List rooms, optionally filtered to those available for `checkIn`/`checkOut` |
| GET | `/rooms/:id` | `requireAuth` | [Feat-0006-rooms-web](../Feat-0006-rooms-web/Index.md) (via `BookingPage`) | Fetch a single room's details |

## Safe vs Dangerous Changes

### Safe
- Adding a new read-only field to the `Room` response shape.
- Adding an index that speeds up the overlap subquery without changing its semantics.

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Adding a create/update/delete route for rooms | Currently no such route exists anywhere — any addition needs its own auth model decision (should it be `requireRole("admin")`, given that primitive is unused today?) | See [Feat-0001-auth-api](../Feat-0001-auth-api/Index.md) BR-05 |
| Changing the overlap-detection query | Directly changes what "available" means for booking creation | [Feat-0002-bookings-api](../Feat-0002-bookings-api/Index.md) depends on room existence via `roomRepo.findById`, and the frontend's availability filtering assumes this query's current semantics |

### Human Escalation Required
- Any change to the availability-overlap SQL — it's the only definition of "available" in the
  system and has no test coverage found in the scan.

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Room id doesn't exist | 404 `NotFoundError` | `room-repository.ts:35` |
| No/invalid session | 401 | `plugins/auth.ts` (see [Feat-0001-auth-api](../Feat-0001-auth-api/Index.md)) |

## Testing Expectations

*Open question: no test file was found for `room-service.ts`, `room-repository.ts`, or
`routes/rooms.ts` in the scan. Per `.claude/rules/testing-standards.md`, the availability-overlap
query (BR-01/BR-02) is exactly the kind of business logic that should have a Tier 1 or Tier 2 test
— it's a date-boundary condition, which is a classic source of off-by-one bugs.*

## Forbidden Patterns

- Never assume rooms can be mutated through the API — there is no such route; a "create room"
  feature is new work, not an existing capability to extend.

## Key Files

- `apps/api/src/routes/rooms.ts` — route handlers, `toRoom` response mapper
- `apps/api/src/services/room-service.ts` — thin pass-through to the repository
- `apps/api/src/repositories/room-repository.ts` — Drizzle queries, overlap-filtering subquery
- `packages/shared-types/src/room-schemas.ts` — Zod schemas
- `db/schema/index.ts`, `db/migrations/0000_far_warhawk.sql` — table definition

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0003-rooms-api | touching room listing, availability filtering, or the rooms table |

| Workflow | Sections to load |
|---|---|
| `/pr-review-backend` on a rooms change | Business Rules, Safe vs Dangerous Changes |
| `/plan` impact analysis touching room availability | Business Rules BR-01/BR-02, Dependencies (consumed_by) |
