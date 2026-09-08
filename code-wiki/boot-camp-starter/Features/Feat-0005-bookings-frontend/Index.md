---
feat_id: Feat-0005
feature: bookings-frontend
type: frontend-feature
domain: booking
criticality: high
touched_paths:
  - apps/web/src/routes/BookingPage.tsx
  - apps/web/src/routes/BookingsPage.tsx
  - apps/web/src/lib/api/bookings.ts
depends_on: [Feat-0002, Feat-0003, Feat-0004, Feat-0007]
consumed_by: []
implements: []
tags: [booking, reservation]
---

## Overview

| Type | Package | Path | Domain | Last updated |
|---|---|---|---|---|
| frontend-feature | apps/web | `src/routes/BookingPage.tsx`, `src/routes/BookingsPage.tsx`, `src/lib/api/bookings.ts` | booking | 2026-09-08 |

## What This Does for the User

Lets a logged-in user book a specific room for a date range, see a confirmation, and later view
the list of bookings they've made.

## Key User Flows

- **Book a room**: navigate to `/rooms/:id/book` → `BookingPage` fetches the room via `getRoom(id)` → user picks check-in/check-out dates → submits → `createBooking()` → on success shows a confirmation card with a "View my bookings" link; on failure shows the server's error message inline (e.g. "Room is not available for the requested dates").
- **View bookings**: navigate to `/bookings` → `BookingsPage` calls `listBookings()` → renders each booking with a status badge.

## UI States

| Condition | What Renders |
|---|---|
| `BookingPage.loading=true` (initial room fetch) | "Loading…" (`data-testid="booking-loading"`) |
| Room loaded, not yet confirmed | Booking form (check-in/check-out inputs, "Confirm booking" button) |
| Submitting | Button disabled, text → "Booking…" |
| `confirmed=true` | Success card, "Booking confirmed!" + "View my bookings" link |
| Submit error | Error message below the form (`data-testid="booking-error"`) |
| `BookingsPage.loading=true` | "Loading…" |
| `BookingsPage` fetch error | "Failed to load bookings." |
| `bookings.length === 0` | "No bookings yet." (`data-testid="bookings-page"`) |
| Booking row, `status="confirmed"` | Green badge |
| Booking row, `status="cancelled"` | Red badge (unreachable today — see Gaps, no cancel flow exists) |

## APIs Consumed

| Method | Path | Owning `Feat-NNNN` |
|---|---|---|
| GET | `/bookings` | Feat-0002 |
| POST | `/bookings` | Feat-0002 |
| GET | `/bookings/:id` | Feat-0002 |
| GET | `/rooms/:id` | Feat-0003 (used by `BookingPage` to load the room being booked) |

## State

No dedicated state slice — `BookingPage` and `BookingsPage` hold their own `useState` (`loading`,
`error`, `room`/`bookings`, `confirmed`). Auth state comes from [[Feat-0004]] via `useAuth()`
indirectly (through `ProtectedRoute`/`Nav`), not consumed directly by these pages.

## Business Rules (client-side mirror of backend rules)

- `checkOut` must be after `checkIn` — enforced again here via the same Zod schema
  (`CreateBookingRequestSchema`) as the backend (Feat-0002, BR-03); the HTML date input's `min`
  attribute additionally keeps `checkIn` from being in the past (`BookingPage.tsx:73`).

## Safe vs Dangerous Changes

### Safe
- Adding a new read-only column to the bookings list table.

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Adding a "Cancel booking" button | Needs a backend endpoint that doesn't exist yet | See Feat-0002's Dangerous Changes — the `status`/`cancelled_at` fields exist in the schema but no route sets them |

## Known Error Scenarios

| Scenario | What Renders | Root Cause |
|---|---|---|
| Booking conflict (409 from backend) | Server's error message shown inline | `createBooking()` rejects, caught in `BookingPage` |
| Room fetch fails | Silent redirect to `/rooms` | `BookingPage`'s `useEffect` catch block |

## Testing Expectations

- No test file exists for either page yet.
- `e2e/reference/booking-flow.spec.ts` covers the booking flow end-to-end (login → browse → book → confirm), including a conflict scenario.

## Forbidden Patterns

- Never call `fetch` directly — always go through `src/lib/api/bookings.ts`.

## Key Files

- `apps/web/src/routes/BookingPage.tsx`
- `apps/web/src/routes/BookingsPage.tsx`
- `apps/web/src/lib/api/bookings.ts`
- `e2e/reference/booking-flow.spec.ts`

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0005 | Touching the booking form, confirmation UI, or the bookings list page |

## Open Questions

- *Open question: is a booking-cancellation UI planned? The `cancelled` status and its red badge exist but nothing currently produces a cancelled booking.*
