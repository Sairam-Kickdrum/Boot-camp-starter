> **For participants:** This plan describes the target architecture. Your job is to implement it following the existing patterns in the codebase.

# Architecture Plan: Change Booking Dates

**Status:** Final
**Feature:** BOOTCAMP-2
**Tier:** Standard (AI-SDLC Mode 2)
**Author:** Boot Camp Facilitator
**Date:** 2026-06-04
**Parent feature branch:** `solutions/02-modify-booking-dates` (reference); participants use `participant/<name>/02-modify-booking-dates`

---

## Approach Summary

Add a `PATCH /bookings/:id` endpoint that enforces four business rules in order — existence, ownership, modifiability (not cancelled, not past check-in), date validity, and conflict detection — then atomically updates `check_in` and `check_out` in a single Drizzle `update()` call. The conflict detection reuses `BookingRepository.hasConflict()` exactly as-is, passing the booking's own ID as `excludeBookingId` so the booking does not conflict with itself. The frontend extends `BookingsPage.tsx` with a Change Dates button on confirmed booking rows and an edit modal that pre-populates with current dates and reverts on cancel. No new tables, no migrations, no new dependencies.

---

## Interaction Model

Form-based edit. User navigates to `/bookings`, sees their confirmed bookings, clicks **Change Dates** on one, edits the check-in and/or check-out in a modal, submits. The row updates in-place with the new dates on success. If there is a conflict or validation error the modal displays an inline error message. Clicking Cancel resets both date inputs to the original values without making a network request.

---

## Assumptions

| Assumption | What depends on it | If wrong, what changes |
|---|---|---|
| `bookings.check_in` and `bookings.check_out` are `date` columns (string `YYYY-MM-DD` in the ORM) | PATCH body uses the same string date format as `CreateBookingRequest` | Adapt parsing if format differs |
| DB `chk_dates` constraint enforces `checkOut > checkIn` at the DB level | Service-layer date validation acts as a fast-fail before the DB round-trip | Constraint is confirmed in schema; both layers enforce it |
| `hasConflict()` already accepts `excludeBookingId?: string` | `updateBookingDates()` service method can call it without modification | No change needed to `BookingRepository` |
| `bookings.cancelledAt` being non-null is NOT the sole signal for a cancelled booking — `status === 'cancelled'` is | The "already cancelled" guard checks `booking.status` | Confirmed: `bookingStatusEnum` is the authoritative state field |
| `requireAuth` is available as `app.requireAuth` on the Fastify instance | PATCH route uses it as `preHandler` | Check auth plugin registration in `plugins/auth.ts` |
| `ForbiddenError` is the correct error for wrong-owner (not `NotFoundError`) | Ownership check in service | Confirmed by `GET /:id` route pattern at `routes/bookings.ts:43-46` |
| `ConflictError` (409) is the correct error for blocked modifications | Both "already cancelled" and "past check-in" guards use this | Confirmed by `bookRoom()` at `services/booking-service.ts:33` |

All assumptions confirmed — see Codebase Grounding Report below.

---

## Alternatives Considered

- **DELETE + re-create (delete old booking, insert new one):** Atomicity is harder to guarantee across two separate operations without an explicit transaction. It also generates a new booking ID, breaking any references to the original booking (e.g., future audit log entries in Exercise 04). Rejected in favour of an atomic in-place update.

- **PATCH with full booking body (room, dates, status):** A general-purpose patch that accepts any writable field creates surface area for unintended mutations (e.g., a client accidentally setting `status: 'cancelled'` via PATCH instead of the dedicated cancel endpoint). A focused `UpdateBookingRequest` with only `checkIn` and `checkOut` fields is more explicit, easier to validate, and easier to audit. Rejected in favour of a scoped patch.

---

## Services Affected

| Service / File | Change Type | Description |
|---|---|---|
| `apps/api/src/routes/bookings.ts` | Extend | Add `PATCH /:id` route handler |
| `apps/api/src/services/booking-service.ts` | Extend | Add `updateBookingDates(bookingId, userId, request)` method |
| `apps/api/src/repositories/booking-repository.ts` | Extend | Add `updateDates(bookingId, checkIn, checkOut)` method |
| `packages/shared-types/src/booking-schemas.ts` | Extend | Add `UpdateBookingRequestSchema` and `UpdateBookingRequest` type |
| `packages/shared-types/src/index.ts` | No change | Already re-exports everything from `booking-schemas.ts` via `export *` |
| `apps/web/src/routes/BookingsPage.tsx` | Extend | Add Change Dates button, edit modal, and in-place date update |
| `apps/web/src/lib/api/bookings.ts` | Extend | Add `updateBookingDates(id, body)` API client function |

---

## Cross-Service Data Flows

```
Browser (BookingsPage)
  → PATCH /api/bookings/:id          (via updateBookingDates() in lib/api/bookings.ts)
  → Fastify route: bookingRoutes     (apps/api/src/routes/bookings.ts)
      → UpdateBookingRequestSchema.parse(request.body)   — validates dates, checkOut > checkIn
  → BookingService.updateBookingDates(bookingId, userId, { checkIn, checkOut })
      → BookingRepository.findById(bookingId)            — confirms existence; throws NotFoundError if missing
      → ownership check: booking.userId !== userId       — throws ForbiddenError (403)
      → guard: booking.status === 'cancelled'            — throws ConflictError (409)
      → guard: booking.checkIn <= today                  — throws ConflictError (409)
      → BookingRepository.hasConflict(roomId, checkIn, checkOut, bookingId)  — self-exclusion via excludeBookingId
      → if conflict: throws ConflictError (409)
      → BookingRepository.updateDates(bookingId, checkIn, checkOut)  — single atomic Drizzle update()
  ← returns updated Booking row
  ← route maps to Booking type via toBooking() and replies 200
  ← BookingsPage updates local state in-place; modal closes
```

Auth: `session` cookie → `requireAuth` preHandler verifies Cognito AccessToken via JWKS → attaches `request.sessionUser`.

---

## Frontend Approach

- **Screen:** `apps/web/src/routes/BookingsPage.tsx` (existing).
- **Component:** Extend `BookingRow` (currently lines 38–53) to accept an `onDatesUpdated` callback and render a Change Dates button when `booking.status === 'confirmed'`.
- **State:** Add `editingId: string | null` and `editError: string | null` state in `BookingsPage`. Modal is open when `editingId !== null`. Local form state (`draftCheckIn`, `draftCheckOut`) lives in the modal; on Cancel, revert both to the booking's current dates.
- **Component pattern:** Follow the existing `useState` + `useEffect` + inline error pattern from `BookingsPage` (lines 7–9). Button disabled while the PATCH is in-flight.
- **Modal:** Simple inline modal (no external library). Matches the zero-dependency approach of the existing scaffold UI. Two date inputs for check-in and check-out, an inline error message area, and Confirm / Cancel buttons.
- **On success:** Update the `bookings` array in-place using `setBookings(prev => prev.map(b => b.id === id ? updated : b))`. Modal closes.
- **On cancel:** Reset draft dates to the booking's current values. Modal closes. No API call.
- **data-testid requirements** (required by the Playwright test):
  - `change-dates-btn` — the Change Dates button on each confirmed booking row
  - `change-dates-modal` — the modal container
  - `check-in-input` — the check-in date input inside the modal
  - `check-out-input` — the check-out date input inside the modal
  - `change-dates-confirm-btn` — the Confirm / Save button inside the modal
  - `change-dates-cancel-btn` — the Cancel button inside the modal
  - `change-dates-error` — the inline error message inside the modal

---

## Reuse Opportunities

| Resource | Evidence | How this feature uses it |
|---|---|---|
| `requireAuth` preHandler | `apps/api/src/routes/bookings.ts:14,24,35` — all existing routes use it | Same pattern on PATCH route |
| `ForbiddenError` for ownership | `apps/api/src/routes/bookings.ts:43-46` — `GET /:id` catches `NotFoundError`, rethrows as `ForbiddenError` | Same pattern in `updateBookingDates()` service method |
| `ConflictError` for business rules | `apps/api/src/services/booking-service.ts:33` — `bookRoom()` throws `ConflictError` | Already-cancelled and past-check-in guards use the same error class |
| `BookingRepository.findById()` | `apps/api/src/repositories/booking-repository.ts:14` — throws `NotFoundError` if missing | Call at the start of `updateBookingDates()` to confirm existence |
| `BookingRepository.hasConflict()` with `excludeBookingId` | `apps/api/src/repositories/booking-repository.ts:24` — fourth parameter is `excludeBookingId?: string`; line 37 filters it with `rows.some((r) => r.id !== excludeBookingId)` | Pass the booking's own ID to prevent it from conflicting with itself. **This parameter already exists — no repository changes needed for conflict detection.** |
| `toBooking()` mapper | `apps/api/src/routes/bookings.ts:58-78` — maps DB row to `Booking` API type | Reuse for PATCH response mapping |
| `CreateBookingRequestSchema` date validation | `packages/shared-types/src/booking-schemas.ts:16-23` — `z.string().date()` + `checkOut > checkIn` refine | Mirror the same shape and refine for `UpdateBookingRequestSchema` |
| `listBookings` / `createBooking` pattern | `apps/web/src/lib/api/bookings.ts:4-13` — `request<T>()` wrapper | Same wrapper for `updateBookingDates(id, body)` |

---

## Infrastructure Changes

None. The `bookings` table already has the required columns and constraints:
- `checkIn: date("check_in").notNull()` — `db/schema/index.ts:47`
- `checkOut: date("check_out").notNull()` — `db/schema/index.ts:48`
- `check("chk_dates", sql\`${table.checkOut} > ${table.checkIn}\`)` — `db/schema/index.ts:56`

The only addition is `UpdateBookingRequestSchema` in `packages/shared-types/` — a type definition, not a migration.

---

## Codebase Grounding Report

| Claim | Result | Evidence |
|---|---|---|
| `bookings.check_in` and `checkOut` are `date` columns | Confirmed | `db/schema/index.ts:47-48` — `date("check_in").notNull()`, `date("check_out").notNull()` |
| DB `chk_dates` constraint enforces `checkOut > checkIn` | Confirmed | `db/schema/index.ts:56` — `check("chk_dates", sql\`...\`)` |
| `hasConflict()` accepts `excludeBookingId?: string` as 4th param | Confirmed | `apps/api/src/repositories/booking-repository.ts:24` — function signature; line 37 — `rows.some((r) => r.id !== excludeBookingId)` self-exclusion |
| `requireAuth` used on all existing protected routes | Confirmed | `apps/api/src/routes/bookings.ts:14,24,35` — all three routes use `preHandler: [app.requireAuth]` |
| `ForbiddenError` used for ownership (not `NotFoundError`) | Confirmed | `apps/api/src/routes/bookings.ts:43-46` — catches `NotFoundError`, rethrows as `ForbiddenError` |
| `ConflictError` used for business rule violations | Confirmed | `apps/api/src/services/booking-service.ts:33` — `throw new ConflictError(...)` in `bookRoom()` |
| `BookingRepository.findById()` throws `NotFoundError` | Confirmed | `apps/api/src/repositories/booking-repository.ts:20` — `if (!booking) throw new NotFoundError("Booking", id)` |
| `toBooking()` mapper exists and is reusable | Confirmed | `apps/api/src/routes/bookings.ts:58-78` — maps DB shape to `Booking` type |
| `BookingSchema` and `CreateBookingRequestSchema` exported from shared-types | Confirmed | `packages/shared-types/src/booking-schemas.ts:5,16` |
| `shared-types/src/index.ts` re-exports all from `booking-schemas.ts` | Confirmed | `packages/shared-types/src/index.ts:2` — `export * from "./booking-schemas.js"` |
| `BookingRow` in `BookingsPage.tsx` receives full `Booking` object | Confirmed | `apps/web/src/routes/BookingsPage.tsx:38` — `function BookingRow({ booking }: { booking: Booking })` |
| `listBookings` uses `request<T>()` wrapper from `lib/api/client.ts` | Confirmed | `apps/web/src/lib/api/bookings.ts:4-6` |

**Key codebase-grounding finding:** `hasConflict()` at `booking-repository.ts:24` already accepts `excludeBookingId?: string` and already implements self-exclusion at line 37 (`rows.some((r) => r.id !== excludeBookingId)`). This means conflict detection for date modification requires zero changes to `BookingRepository` — participants only need to call `hasConflict` with the booking's own ID as the fourth argument.

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
- [x] Key grounding finding (excludeBookingId) explicitly called out
