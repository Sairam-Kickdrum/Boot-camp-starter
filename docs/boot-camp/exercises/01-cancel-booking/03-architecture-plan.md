> **For participants:** This plan describes the target architecture. Your job is to implement it following the existing patterns in the codebase.

# Architecture Plan: Cancel a Booking

**Status:** Final
**Feature:** BOOTCAMP-1
**Tier:** Standard
**Author:** Boot Camp Facilitator
**Date:** 2026-06-04
**Parent feature branch:** `solutions/01-cancel-booking` (reference); participants use `participant/<name>/01-cancel-booking`

---

## Approach Summary

Add a `POST /bookings/:id/cancel` endpoint that enforces three business rules in order — existence, ownership, cancellability — then writes a soft-delete to the `bookings` table. The frontend extends `BookingsPage.tsx` with a Cancel button (shown only on `confirmed` bookings), a confirmation modal, and an updated status badge. No new tables, no migrations, no new dependencies.

---

## Interaction Model

Single-shot action. User navigates to `/bookings`, sees their confirmed bookings, clicks Cancel on one, confirms in a modal, the booking immediately reflects as cancelled in the list. Synchronous round-trip — no queuing, no async.

---

## Assumptions

| Assumption | What depends on it | If wrong, what changes |
|---|---|---|
| `bookings.status` enum includes `'cancelled'` | Cancel endpoint sets this value | Add migration to alter enum |
| `bookings.cancelled_at` column exists and is nullable | Cancel endpoint sets this value | Add migration to add the column |
| `bookingStatusEnum` is exported from `db/schema/index.ts` | Repository uses it for type-safe update | May need to import differently |
| `BookingStatus` type in shared-types includes `'cancelled'` | API response type + FE rendering | Update `BookingStatusSchema` |
| `requireAuth` is available as `app.requireAuth` | Cancel route uses it as `preHandler` | Check auth plugin registration |
| `ForbiddenError` is the correct error for wrong-owner (not `NotFoundError`) | Ownership check in service | Confirm with `GET /bookings/:id` route pattern |

All assumptions confirmed — see Codebase Grounding Report below.

---

## Alternatives Considered

- **Hard-delete (DELETE /bookings/:id):** Permanently removes the row. Rejected because it destroys booking history and prevents future audit or re-billing scenarios. The scaffold's existing `cancelled_at` column signals that soft-delete is the intended design.

- **Inline status update via PATCH /bookings/:id:** A general-purpose PATCH endpoint that accepts `{ status: 'cancelled' }`. Rejected because it requires client-side validation of allowed status transitions and creates ambiguity about what other fields could be patched. A dedicated `/cancel` action is more explicit and easier to add targeted business rules to.

---

## Services Affected

| Service / File | Change Type | Description |
|---|---|---|
| `apps/api/src/routes/bookings.ts` | Extend | Add `POST /:id/cancel` route handler |
| `apps/api/src/services/booking-service.ts` | Extend | Add `cancelBooking(bookingId, userId)` method |
| `apps/api/src/repositories/booking-repository.ts` | Extend | Add `cancel(bookingId)` method |
| `packages/shared-types/src/booking-schemas.ts` | Extend | Add `CancelBookingResponseSchema` and `CancelBookingResponse` type |
| `packages/shared-types/src/index.ts` | Extend | Re-export the new schema/type |
| `apps/web/src/routes/BookingsPage.tsx` | Extend | Cancel button, modal, cancelled state rendering |
| `apps/web/src/lib/api/bookings.ts` | Extend | Add `cancelBooking(id: string)` API client function |

---

## Cross-Service Data Flows

```
Browser (BookingsPage)
  → POST /api/bookings/:id/cancel     (via cancelBooking() in lib/api/bookings.ts)
  → Fastify route: bookingRoutes (apps/api/src/routes/bookings.ts)
  → BookingService.cancelBooking(bookingId, userId)
  → BookingRepository.findById(bookingId)     — confirms existence
  → BookingRepository.cancel(bookingId)       — writes status + cancelled_at
  ← returns updated Booking row
  ← route maps to CancelBookingResponse and replies
  ← BookingsPage updates local state in-place
```

Auth: `session` cookie → `requireAuth` preHandler verifies Cognito AccessToken via JWKS → attaches `request.sessionUser`.

---

## Frontend Approach

- **Screen:** `apps/web/src/routes/BookingsPage.tsx` (existing).
- **State:** Add `cancelling: string | null` state to track which booking ID is in-flight. Add `cancelError: string | null` for inline error display.
- **Component pattern:** Follow the loading/error/success pattern from `BookingPage.tsx` — `useState` for async state, inline error display, button disabled while in-flight.
- **Modal:** Simple inline confirmation modal (no external library). Matches the zero-dependency approach of the existing scaffold UI.
- **data-testid requirements:** `cancel-btn`, `cancel-modal`, `cancel-confirm-btn`, `cancel-cancel-btn` — required by the exercise Playwright test.

---

## Reuse Opportunities

| Resource | Evidence | How this feature uses it |
|---|---|---|
| `requireAuth` preHandler | `apps/api/src/routes/bookings.ts:9` — every existing route uses it | Same pattern on cancel route |
| `ForbiddenError` for ownership | `apps/api/src/routes/bookings.ts:39-42` — `GET /:id` rethrows `NotFoundError` as `ForbiddenError` | Same pattern in `cancelBooking()` service method |
| `ConflictError` for business rules | `apps/api/src/services/booking-service.ts:26` — `bookRoom()` throws `ConflictError` | Cancel rules (already-cancelled, past check-in) use the same error class |
| `BookingRepository.findById()` | `apps/api/src/repositories/booking-repository.ts:12` — throws `NotFoundError` if missing | Call at the start of `cancelBooking()` to confirm existence |
| `toBooking()` mapper | `apps/api/src/routes/bookings.ts:60` — maps DB row to API response | Reuse for cancel response mapping |
| `BookingStatus` in shared-types | `packages/shared-types/src/booking-schemas.ts:3` — `z.enum(["confirmed","cancelled"])` | `CancelBookingResponse` reuses this type |

---

## Infrastructure Changes

None. The `bookings` table already has the required columns:
- `status bookingStatusEnum` (line 36, `db/schema/index.ts`) — default `'confirmed'`, set to `'cancelled'` on cancel
- `cancelledAt timestamp` (line 41, `db/schema/index.ts`) — nullable, set to `NOW()` on cancel

---

## Codebase Grounding Report

| Claim | Result | Evidence |
|---|---|---|
| `bookings.status` enum has `'cancelled'` value | ✅ Confirmed | `db/schema/index.ts:12` — `pgEnum("booking_status", ["confirmed", "cancelled"])` |
| `bookings.cancelled_at` column exists and is nullable | ✅ Confirmed | `db/schema/index.ts:41` — `cancelledAt: timestamp(...),` (no `.notNull()`) |
| `requireAuth` used on all existing protected routes | ✅ Confirmed | `apps/api/src/routes/bookings.ts:9,18,30` — all three routes use `preHandler: [app.requireAuth]` |
| `ForbiddenError` used for ownership (not `NotFoundError`) | ✅ Confirmed | `apps/api/src/routes/bookings.ts:39-42` — catches `NotFoundError` and rethrows as `ForbiddenError` |
| `ConflictError` used for business rule violations | ✅ Confirmed | `apps/api/src/services/booking-service.ts:26` — `throw new ConflictError(...)` in `bookRoom()` |
| `BookingRepository.findById()` throws `NotFoundError` | ✅ Confirmed | `apps/api/src/repositories/booking-repository.ts:17` — `if (!booking) throw new NotFoundError(...)` |
| `BookingStatus` shared type includes `'cancelled'` | ✅ Confirmed | `packages/shared-types/src/booking-schemas.ts:3` — `z.enum(["confirmed", "cancelled"])` |

CG-11 (legacy service check): No legacy service references found. This feature touches only `bookings` table and existing service/repository/route files.

---

## Open Questions

None.

---

## Validation

- [x] All sections complete
- [x] CG-11 clear — no legacy services
- [x] All assumptions confirmed against codebase
- [x] Alternatives documented with rationale
- [x] Reuse opportunities grounded in file:line references
