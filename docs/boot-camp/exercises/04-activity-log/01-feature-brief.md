> **Start here.** Read this document fully before opening any other file in this exercise.

# Feature Brief: Activity Log

**Tier:** Standard (AI-SDLC Mode 2)
**Module:** Boot Camp Starter — Room Booking App
**Author (PM):** Boot Camp Facilitator
**Date:** 2026-06-04
**Linear Ticket:** BOOTCAMP-4
**Prototype:** Scaffold running at `http://localhost:5173/bookings`

---

## What

A chronological event timeline for every booking, tracking all lifecycle events. Every time a booking changes state — created, cancelled, or dates modified — an immutable record is written to a new `booking_events` table. A new `GET /bookings/:id/events` endpoint returns the event timeline for a booking (owner-only, ascending order). A new Booking Detail page at `/bookings/:id` renders that timeline, and the My Bookings page gets a "View details" link on each row.

---

## Who

**Primary:** Any logged-in user who owns one or more bookings and wants to see a full read-only history of changes to their bookings.

---

## Where

**Two surfaces:**

1. **`/bookings` — My Bookings page** (`apps/web/src/routes/BookingsPage.tsx`) — gains a "View details" link per booking row.
2. **`/bookings/:id` — Booking Detail page** (`apps/web/src/routes/BookingDetailPage.tsx`) — new page that renders the event timeline for a single booking in chronological order.

---

## Approach

A new `booking_events` table captures append-only event records. The event write happens **inside `BookingService`** — immediately after each DB mutation succeeds, and **synchronously** (not fire-and-forget). No route handler ever writes events directly.

This exercise builds on the patterns established in Exercises 01 and 02:
- Exercise 01 added `cancelBooking()` to `BookingService` — this exercise hooks into that method to write a `booking_cancelled` event.
- Exercise 02 added `modifyDates()` to `BookingService` — this exercise hooks into that method to write a `dates_modified` event.
- The initial `bookRoom()` method (scaffold) also gets a hook to write a `booking_created` event.

Each event captures a `metadata` JSONB snapshot relevant to that event type — the snapshot is immutable once written.

---

## What's New

- **New DB table + migration?** Yes — `booking_events` table, Drizzle migration required.
- **New repository?** Yes — `BookingEventRepository` (append-only: `insert` and `listForBooking` only).
- **Extends BookingService?** Yes — cross-cutting hook pattern: `BookingEventRepository` injected via constructor; event writes added after each mutation in `bookRoom()`, `cancelBooking()`, and `modifyDates()`.
- **New route?** Yes — `GET /bookings/:id/events` with ownership check.
- **New page?** Yes — `BookingDetailPage` at `/bookings/:id`.
- **Extends existing screen?** Yes — `BookingsPage.tsx` gets a "View details" link per row.

---

## Prototype Reference

Run the scaffold locally:
```
http://localhost:5173/bookings
```
The My Bookings page currently renders each booking's dates, status badge, and a truncated booking ID. There is no "View details" link and no detail page yet.

---

## Interaction Model

- **Interaction pattern:** Read-only timeline view — user clicks "View details" from My Bookings, navigates to the detail page, sees the event list.
- **State location:** Server-persisted — `booking_events` table in Postgres.
- **Sync vs async:** Event writes are synchronous inside `BookingService`. The detail page is a standard fetch-on-mount read.
- **Conversation memory:** Not applicable.

---

## Confirmed Prototype Decisions

These behaviors are confirmed requirements, grounded in the scaffold and prior exercises:

- **Append-only design** — no `UPDATE` or `DELETE` on `booking_events`, ever. Events are immutable records. The table has no `updated_at` column by design. `BookingEventRepository` exposes only `insert` and `listForBooking` — no update or delete methods.
- **Synchronous writes** — event writes happen inside `BookingService`, not as async fire-and-forget. Contrast with Exercise 05 (email notifications), which is explicitly fire-and-forget. If the event write fails, the outer service method surfaces that failure — the mutation and the log entry are treated as a unit.
- **JSONB metadata** — each event type carries a relevant point-in-time snapshot: `booking_created: { roomId, checkIn, checkOut }`; `booking_cancelled: { cancelledAt }`; `dates_modified: { oldCheckIn, oldCheckOut, newCheckIn, newCheckOut }`. The snapshot is not updated if the booking changes again later.
- **Owner-only** — `GET /bookings/:id/events` enforces the same ownership check as `GET /bookings/:id` (confirmed at `apps/api/src/routes/bookings.ts:39-46`). A user can only fetch events for their own bookings.
- **Three event types** — `booking_created`, `booking_cancelled`, `dates_modified`. No others in this exercise.
- **Chronological order** — events returned in ascending `created_at` order (oldest first).

---

## Event Types and Metadata Snapshots

| `event_type` | When written | `metadata` shape |
|---|---|---|
| `booking_created` | Inside `BookingService.bookRoom()`, after `bookingRepo.create()` succeeds | `{ roomId, checkIn, checkOut }` |
| `booking_cancelled` | Inside `BookingService.cancelBooking()`, after `bookingRepo.cancel()` succeeds | `{ cancelledAt }` |
| `dates_modified` | Inside `BookingService.modifyDates()`, after `bookingRepo.update()` succeeds | `{ oldCheckIn, oldCheckOut, newCheckIn, newCheckOut }` |

---

## Excluded Features

- **Admin viewing all events** — the events endpoint in this exercise is owner-only. Admin capabilities are covered in Exercise 03.
- **Real-time streaming** — Server-Sent Events or WebSocket for live event feeds are out of scope for v1.
- **Event replay / undo** — replaying events to reconstruct booking state, or undoing an event, is a v2 concern.
- **Deleting events** — the append-only contract is absolute. There is no mechanism to remove an event record.
- **Events for other resource types** — only booking lifecycle events are in scope.

---

## Open Questions

None — all decisions are grounded in the scaffold and prior exercises.

---

## Success Metric

A participant can create a booking, cancel it, and modify its dates — then navigate to the Booking Detail page and see all three events displayed in chronological order. The `e2e/exercises/04-activity-log.spec.ts` Playwright test passes on the participant's branch without modification.
