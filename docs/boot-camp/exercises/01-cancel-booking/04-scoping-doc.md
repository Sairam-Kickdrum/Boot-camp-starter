> **Reading order:** 01-feature-brief.md → 03-architecture-plan.md → this document.

# Scoping Doc: Cancel a Booking

**Feature:** BOOTCAMP-1
**Tier:** Standard
**Architecture Plan:** `docs/boot-camp/exercises/01-cancel-booking/03-architecture-plan.md`
**Date:** 2026-06-04

---

## Feature Overview

A logged-in user can cancel a confirmed booking they own from the My Bookings page, provided the check-in date has not yet passed. Cancellation is a soft-delete — the booking row is retained with `status = 'cancelled'` and `cancelled_at` set.

---

## Split Rationale

Single capability ticket. The feature is a single vertical slice: one endpoint, one service method, one repository method, one UI change, all touching one resource (bookings). No prerequisite work, no cross-cutting concerns, no complex infra.

---

## Dependency Chain

```
BOOTCAMP-1 (no dependencies — implement end-to-end)
```

---

## Ticket BOOTCAMP-1: Cancel a Booking

**Type:** Capability
**Estimate:** 1.5–2 days
**Depends on:** None
**Parallel with:** None

### Summary

Enable a logged-in user to cancel a confirmed booking they own from the My Bookings page. The booking is soft-deleted — it stays visible in the list with a Cancelled status and cancellation date. Cancellation is blocked if the booking is already cancelled or the check-in date has passed.

### Context — Where This Lives

**`/bookings` — My Bookings page** (`apps/web/src/routes/BookingsPage.tsx`).

The scaffold already renders a list of bookings with status badges. This ticket extends that page with cancel functionality. No new route is needed.

**API:** New endpoint on the existing booking routes (`apps/api/src/routes/bookings.ts`).

### What the User Can Do

1. User navigates to `/bookings` and sees their list of bookings.
2. Confirmed bookings show a **Cancel** button.
3. User clicks Cancel — a confirmation modal appears: *"Are you sure you want to cancel this booking?"*
4. User clicks Confirm in the modal.
5. The system cancels the booking and updates the row in-place: status changes to "Cancelled" and the cancellation date is shown.
6. The Cancel button is no longer shown on the now-cancelled booking.

**Error paths:**
- If the booking's check-in date is today or in the past, the system returns an error and the booking is unchanged.
- If the booking is already cancelled, the system returns an error.
- If the user does not own the booking, the system returns a forbidden error.

### Acceptance Criteria

- [ ] AC-1: A user can cancel a confirmed booking they own; the booking status changes to `cancelled` and `cancelled_at` is set.
- [ ] AC-2: The cancelled booking remains visible on My Bookings with a "Cancelled" badge and the cancellation date.
- [ ] AC-3: The Cancel button is only shown on bookings with `status = 'confirmed'`.
- [ ] AC-4: Attempting to cancel a booking whose `check_in` is today or earlier returns a 409 error; the booking is unchanged.
- [ ] AC-5: Attempting to cancel an already-cancelled booking returns a 409 error.
- [ ] AC-6: Attempting to cancel a booking owned by a different user returns a 403 error.
- [ ] AC-7: Unit tests cover all five service-layer scenarios: happy path, already-cancelled, past check-in, wrong owner, not found.
- [ ] AC-8: A Playwright test in `e2e/exercises/01-cancel-booking.spec.ts` verifies the end-to-end cancel flow and the past-check-in guard.

### Existing System Behavior

- `GET /bookings` — returns all bookings for the authenticated user (confirmed and cancelled).
- `BookingsPage.tsx` — renders a `BookingRow` per booking; shows dates, status badge (green = confirmed, red = cancelled), booking ID.
- `bookings` table — has `status` (`confirmed` | `cancelled`) and `cancelled_at` (nullable timestamp) columns already.
- `BookingService` — has `listForUser()`, `getById()`, `bookRoom()` methods.
- `BookingRepository` — has `listForUser()`, `findById()`, `hasConflict()`, `create()` methods.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| Cancel a booking the user owns | Cancel a booking owned by another user |
| Business rule: check-in must be in the future | Cancellation policy windows (e.g., 24hr notice) |
| Soft-delete (status + cancelled_at) | Hard-delete (removing the row) |
| Confirmation modal before submit | Undo / un-cancel after cancellation |
| Inline error message on failure | Email notification on cancel (Exercise 05) |
| Unit tests for service layer | Refund or credit logic |
| Playwright test for the cancel flow | Admin-initiated cancel of other users' bookings (Exercise 03) |

### Design Reference

- **Pattern: ownership check** — `apps/api/src/routes/bookings.ts:39-42`. The `GET /:id` route catches `NotFoundError` and rethrows as `ForbiddenError` to avoid leaking whether a booking exists. Apply the same pattern in the cancel endpoint.
- **Pattern: ConflictError for business rules** — `apps/api/src/services/booking-service.ts:26`. Use `ConflictError` (409) for both "already cancelled" and "past check-in" violations.
- **Pattern: three-layer** — route handles HTTP only; service holds the business rules; repository writes to the DB. See `bookRoom()` → `create()` for the full pattern.
- **Confirmed: soft-delete design** — `db/schema/index.ts:36,41`. The `status` enum and `cancelled_at` column already exist; no migration needed.

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/01-cancel-booking/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/01-cancel-booking/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Estimated Total Effort

| Ticket | Estimate | Notes |
|---|---|---|
| BOOTCAMP-1: Cancel a Booking | 1.5–2 days | BE + FE + unit tests + Playwright test |
| **Total** | **1.5–2 days** | Single engineer |

---

## Linear-Ready Trim Guidance

When you create your Linear ticket from this scoping doc:

**Include in Linear:**
- Summary, Context, What the User Can Do, Acceptance Criteria (AC-1 through AC-8), Scope Boundaries.

**Do NOT include in Linear** (stays here and in your LLP):
- File paths (`apps/api/src/routes/bookings.ts`, etc.)
- Column names (`cancelled_at`, `bookingStatusEnum`)
- Service method names (`cancelBooking`, `cancel`)
- Import patterns
