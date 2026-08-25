> **Start here.** Read this document fully before opening any other file in this exercise.

# Feature Brief: Cancel a Booking

**Tier:** Standard (Traditional Ticket Mode — Mode 1)
**Module:** Boot Camp Starter — Room Booking App
**Author (PM):** Boot Camp Facilitator
**Date:** 2026-06-04
**Linear Ticket:** BOOTCAMP-1
**Prototype:** Scaffold running at `http://localhost:5173/bookings`

---

## What

A logged-in user can cancel a confirmed booking they own, provided the check-in date has not yet passed. The booking record is retained with `status = 'cancelled'` and a `cancelled_at` timestamp — it is never deleted.

---

## Who

**Primary:** Any authenticated user (`role = 'user'` or `role = 'admin'`) who has at least one confirmed booking.

---

## Where

**`/bookings` — My Bookings page** (`apps/web/src/routes/BookingsPage.tsx`).

A **Cancel** button appears on each confirmed booking row. Cancelled bookings remain visible in the list with a visual "Cancelled" badge and the cancellation date. This is an extension of an existing screen — no new route is needed.

---

## Approach

The scaffold already stores booking state in a `status` enum column (`confirmed` | `cancelled`) and a nullable `cancelled_at` timestamp column on the `bookings` table. No migration is required.

The feature adds a `POST /bookings/:id/cancel` endpoint that applies the business rules in `BookingService`, then performs the soft-delete mutation in `BookingRepository`. The frontend adds a Cancel button with a confirmation modal and reflects the new state in-place on the bookings list.

---

## What's New

- **New service?** No — extends `BookingService` (`apps/api/src/services/booking-service.ts`).
- **New infrastructure?** No — no new tables, no new migrations.
- **Extends existing screen?** Yes — `BookingsPage.tsx` at `/bookings`.
- **Cross-cutting?** No.

---

## Prototype Reference

Run the scaffold locally:
```
http://localhost:5173/bookings
```
The My Bookings page currently renders each booking's dates, status badge, and booking ID. There is no Cancel button yet. The scaffold is the prototype.

---

## Interaction Model

- **Interaction pattern:** Single-shot action — user clicks Cancel, confirms in a modal, one API call is made.
- **State location:** Server-persisted — `bookings.status` and `bookings.cancelled_at` in Postgres.
- **Sync vs async:** Synchronous — cancel is immediate; no background job.
- **Conversation memory:** Not applicable.

---

## Confirmed Prototype Decisions

These behaviors ARE confirmed requirements, grounded in the existing scaffold:

- The `bookings` table has `status` (`confirmed` | `cancelled`) and `cancelled_at` columns — confirmed in `db/schema/index.ts`.
- Bookings remain visible after cancellation (soft-delete) — confirmed by the existing `BookingRow` component which already renders a badge based on `status`.
- The `requireAuth` preHandler must be on the cancel route — confirmed by every existing protected route in `routes/bookings.ts`.
- Ownership verification returns **403 Forbidden**, not **404** — confirmed by the pattern in `GET /bookings/:id` which rethrows `NotFoundError` as `ForbiddenError` to avoid leaking existence.
- Business rule violations use `ConflictError` (409) — confirmed by `BookingService.bookRoom()` pattern in `services/booking-service.ts`.

---

## Excluded Prototype Features

- **Email notification on cancellation** — deferred to Exercise 05 (Email Notifications).
- **Refund or credit calculation** — out of scope for v1 of the booking app.
- **Admin-initiated cancel of another user's booking** — out of scope; admin capabilities are Exercise 03.
- **Cancellation policy windows** (e.g., "must cancel 48 hours before") — the rule is simply `check_in > today`.
- **Undo / un-cancel** — not in scope; cancellations are final.

---

## Open Questions

None — all decisions are grounded in the scaffold.

---

## Success Metric

- A participant completes this exercise end-to-end using the `/implement BOOTCAMP-1` workflow in under 2 hours.
- The `e2e/exercises/01-cancel-booking.spec.ts` Playwright test passes on the participant's branch without modification.
