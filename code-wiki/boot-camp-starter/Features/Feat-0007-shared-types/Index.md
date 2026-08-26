---
feat_id: Feat-0007
feature: shared-types
type: shared-library
domain: contracts
criticality: high
touched_paths:
  - packages/shared-types/src/index.ts
  - packages/shared-types/src/auth-schemas.ts
  - packages/shared-types/src/room-schemas.ts
  - packages/shared-types/src/booking-schemas.ts
depends_on: []
consumed_by: [Feat-0001-auth-api, Feat-0002-bookings-api, Feat-0003-rooms-api, Feat-0004-auth-web, Feat-0005-bookings-web, Feat-0006-rooms-web]
implements: []
tags: [schemas, contracts, zod]
---

# Shared Types

## Overview

| Field | Value |
|---|---|
| Type | shared-library |
| Package | `@boot-camp/shared-types` |
| Path | `packages/shared-types/src/` |
| Domain | contracts |
| Last updated | 2026-08-26 |

## Domain Purpose

The single source of truth for request/response/entity shapes shared between `apps/api` and
`apps/web` — Zod schemas plus their inferred TypeScript types, so validation (backend) and typed
fetch calls (frontend) never drift from each other or get duplicated. Per root `CLAUDE.md`: "Never
duplicate type definitions."

## Entities Owned

This package defines no database entities — it re-derives request/response shapes from the DB
entities owned elsewhere. See [`schemas.md`](../../Schemas/schemas.md) for the actual tables.

| Schema | Mirrors |
|---|---|
| `CurrentUserResponse` | [`users`](../../Schemas/schemas.md#users) (subset — excludes `password_hash`, `cognito_sub`) |
| `Room`, `RoomListQuery`, `RoomListResponse` | [`rooms`](../../Schemas/schemas.md#rooms) |
| `Booking`, `CreateBookingRequest`, `BookingListResponse`, `BookingStatus` | [`bookings`](../../Schemas/schemas.md#bookings) |
| `LoginRequest` | *(no table — login credentials only)* |

## Invariants

- Every UUID field is validated as RFC 4122 format; every email field as email format; every date
  field as ISO 8601 date; every datetime field as ISO 8601 datetime.
- `CreateBookingRequest` enforces `checkOut > checkIn` via a Zod `.refine()` — this is the
  frontend-side mirror of the backend's DB `CHECK chk_dates` constraint
  ([Feat-0002-bookings-api](../Feat-0002-bookings-api/Index.md) BR-01); the two must be kept in
  sync if the date-range rule ever changes.
- `role` is constrained to the same two values as the DB enum: `"user" | "admin"`.
- `Room.pricePerNightCents`/`capacity` must be positive integers — this is the **only** place
  either constraint is enforced (no DB `CHECK`, see
  [Feat-0003-rooms-api](../Feat-0003-rooms-api/Index.md) BR-05).

## Business Rules

| BR-NN | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | `CreateBookingRequest.checkOut` must be after `checkIn` | `booking-schemas.ts:20-22` | HIGH |
| BR-02 | `Room.pricePerNightCents` and `Room.capacity` must be positive | `room-schemas.ts:7-8` | MEDIUM |
| BR-03 | `LoginRequest.password` must be 1–256 characters | `auth-schemas.ts:5` | LOW |

## Safe vs Dangerous Changes

### Safe
- Adding a new optional field to any response schema (backward-compatible for existing consumers).
- Tightening a validation bound that's already stricter than what the DB allows (e.g. narrowing
  `password` length further within the existing 1–256 range).

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Renaming or removing a field on any schema | Breaks every consumer at once (6 consumers across both apps) | Per root `CLAUDE.md`'s GEN-07 contract rule — verify every route/DTO and every frontend fetch call before merging |
| Changing an enum's allowed values (`role`, `BookingStatus`) | Must stay in sync with the DB `pgEnum` definitions in `db/schema/index.ts` | A mismatch here means valid DB rows fail frontend/backend validation, or vice versa |
| Loosening the `checkOut > checkIn` refinement | Directly weakens BR-01 above, which mirrors a DB constraint | The DB `CHECK` still catches it server-side, but the frontend would show a broken/confusing state instead of a clean validation error |

### Human Escalation Required
- Any schema field removal — this package has no versioning strategy (see Gaps), so there is no
  graceful deprecation path; a removal is a breaking change the instant it merges.

## Testing Expectations

*Open question: no test files found for any schema in this package. Schema-level tests (e.g.
"a checkOut before checkIn is rejected", "capacity of 0 is rejected") would be cheap Tier 1
coverage and would pin the business rules above.*

## Forbidden Patterns

- Never redefine a type in `apps/api` or `apps/web` that already exists here — import it instead
  (the whole point of this package, per root `CLAUDE.md`).
- Never let a DB `pgEnum` and this package's corresponding Zod `z.enum()` drift — they must list
  the same values in the same order of intent, even though Zod won't enforce db-level sync
  automatically.

## Key Files

- `packages/shared-types/src/index.ts` — re-exports everything
- `packages/shared-types/src/auth-schemas.ts` — `LoginRequest`, `CurrentUserResponse`
- `packages/shared-types/src/room-schemas.ts` — `Room`, `RoomListQuery`, `RoomListResponse`
- `packages/shared-types/src/booking-schemas.ts` — `Booking`, `BookingStatus`,
  `CreateBookingRequest`, `BookingListResponse`

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0007-shared-types | touching any request/response shape shared between `apps/api` and `apps/web` |

| Workflow | Sections to load |
|---|---|
| `/pr-review-backend` or `/pr-review-frontend` on any API-contract change | Safe vs Dangerous Changes, Business Rules |
| `/plan` impact analysis for a schema field change | Dependencies (consumed_by — every other feature) |
