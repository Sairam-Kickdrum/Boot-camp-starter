---
feat_id: Feat-0003
feature: shared-types
type: shared-library
domain: room-booking
criticality: high
touched_paths:
  - packages/shared-types/src
depends_on: []
consumed_by: [Feat-0001, Feat-0002]
implements: []
tags: [contracts, validation]
---

## Overview

| Field | Value |
|---|---|
| Type | shared-library |
| Package | `@boot-camp/shared-types` |
| Path | `packages/shared-types/` |
| Domain | room-booking |
| Last updated | 2026-08-26 |

## Domain Purpose

The single place every request/response shape crossing the API boundary is defined, as Zod
schemas with inferred TypeScript types — so Feat-0001 and Feat-0002 can never silently drift on
a field name, type, or validation rule.

## Entities Owned

Not applicable — this package holds no persisted entities, only validation schemas and the
types inferred from them. See `Schemas/schemas.md` for the actual database entities these
schemas shape requests/responses around.

## Invariants

- Every schema here is the **only** definition of its shape — neither Feat-0001 nor Feat-0002
  may redeclare a request/response type independently.
- `CreateBookingRequestSchema` enforces `checkOut > checkIn` via Zod `.refine()` — this is a
  client-side/pre-network mirror of the DB's `chk_dates` CHECK constraint (see
  `Schemas/schemas.md#bookings`); the DB constraint remains authoritative.

## Business Rules

| ID | Rule | Enforced In | Severity |
|---|---|---|---|
| BR-01 | `CreateBookingRequestSchema`: `checkOut` must be strictly after `checkIn` | `packages/shared-types/src/booking-schemas.ts` | HIGH |
| BR-02 | `LoginRequestSchema.password`: 1–256 characters | `packages/shared-types/src/auth-schemas.ts` | LOW |
| BR-03 | `LoginRequestSchema.email` / `CurrentUserResponseSchema.email`: must be valid email format | `packages/shared-types/src/auth-schemas.ts` | LOW |

## Exports

| Schema | Shape | Used By |
|---|---|---|
| `LoginRequestSchema` / `LoginRequest` | `{ email, password }` | Feat-0001 (`POST /auth/login` validation) |
| `CurrentUserResponseSchema` / `CurrentUserResponse` | `{ id, email, displayName, role }` | Feat-0001 (`GET /me` response), Feat-0002 (`AuthContext`, API client) |
| `RoomSchema` / `Room` | `{ id, name, description, pricePerNightCents, capacity, imageUrl, createdAt }` | Feat-0002 (room display) |
| `RoomListQuerySchema` / `RoomListQuery` | `{ checkIn?, checkOut? }` | Feat-0001 (`GET /rooms` validation) |
| `RoomListResponseSchema` / `RoomListResponse` | `{ rooms: Room[] }` | Feat-0001 (response), Feat-0002 (`listRooms()`) |
| `BookingStatusSchema` / `BookingStatus` | `"confirmed" \| "cancelled"` | used inside `BookingSchema` |
| `BookingSchema` / `Booking` | `{ id, userId, roomId, checkIn, checkOut, status, createdAt, cancelledAt }` | Feat-0001 (route responses), Feat-0002 (`BookingsPage`, API client) |
| `CreateBookingRequestSchema` / `CreateBookingRequest` | `{ roomId, checkIn, checkOut }` (refined: `checkOut > checkIn`) | Feat-0001 (`POST /bookings` validation, `booking-service.ts` parameter type), Feat-0002 (`createBooking()`) |
| `BookingListResponseSchema` / `BookingListResponse` | `{ bookings: Booking[] }` | Feat-0001 (response), Feat-0002 (`listBookings()`) |

## Safe vs Dangerous Changes

### Safe
- Adding a new optional field to a response schema (backward-compatible for existing consumers)
- Adding a brand-new schema for a brand-new endpoint

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Renaming or removing a field on any exported schema | Breaks both Feat-0001 (validation/response typing) and Feat-0002 (typed fetch calls) at once | This is the only shared contract layer — GEN-07 in `.claude/rules/general-quality.md` applies directly |
| Changing `CreateBookingRequestSchema`'s date refine | Silently loosens or tightens what the frontend can submit before ever reaching the DB `CHECK` constraint | Must stay at least as strict as `chk_dates` in `db/schema/index.ts`, or the two layers disagree |
| Tightening `role` enum or adding a new role value | Breaks `Feat-0001`'s `requireRole()` call sites and any frontend code branching on `role` | Currently `"user" | "admin"` only |

### Human Escalation Required
- Any breaking change to a schema already used by a shipped endpoint — this repo has no schema
  versioning, so a breaking change here is a breaking change to the whole app, atomically.

## Testing Expectations

No dedicated test file exists for `packages/shared-types` — *Open question: should Zod refine
logic like the booking date check have direct unit tests, given two different consumers rely on
its exact behavior?*

## Forbidden Patterns
- Never redeclare a request/response TypeScript interface in `apps/api` or `apps/web` — import
  the inferred type from here instead (per the repo's own CLAUDE.md: "Never duplicate type
  definitions").

## Key Files
- `packages/shared-types/src/index.ts` — re-exports everything
- `packages/shared-types/src/auth-schemas.ts` — login request, current-user response
- `packages/shared-types/src/room-schemas.ts` — room shape, list query, list response
- `packages/shared-types/src/booking-schemas.ts` — booking shape, create request, list response

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0003 (this page) | any change to `packages/shared-types/**`, or any cross-boundary field/shape question |
| Feat-0001 | need the backend route that validates against a given schema |
| Feat-0002 | need the frontend call site that consumes a given type |

| Workflow | Sections to load |
|---|---|
| `/plan` impact analysis (any API contract change) | Exports, Safe vs Dangerous Changes |
| GEN-07 contract-consistency review | Exports table (cross-check field names/enum values against both consumers) |
