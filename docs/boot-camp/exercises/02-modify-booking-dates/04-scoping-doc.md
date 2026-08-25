> **Reading order:** 01-feature-brief.md → 03-architecture-plan.md → this document.

# Scoping Doc: Change Booking Dates

**Feature:** BOOTCAMP-2
**Tier:** Standard (AI-SDLC Mode 2)
**Architecture Plan:** `docs/boot-camp/exercises/02-modify-booking-dates/03-architecture-plan.md`
**Date:** 2026-06-04

---

## Feature Overview

A logged-in user can change the check-in and check-out dates of a confirmed booking they own from the My Bookings page, provided the check-in has not yet passed and the booking is not cancelled. The new dates are validated, checked for conflicts with other bookings for the same room (excluding the booking being modified), and updated atomically.

---

## Split Rationale

Single capability ticket. The feature is a single vertical slice: one endpoint, one service method, one repository method, one shared-type addition, one UI change — all touching one resource (bookings). No prerequisite work beyond the existing scaffold. No cross-cutting concerns.

---

## Dependency Chain

```
BOOTCAMP-2 (no dependencies — implement end-to-end)
```

---

## Ticket BOOTCAMP-2: Change Booking Dates

**Type:** Capability
**Estimate:** 1.5–2 days
**Depends on:** None
**Parallel with:** None

### Summary

Enable a logged-in user to change the check-in and check-out dates of a confirmed booking they own. The new dates must form a valid range, must not conflict with any other confirmed booking for the same room, and the booking must not be cancelled or have a check-in date that has already passed. Both date fields update atomically — either both change or nothing changes.

### Context — Where This Lives

**`/bookings` — My Bookings page** (`apps/web/src/routes/BookingsPage.tsx`).

The scaffold already renders a list of bookings with dates and status badges. This ticket extends that page with a Change Dates button and edit modal on each confirmed booking row. No new route is needed.

**API:** New `PATCH /bookings/:id` endpoint on the existing booking routes (`apps/api/src/routes/bookings.ts`).

### What the User Can Do

1. User navigates to `/bookings` and sees their list of bookings.
2. Confirmed bookings whose check-in is in the future show a **Change Dates** button.
3. User clicks Change Dates — an edit modal opens pre-populated with the booking's current check-in and check-out dates.
4. User updates one or both date fields and clicks Confirm.
5. The system validates the new dates, checks for conflicts with other bookings for the same room, and updates the booking.
6. On success: the modal closes and the booking row updates in-place showing the new dates.
7. User clicks Cancel (any time before confirming): the modal closes and both date inputs revert to the booking's original dates.

**Error paths:**
- If the new check-out is not after the new check-in, the system returns a validation error and the booking is unchanged.
- If another confirmed booking for the same room overlaps the requested date range (excluding the booking itself), the system returns a conflict error and the booking is unchanged.
- If the booking is already cancelled, the system returns an error and the booking is unchanged.
- If the booking's check-in date is today or in the past, the system returns an error and the booking is unchanged.
- If the user does not own the booking, the system returns a forbidden error.

### Acceptance Criteria

- [ ] AC-1: A user can successfully change the dates of a confirmed booking they own; both `check_in` and `check_out` are updated in the database and reflected on the My Bookings page without a full page reload.
- [ ] AC-2: Attempting to set a check-out date that is not strictly after the check-in date returns a 400 error; the booking is unchanged.
- [ ] AC-3: Attempting to change dates to a range that overlaps another confirmed booking for the same room returns a 409 error; the booking is unchanged.
- [ ] AC-4: Attempting to change dates on an already-cancelled booking returns a 409 error.
- [ ] AC-5: Attempting to change dates on a booking whose check-in is today or earlier returns a 409 error.
- [ ] AC-6: Attempting to change dates on a booking owned by a different user returns a 403 error.
- [ ] AC-7: Unit tests cover all service-layer scenarios: happy path, invalid date range, room conflict, already-cancelled, past check-in, wrong owner, not found.
- [ ] AC-8: A Playwright test in `e2e/exercises/02-modify-booking-dates.spec.ts` verifies the end-to-end date change flow, the conflict error path, and that cancelling the modal reverts the form to the original dates.

### Existing System Behavior

- `GET /bookings` — returns all bookings for the authenticated user (confirmed and cancelled).
- `BookingsPage.tsx` — renders a `BookingRow` per booking; shows check-in/check-out dates, status badge (green = confirmed, red = cancelled), and booking ID (truncated).
- `bookings` table — has `check_in` and `check_out` date columns; a `chk_dates` DB check constraint enforces `checkOut > checkIn`.
- `BookingService` — has `listForUser()`, `getById()`, and `bookRoom()` methods.
- `BookingRepository` — has `listForUser()`, `findById()`, `hasConflict()`, and `create()` methods. Importantly, `hasConflict()` already accepts an optional `excludeBookingId` parameter and filters that booking from its own conflict result — no repository changes are needed for conflict detection.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| Change check-in and/or check-out dates of a booking the user owns | Change the room a booking is for |
| Date validation: checkOut must be after checkIn | Price recalculation based on new date range (Exercise 06) |
| Conflict detection excluding the booking being modified | Recording that dates were modified in an activity log (Exercise 04) |
| Atomic update: both dates change or neither does | Email notification on date change (Exercise 05) |
| Business rule: booking must not be cancelled | Undo / revert after a successful date change |
| Business rule: check-in must be in the future | Admin-initiated date change on another user's booking (Exercise 03) |
| Pre-populated edit modal; Cancel reverts to original dates | Cancelling the booking (Exercise 01) |
| Unit tests for service layer | Partial update (check-in only or check-out only without the other) |
| Playwright test for the date change flow | |

### Design Reference

- **Pattern: self-exclusion in conflict detection** — `apps/api/src/repositories/booking-repository.ts:24,37`. `hasConflict()` already accepts `excludeBookingId?: string` and implements self-exclusion via `rows.some((r) => r.id !== excludeBookingId)`. Pass the booking's own ID as the fourth argument when calling `hasConflict()` from `updateBookingDates()`. No changes to `BookingRepository` are needed for conflict detection.
- **Pattern: ownership check** — `apps/api/src/routes/bookings.ts:43-46`. The `GET /:id` route catches `NotFoundError` and rethrows as `ForbiddenError` to avoid leaking whether a booking exists. Apply the same pattern in `updateBookingDates()`.
- **Pattern: ConflictError for business rules** — `apps/api/src/services/booking-service.ts:33`. Use `ConflictError` (409) for all modification guards: already-cancelled, past check-in, and room conflict.
- **Pattern: three-layer** — route handles HTTP and Zod validation only; service holds all business rules; repository writes to the DB. See `bookRoom()` → `hasConflict()` → `create()` for the full pattern.
- **Atomic update** — `BookingRepository.updateDates()` must be a single Drizzle `update()` call setting both `check_in` and `check_out` together. Do not use two separate updates.

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/02-modify-booking-dates/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/02-modify-booking-dates/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Estimated Total Effort

| Ticket | Estimate | Notes |
|---|---|---|
| BOOTCAMP-2: Change Booking Dates | 1.5–2 days | BE + FE + shared-types + unit tests + Playwright test |
| **Total** | **1.5–2 days** | Single engineer |

---

## Linear-Ready Trim Guidance

When you create your Linear ticket from this scoping doc:

**Include in Linear:**
- Summary, Context, What the User Can Do, Acceptance Criteria (AC-1 through AC-8), Scope Boundaries.

**Do NOT include in Linear** (stays here and in your LLP):
- File paths (`apps/api/src/routes/bookings.ts`, `apps/web/src/routes/BookingsPage.tsx`, etc.)
- Column names (`check_in`, `check_out`, `chk_dates`, `bookingStatusEnum`)
- Service and repository method names (`updateBookingDates`, `updateDates`, `hasConflict`, `excludeBookingId`)
- Import patterns and data-testid values
