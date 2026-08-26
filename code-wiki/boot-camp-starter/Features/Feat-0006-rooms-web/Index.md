---
feat_id: Feat-0006
feature: rooms-web
type: frontend-feature
domain: rooms
criticality: medium
touched_paths:
  - apps/web/src/routes/RoomsPage.tsx
  - apps/web/src/lib/api/rooms.ts
depends_on: [Feat-0003-rooms-api, Feat-0007-shared-types]
consumed_by: [Feat-0005-bookings-web]
implements: []
tags: [rooms, catalog]
---

# Rooms (Web)

## Overview

| Field | Value |
|---|---|
| Type | frontend-feature |
| Package | `@boot-camp/web` |
| Path | `apps/web/src/routes/RoomsPage.tsx`, `lib/api/rooms.ts` |
| Domain | rooms |
| Last updated | 2026-08-26 |

## What This Does for the User

Shows the participant a grid of bookable rooms with a link into the booking flow for each.

## Key User Flows

- **Browse rooms**: `/rooms` mounts → `listRooms()` (`GET /rooms`) → renders a card per room.
- **Start a booking**: user clicks "Book this room" on a card → navigates to `/rooms/:id/book`
  (owned by [Feat-0005-bookings-web](../Feat-0005-bookings-web/Index.md)).

## UI States

| Condition | What Renders |
|---|---|
| Fetch in flight | "Loading rooms…" |
| Fetch fails | Red error message |
| Fetch succeeds, empty list | Nothing rendered — **no explicit "no rooms" empty-state message** |
| Fetch succeeds, non-empty | Grid of room cards: name, description, capacity, price (formatted `$X.XX`/night), optional image |

## APIs Consumed

| Method | Path | Owning `Feat-NNNN` |
|---|---|---|
| GET | `/rooms` | [Feat-0003-rooms-api](../Feat-0003-rooms-api/Index.md) |
| GET | `/rooms/:id` | [Feat-0003-rooms-api](../Feat-0003-rooms-api/Index.md) — called from `BookingPage`, not this page |

`listRooms()` accepts optional `checkIn`/`checkOut` params matching the backend's availability
filter (BR-01 in [Feat-0003-rooms-api](../Feat-0003-rooms-api/Index.md)), but `RoomsPage` **never
passes them** — there is no date-range filter UI on this page today, so every room is always shown
regardless of actual availability for any given date range.

## State

Local `useState` only: `rooms: Room[]`, `loading: boolean`, `error: string | null`.

## Access Control

Wrapped in `ProtectedRoute` (see [Feat-0004-auth-web](../Feat-0004-auth-web/Index.md)) —
unauthenticated users never reach this page.

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| `GET /rooms` fails | Red error message shown | `RoomsPage.tsx` |

## Testing Expectations

*Open question: no test files found under `apps/web/src` (same gap noted in
[Feat-0004-auth-web](../Feat-0004-auth-web/Index.md) and
[Feat-0005-bookings-web](../Feat-0005-bookings-web/Index.md)).*

## Forbidden Patterns

- Never assume date-range availability filtering is wired up on this page — the API supports it
  (`checkIn`/`checkOut` query params), the frontend client supports passing them, but the page
  itself never does. Don't build on top of "rooms shown here are available for X dates" without
  first adding that filter.

## Key Files

- `apps/web/src/routes/RoomsPage.tsx` — room grid, loading/error states, `RoomCard` subcomponent
- `apps/web/src/lib/api/rooms.ts` — `listRooms`/`getRoom` wrappers
- `packages/shared-types/src/room-schemas.ts` — `Room`, `RoomListQuery`, `RoomListResponse` types

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0006-rooms-web | touching the room catalog grid or the room-card link into booking |

| Workflow | Sections to load |
|---|---|
| `/pr-review-frontend` on a rooms UI change | UI States, Forbidden Patterns |
