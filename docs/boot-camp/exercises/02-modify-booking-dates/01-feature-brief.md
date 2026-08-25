> **Start here.** Read this document fully before opening any other file in this exercise.

# Feature Brief: Change Booking Dates

**Tier:** Standard (AI-SDLC Mode 2)
**Module:** Boot Camp Starter — Room Booking App
**Author (PM):** Boot Camp Facilitator
**Date:** 2026-06-04
**Linear Ticket:** BOOTCAMP-2
**Prototype:** Scaffold running at `http://localhost:5173/bookings`

---

## What

A logged-in user can change the check-in and check-out dates of a confirmed booking they own. The system validates the new dates, checks that no other confirmed booking for the same room overlaps the requested window, and updates both dates atomically. Modification is blocked if the booking is already cancelled or its check-in date has already passed.

---

## Who

**Primary:** Any authenticated user (`role = 'user'` or `role = 'admin'`) who has at least one confirmed booking whose check-in date is still in the future.

---

## Where

**`/bookings` — My Bookings page** (`apps/web/src/routes/BookingsPage.tsx`).

A **Change Dates** button appears on each confirmed booking row. Clicking it opens an edit modal pre-populated with the current check-in and check-out dates. On success the row updates in-place. On cancel the form reverts to the original dates. No new route is needed.

---

## Approach

The `bookings` table already stores `check_in` and `check_out` as date columns and enforces `checkOut > checkIn` at the DB level via a check constraint. No migration is required.

The feature adds a `PATCH /bookings/:id` endpoint that enforces business rules in `BookingService`, performs conflict detection (reusing the existing `hasConflict()` method with the `excludeBookingId` parameter that is already in the repository), and writes both date fields atomically in `BookingRepository`. The frontend extends `BookingRow` inside `BookingsPage.tsx` with a Change Dates button and an edit modal.

---

## What's New

- **New service?** No — extends `BookingService` (`apps/api/src/services/booking-service.ts`).
- **New infrastructure?** No — no new tables, no new migrations.
- **New shared type?** Yes — `UpdateBookingRequest` schema added to `packages/shared-types/src/booking-schemas.ts`.
- **Extends existing screen?** Yes — `BookingsPage.tsx` at `/bookings`.
- **Cross-cutting?** No.

---

## Prototype Reference

Run the scaffold locally:
```
http://localhost:5173/bookings
```
The My Bookings page currently renders each booking's check-in/check-out dates, a status badge, and a booking ID. There is no Change Dates button or edit modal yet. The scaffold is the prototype.

---

## Interaction Model

- **Interaction pattern:** Form-based edit — user clicks Change Dates, edits dates in a modal, submits; one PATCH call is made.
- **State location:** Server-persisted — `bookings.check_in` and `bookings.check_out` in Postgres.
- **Sync vs async:** Synchronous — the update is immediate; no background job.
- **Revert on cancel:** The modal pre-populates with the current dates; clicking Cancel discards any edits and reverts the form to those values.
- **Conversation memory:** Not applicable.

---

## Confirmed Prototype Decisions

These behaviors ARE confirmed requirements, grounded in the existing scaffold:

- The `bookings` table has `check_in` and `check_out` date columns with a `chk_dates` DB constraint that enforces `checkOut > checkIn` — confirmed in `db/schema/index.ts:47-48,56`.
- The `requireAuth` preHandler must be on the PATCH route — confirmed by every existing protected route in `apps/api/src/routes/bookings.ts` (lines 14, 24, 35).
- Ownership verification returns **403 Forbidden**, not **404** — confirmed by the `GET /:id` ownership pattern in `apps/api/src/routes/bookings.ts:43-46`.
- Conflict detection uses `bookingRepo.hasConflict()` — confirmed in `apps/api/src/repositories/booking-repository.ts:24`. Critically, `hasConflict()` already accepts an optional `excludeBookingId` parameter (line 24) that filters the booking being modified from its own conflict check. No changes to `hasConflict()` are needed.
- `ConflictError` (409) is the correct error class for business rule violations — confirmed by `apps/api/src/services/booking-service.ts:33` where `bookRoom()` throws `ConflictError` on a conflicting booking.
- The `BookingRow` component in `BookingsPage.tsx` is the correct extension point — confirmed at line 38; it receives the full `Booking` object and renders dates and status.

---

## Excluded Prototype Features

- **Room change** — changing which room a booking is for is out of scope; only dates change.
- **Price recalculation** — repricing based on new date range is Exercise 06.
- **Recording that dates were modified** — an activity / audit log is Exercise 04.
- **Email notification on date change** — deferred to Exercise 05 (Email Notifications).
- **Admin-initiated date change on behalf of another user** — admin capabilities are Exercise 03.
- **Cancellation of the booking** — Exercise 01 covers cancel; this exercise only changes dates.

---

## Open Questions

None — all decisions are grounded in the scaffold.

---

## Success Metric

- A participant completes this exercise end-to-end using the `/implement BOOTCAMP-2` workflow in under 2 hours.
- The `e2e/exercises/02-modify-booking-dates.spec.ts` Playwright test passes on the participant's branch without modification.
