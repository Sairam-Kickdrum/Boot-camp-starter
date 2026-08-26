---
feat_id: Feat-0005
feature: bookings-web
type: frontend-feature
domain: bookings
criticality: high
touched_paths:
  - apps/web/src/routes/BookingPage.tsx
  - apps/web/src/routes/BookingsPage.tsx
  - apps/web/src/lib/api/bookings.ts
depends_on: [Feat-0002-bookings-api, Feat-0006-rooms-web, Feat-0007-shared-types]
consumed_by: []
implements: []
tags: [bookings, reservations]
---

# Bookings (Web)

## Overview

| Field | Value |
|---|---|
| Type | frontend-feature |
| Package | `@boot-camp/web` |
| Path | `apps/web/src/routes/BookingPage.tsx`, `BookingsPage.tsx`, `lib/api/bookings.ts` |
| Domain | bookings |
| Last updated | 2026-08-26 |

## What This Does for the User

Lets a participant book a room for a date range from `BookingPage`, and see their own reservations
with status badges on `BookingsPage`.

## Key User Flows

- **Book a room**: arrive at `/rooms/:id/book` (from [Feat-0006-rooms-web](../Feat-0006-rooms-web/Index.md))
  → page fetches the room via `getRoom(id)` → user picks check-in/check-out dates → submits →
  `createBooking()` (`POST /bookings`) → on success, shows a green confirmation card with a "View
  my bookings" link to `/bookings`.
- **View bookings**: `/bookings` loads via `listBookings()` (`GET /bookings`) on mount → renders a
  row per booking with a status badge.

## UI States

| Condition | What Renders |
|---|---|
| `BookingPage` room fetch in flight | "Loading…" |
| `BookingPage` room fetch fails | User redirected to `/rooms` |
| `BookingPage` submit in flight | Button disabled, text → "Booking…" |
| `BookingPage` booking created | Green success card (room name + dates), link to `/bookings` |
| `BookingPage` booking creation fails (e.g. 409 conflict) | Red error message below the form; user can retry — **no distinction shown between a date conflict, a validation error, or a server error** (all rendered via generic `err.message`) |
| `BookingsPage` fetch in flight | "Loading…" |
| `BookingsPage` fetch fails | Red error message |
| `BookingsPage` fetch succeeds, empty | "No bookings yet" (gray) |
| Booking row, `status = "confirmed"` | Green badge |
| Booking row, `status = "cancelled"` | Red badge — **currently unreachable**: no backend route ever produces a cancelled booking (see [Feat-0002-bookings-api](../Feat-0002-bookings-api/Index.md) Status/State Machine) |

Date-range validity (`checkOut > checkIn`) is enforced only via the native HTML5 `<input
type="date" min=...>` attribute on `BookingPage` — not re-validated in JS before submit, and not
checked against actual room availability client-side; the backend's 409 response is the real
availability check.

## APIs Consumed

| Method | Path | Owning `Feat-NNNN` |
|---|---|---|
| GET | `/bookings` | [Feat-0002-bookings-api](../Feat-0002-bookings-api/Index.md) |
| POST | `/bookings` | [Feat-0002-bookings-api](../Feat-0002-bookings-api/Index.md) |
| GET | `/bookings/:id` | [Feat-0002-bookings-api](../Feat-0002-bookings-api/Index.md) — client wrapper `getBooking()` exists in `lib/api/bookings.ts` but **is not called anywhere in the UI** |

## State

Local `useState` only, per page — no shared store:
- `BookingPage`: `room`, `checkIn`, `checkOut`, `error`, `loading`, `confirmed`
- `BookingsPage`: `bookings`, `loading`, `error`

## Access Control

Both pages are wrapped in `ProtectedRoute` (see [Feat-0004-auth-web](../Feat-0004-auth-web/Index.md))
— unauthenticated users are redirected to `/login` before either page renders. No role-based
rendering; `user.role` is not read here.

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Room fetch fails on `BookingPage` mount | Silent redirect to `/rooms` | `BookingPage.tsx:20` |
| `POST /bookings` returns 409 (date conflict) | Generic red error text, no retry-with-different-dates guidance | `BookingPage.tsx:33-34` |
| `GET /bookings` fails | Red error message, no retry button | `BookingsPage.tsx:14` |

## Testing Expectations

*Open question: no test files found under `apps/web/src` (see [Feat-0004-auth-web](../Feat-0004-auth-web/Index.md)
for the same gap). `BookingPage`'s date-conflict and confirmation flows, and `BookingsPage`'s
empty/error states, are exactly the non-trivial UI logic `.claude/rules/testing-standards.md`
(TEST-09) calls for coverage on.*

## Forbidden Patterns

- Never assume a cancel-booking UI action exists — `BookingsPage` is read-only today; there is no
  cancel button and no backend route to call if one were added (see
  [Feat-0002-bookings-api](../Feat-0002-bookings-api/Index.md)).
- Never rely on the HTML5 `min` date attribute as the source of truth for date validity — it's a
  UX nicety only; the backend `CHECK` constraint and conflict check are the real enforcement.

## Key Files

- `apps/web/src/routes/BookingPage.tsx` — booking creation form and confirmation state
- `apps/web/src/routes/BookingsPage.tsx` — read-only list of the user's bookings
- `apps/web/src/lib/api/bookings.ts` — `listBookings`/`createBooking`/`getBooking` wrappers
- `packages/shared-types/src/booking-schemas.ts` — `Booking`, `CreateBookingRequest` types

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0005-bookings-web | touching the booking form, confirmation flow, or the bookings list UI |

| Workflow | Sections to load |
|---|---|
| `/pr-review-frontend` on a bookings UI change | UI States, Known Error Scenarios, Forbidden Patterns |
