---
feat_id: Feat-0003
feature: rooms-backend
type: backend-service
domain: inventory
criticality: medium
touched_paths:
  - apps/api/src/routes/rooms.ts
  - apps/api/src/services/room-service.ts
  - apps/api/src/repositories/room-repository.ts
depends_on: [Feat-0001, Feat-0007]
consumed_by: [Feat-0002, Feat-0005, Feat-0006]
implements: []
tags: [rooms, inventory, availability]
---

## Overview

| Type | Package | Path | Domain | Last updated |
|---|---|---|---|---|
| backend-service | apps/api | `apps/api/src/routes/rooms.ts`, `services/room-service.ts`, `repositories/room-repository.ts` | inventory | 2026-09-08 |

## Domain Purpose

Lists bookable rooms and their availability for a date range. Read-only from the HTTP layer — this
codebase has no room-management (create/update/delete) endpoints.

## Entities Owned

| Entity | Represents |
|---|---|
| [`rooms`](../../Schemas/schemas.md#rooms) | A bookable accommodation unit |

## Invariants

- Rooms are read-only via HTTP — no `POST`/`PUT`/`DELETE` route exists for `rooms`.
- Only `confirmed` bookings count against availability; `cancelled` ones don't (though nothing currently sets `cancelled`, see Feat-0002).
- A room referenced by any booking cannot be deleted at the DB level (`ON DELETE NO ACTION`).

## Access Control

**Model**: Authentication only — every authenticated user sees every room; no ownership or role gating.

| Action | Access Condition | Enforced In |
|---|---|---|
| `GET /rooms` | Authenticated | `routes/rooms.ts:9` (`preHandler`) |
| `GET /rooms/:id` | Authenticated | `routes/rooms.ts:20` (`preHandler`) |

## Business Rules

| BR-NN | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | A room is unavailable for a date range if a `confirmed` booking overlaps it | `repositories/room-repository.ts:16-30` | HIGH |
| BR-02 | Overlap test: `checkIn <= existingCheckOut AND checkOut >= existingCheckIn` | `repositories/room-repository.ts:22-24` | HIGH |
| BR-03 | `pricePerNightCents` and `capacity` must be positive integers | `packages/shared-types/src/room-schemas.ts:7-8` (Zod only — **no DB `CHECK`**) | MEDIUM |
| BR-04 | `imageUrl`, if present, must be a well-formed URL | `packages/shared-types/src/room-schemas.ts:9` (Zod only, no reachability check) | LOW |

## Safe vs Dangerous Changes

### Safe
- Adding a new read-only field to the room listing response, backed by an existing column.

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Adding room create/update/delete endpoints | New attack surface, and interacts with the FK `ON DELETE NO ACTION` on `bookings.room_id` | Deleting a room with existing bookings currently fails at the DB level with no friendly error — the route would need explicit 409 handling per the repo's Drizzle null-guard/cascade-handling convention |
| Changing the overlap query (BR-02) | Silent double-booking or false unavailability | This is the sole gate on room availability |

### Human Escalation Required
- Adding DB-level `CHECK` constraints for `pricePerNightCents`/`capacity` positivity, since it touches a migration on a shared table.

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| `GET /rooms/:id` for a nonexistent id | 404 | `RoomRepository.findById` throws `NotFoundError` |
| Booking a room whose id doesn't exist | 404 (surfaced by Feat-0002) | Same repository method, called from `BookingService.bookRoom` |

## Testing Expectations

- No test file currently exists for `room-service.ts` or `room-repository.ts` — this is a gap.

## Forbidden Patterns

- Never trust `pricePerNightCents`/`capacity` positivity from Zod alone if a future write path bypasses the API layer (e.g. a seed script or admin tool) — the DB has no constraint backing it up.

## Key Files

- `apps/api/src/routes/rooms.ts`
- `apps/api/src/services/room-service.ts` — thin pass-through to the repository
- `apps/api/src/repositories/room-repository.ts` — availability filtering logic

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0003 | Touching room listing/availability, or the room ↔ booking FK behavior |
