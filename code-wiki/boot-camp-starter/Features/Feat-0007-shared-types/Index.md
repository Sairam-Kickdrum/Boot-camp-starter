---
feat_id: Feat-0007
feature: shared-types
type: shared-library
domain: cross-cutting
criticality: high
touched_paths:
  - packages/shared-types/src/index.ts
  - packages/shared-types/src/auth-schemas.ts
  - packages/shared-types/src/room-schemas.ts
  - packages/shared-types/src/booking-schemas.ts
depends_on: []
consumed_by: [Feat-0001, Feat-0002, Feat-0003, Feat-0004, Feat-0005, Feat-0006]
implements: []
tags: [zod, contracts, shared]
---

## Overview

| Type | Package | Path | Domain | Last updated |
|---|---|---|---|---|
| shared-library | packages/shared-types | `packages/shared-types/src/*.ts` | cross-cutting | 2026-09-08 |

## Domain Purpose

The single source of truth for every request/response shape in the system. Every schema is a Zod
object; every TypeScript type is `z.infer<>` of one of those schemas — never hand-written
separately. `apps/api` uses the schemas at runtime (`.parse()`); `apps/web` uses the inferred types
only (no runtime validation on the frontend).

## Entities Owned

These are API contract shapes, not database entities — see [`Schemas/schemas.md`](../../Schemas/schemas.md)
for the actual `users`/`rooms`/`bookings` tables these contracts sit in front of.

| Schema | Shape |
|---|---|
| `LoginRequest` | `{ email: string (email format), password: string (1-256 chars) }` |
| `CurrentUserResponse` | `{ id: uuid, email: string, displayName: string \| null, role: "user" \| "admin" }` |
| `Room` | `{ id: uuid, name, description: string \| null, pricePerNightCents: positive int, capacity: positive int, imageUrl: url \| null, createdAt: ISO datetime }` |
| `RoomListQuery` | `{ checkIn?: ISO date, checkOut?: ISO date }` |
| `RoomListResponse` | `{ rooms: Room[] }` |
| `BookingStatus` | `"confirmed" \| "cancelled"` |
| `Booking` | `{ id, userId, roomId: uuid, checkIn, checkOut: ISO date, status: BookingStatus, createdAt: ISO datetime, cancelledAt: ISO datetime \| null }` |
| `CreateBookingRequest` | `{ roomId: uuid, checkIn, checkOut: ISO date }` — refined: `checkOut` must be strictly after `checkIn` |
| `BookingListResponse` | `{ bookings: Booking[] }` |

## Invariants

- Every API request/response shape in the system is validated against a schema defined here — there is no second, competing definition anywhere else in the repo.
- TS types are always `z.infer<>` — never hand-duplicated.
- Frontend and backend import the exact same type for a given payload; there is no separate DTO/mapper layer (per `GEN-07`/API-contract-consistency in the repo's review rules — a shape change here must be checked against every consumer below).

## Architectural Decisions

| Decision | Reason | Do Not Change Without |
|---|---|---|
| Single shared Zod package instead of separate frontend/backend DTOs | Removes an entire class of contract-drift bug (field name/enum mismatches between client and server) | Reviewing every consumer listed below |

## Safe vs Dangerous Changes

### Safe
- Adding a new optional field to a response schema (additive, non-breaking for existing consumers).

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Renaming or removing any field | Breaks every consumer at once, often silently on the frontend (no runtime validation there) | 12+ import sites across both apps (see Dependencies) |
| Changing an enum's values (`role`, `BookingStatus`) | Breaks both sides simultaneously | No compiler error on the frontend if a string literal type just narrows differently — this is a runtime-parse-only guard on the backend |
| Tightening a refinement (e.g. `CreateBookingRequestSchema`'s date check) | Backend starts rejecting requests the frontend still sends | Frontend has no independent validation to catch this before the request goes out |

## Dependencies (Consumers)

| Schema/Type | Consumers |
|---|---|
| `LoginRequestSchema` | Feat-0001 |
| `CurrentUserResponse` | Feat-0001, Feat-0004 |
| `RoomListQuerySchema`, `RoomListResponse`, `Room` | Feat-0003, Feat-0006, Feat-0005 (`BookingPage` uses `Room`) |
| `CreateBookingRequestSchema`/`CreateBookingRequest` | Feat-0002, Feat-0005 |
| `BookingListResponse`, `Booking` | Feat-0002, Feat-0005 |

## Testing Expectations

- No test file exists for the schemas themselves (e.g. asserting the `checkOut > checkIn` refinement rejects bad input) — this is a gap.

## Key Files

- `packages/shared-types/src/index.ts` — re-exports everything
- `packages/shared-types/src/auth-schemas.ts`
- `packages/shared-types/src/room-schemas.ts`
- `packages/shared-types/src/booking-schemas.ts`

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0007 | Changing any request/response shape — load this **and** every consumer feature listed above before editing |

## Open Questions

- *Open question: no test coverage found for the Zod refinements themselves — is that intentional (covered indirectly by service tests) or a gap to backfill?*
