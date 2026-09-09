---
feat_id: Feat-0006
feature: rooms-frontend
type: frontend-feature
domain: inventory
criticality: medium
touched_paths:
  - apps/web/src/routes/RoomsPage.tsx
  - apps/web/src/lib/api/rooms.ts
depends_on: [Feat-0003, Feat-0004, Feat-0007]
consumed_by: [Feat-0005]
implements: []
tags: [rooms, inventory]
---

## Overview

| Type | Package | Path | Domain | Last updated |
|---|---|---|---|---|
| frontend-feature | apps/web | `src/routes/RoomsPage.tsx`, `src/lib/api/rooms.ts` | inventory | 2026-09-08 |

## What This Does for the User

Shows the list of bookable rooms and lets the user start a booking for one.

## Key User Flows

- **Browse rooms**: navigate to `/rooms` → `listRooms()` on mount → grid of `RoomCard`s.
- **Start a booking**: click "Book this room" on a card → navigate to `/rooms/:id/book` (Feat-0005).

## UI States

| Condition | What Renders |
|---|---|
| `loading=true` | "Loading rooms…" |
| Fetch error | Red error message |
| `rooms.length > 0` | Grid of `RoomCard` components |
| `rooms.length === 0`, no error | Empty grid, no placeholder copy |
| `room.imageUrl != null` | `RoomCard` renders an `<img>`; otherwise the image is skipped |

## APIs Consumed

| Method | Path | Owning `Feat-NNNN` |
|---|---|---|
| GET | `/rooms` | Feat-0003 |
| GET | `/rooms/:id` | Feat-0003 (called from `BookingPage`, Feat-0005, not from this page) |

## State

No dedicated state slice — `useState` in `RoomsPage` (`rooms`, `loading`, `error`).

## Safe vs Dangerous Changes

### Safe
- Adding a new displayed field to `RoomCard` sourced from an existing `Room` field.

### Dangerous — Requires Review
- None specific to this feature beyond the shared booking-conflict risk owned by Feat-0002/Feat-0003.

## Known Error Scenarios

| Scenario | What Renders | Root Cause |
|---|---|---|
| `listRooms()` fails | "Failed to load rooms." | Generic catch in `RoomsPage`, no retry button |

## Testing Expectations

- No test file exists for this page yet.

## Forbidden Patterns

- Never call `fetch` directly — always go through `src/lib/api/rooms.ts`.

## Key Files

- `apps/web/src/routes/RoomsPage.tsx`
- `apps/web/src/lib/api/rooms.ts` — `listRooms(checkIn?, checkOut?)`, `getRoom(id)`

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0006 | Touching the room listing page or its card component |

## Open Questions

- *Open question: `listRooms()` accepts optional `checkIn`/`checkOut` query params (matching the backend's availability filter, Feat-0003 BR-01/BR-02), but `RoomsPage` never passes them — is date-filtered browsing intended for a future exercise, or is this dead code?*
