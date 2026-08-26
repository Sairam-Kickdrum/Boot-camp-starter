---
title: "Booking Cancellation (Customer-Initiated)"
slug: booking-cancellation
owners:
  - Sairam (Product Owner)
status: active
last_updated: 2026-08-26
proposed_by: agent
identity_confirmed: false
---

## Current State
No cancellation capability exists yet — this is a new feature request. As scoped, a customer will be able to cancel their own upcoming, `confirmed` booking as a soft-delete ([DEC-0001](../../decisions/DEC-0001_booking-cancellation-soft-delete.md)) via a Cancel action and confirmation modal on the existing My Bookings page ([DEC-0003](../../decisions/DEC-0003_cancel-action-confirmation-modal.md)), enforced server-side by the existing booking service/API ([DEC-0002](../../decisions/DEC-0002_cancellation-eligibility-ownership-status.md), [DEC-0004](../../decisions/DEC-0004_check-in-cutoff-409.md), [DEC-0005](../../decisions/DEC-0005_api-duplicate-ownership-existence-checks.md)), with no new page, route, or infrastructure ([DEC-0007](../../decisions/DEC-0007_reuse-existing-booking-infrastructure.md)).

## Key Facts
- Cancellation is a soft-delete; the booking record and its history remain visible in My Bookings. ([DEC-0001](../../decisions/DEC-0001_booking-cancellation-soft-delete.md))
- The existing `status` and nullable `cancelled_at` booking fields are reused — no schema change is needed. ([DEC-0007](../../decisions/DEC-0007_reuse-existing-booking-infrastructure.md))

## Requirements
- Only the owning customer can cancel, and only while the booking's status is `confirmed`; a successful cancellation sets status to `cancelled` and records `cancelled_at`. ([DEC-0002](../../decisions/DEC-0002_cancellation-eligibility-ownership-status.md))
- My Bookings shows a Cancel action on confirmed bookings; clicking opens a confirmation modal ("Are you sure you want to cancel this booking?") before cancelling; on success the row updates in place with a Cancelled badge, the cancellation date, and no Cancel action. ([DEC-0003](../../decisions/DEC-0003_cancel-action-confirmation-modal.md))
- Cancellation is blocked once `check_in` is today or in the past — rejected with 409 Conflict and no state change. ([DEC-0004](../../decisions/DEC-0004_check-in-cutoff-409.md))
- The service layer enforces cancellation server-side: 409 Conflict for an already-cancelled booking, 403 Forbidden for another customer's booking, 404 Not Found for a nonexistent booking. ([DEC-0005](../../decisions/DEC-0005_api-duplicate-ownership-existence-checks.md))
- The frontend only renders the Cancel action for confirmed bookings, and shows an inline error without changing the row if the API rejects the request. ([DEC-0006](../../decisions/DEC-0006_frontend-cancel-visibility-error-handling.md))
- Implementation reuses the existing booking routes, auth flow, service, repository, and My Bookings page — no new page or route. ([DEC-0007](../../decisions/DEC-0007_reuse-existing-booking-infrastructure.md))
- Test coverage: unit tests for successful cancellation, already-cancelled, past/current check-in, wrong owner, and not-found cases; Playwright coverage for the successful-cancellation flow and the past-check-in guard. (informs [DEC-0004](../../decisions/DEC-0004_check-in-cutoff-409.md), [DEC-0005](../../decisions/DEC-0005_api-duplicate-ownership-existence-checks.md))

## Business Rules
- A successful cancellation sets booking status to `cancelled` and `cancelled_at` to the cancellation time. ([DEC-0002](../../decisions/DEC-0002_cancellation-eligibility-ownership-status.md))
- Cancellation is only allowed while `check_in` is strictly in the future. ([DEC-0004](../../decisions/DEC-0004_check-in-cutoff-409.md))

## Decisions
| Date | Title | Type | Ticket |
|---|---|---|---|
| 2026-08-25 | [Booking cancellation is a soft-delete](../../decisions/DEC-0001_booking-cancellation-soft-delete.md) | decided | Draft (pending) |
| 2026-08-25 | [Cancellation eligibility: ownership + confirmed status](../../decisions/DEC-0002_cancellation-eligibility-ownership-status.md) | decided | Draft (pending) |
| 2026-08-25 | [Cancel action requires a confirmation modal](../../decisions/DEC-0003_cancel-action-confirmation-modal.md) | decided | Draft (pending) |
| 2026-08-25 | [Cancellation blocked once check-in has arrived](../../decisions/DEC-0004_check-in-cutoff-409.md) | decided | Draft (pending) |
| 2026-08-25 | [API enforces duplicate-cancellation, ownership, and existence checks server-side](../../decisions/DEC-0005_api-duplicate-ownership-existence-checks.md) | decided | Draft (pending) |
| 2026-08-25 | [Frontend Cancel-action visibility and inline error handling](../../decisions/DEC-0006_frontend-cancel-visibility-error-handling.md) | decided | Draft (pending) |
| 2026-08-25 | [Cancellation reuses existing booking infrastructure](../../decisions/DEC-0007_reuse-existing-booking-infrastructure.md) | decided | Draft (pending) |
| 2026-08-25 | [Open UX/copy questions for the cancellation flow](../../decisions/DEC-0008_open-ux-copy-questions.md) | unresolved | Draft (pending) |
| 2026-08-25 | [Cancellation scope excludes refunds, policy windows, notifications, hard delete, undo, and admin cancellation](../../decisions/DEC-0009_cancellation-scope-exclusions.md) | rejected | Draft (pending) |

## Evidence
- [DEC-0001](../../decisions/DEC-0001_booking-cancellation-soft-delete.md)
- [DEC-0002](../../decisions/DEC-0002_cancellation-eligibility-ownership-status.md)
- [DEC-0003](../../decisions/DEC-0003_cancel-action-confirmation-modal.md)
- [DEC-0004](../../decisions/DEC-0004_check-in-cutoff-409.md)
- [DEC-0005](../../decisions/DEC-0005_api-duplicate-ownership-existence-checks.md)
- [DEC-0006](../../decisions/DEC-0006_frontend-cancel-visibility-error-handling.md)
- [DEC-0007](../../decisions/DEC-0007_reuse-existing-booking-infrastructure.md)
- [DEC-0008](../../decisions/DEC-0008_open-ux-copy-questions.md)
- [DEC-0009](../../decisions/DEC-0009_cancellation-scope-exclusions.md)

## Open Questions
- Is `booking-cancellation` the right feature request for this work, or does it belong to an existing one? Created by an agent from ticket `boot-camp-booking-cancellation-review-3` (local wiki-ingest run); rename or merge if wrong.
- Should the cancellation date show only the date, or both date and time? ([DEC-0008](../../decisions/DEC-0008_open-ux-copy-questions.md))
- Should cancelled bookings stay in their current list position, or move to the bottom of My Bookings? ([DEC-0008](../../decisions/DEC-0008_open-ux-copy-questions.md))
- What exact inline message should users see for a past or current check-in date? ([DEC-0008](../../decisions/DEC-0008_open-ux-copy-questions.md))
- Should the Cancel button label be "Cancel" or "Cancel booking"? ([DEC-0008](../../decisions/DEC-0008_open-ux-copy-questions.md))
- Should the confirmation modal have a secondary button labelled "Keep booking" or "Close"? ([DEC-0008](../../decisions/DEC-0008_open-ux-copy-questions.md))

**Resolved:**
- Nothing recorded yet.

## Risks / Rejected Approaches
- Refunds, cancellation-policy windows, email notifications, hard deletion, undo/un-cancel behavior, and admin cancellation of another customer's booking are explicitly out of scope for this implementation. ([DEC-0009](../../decisions/DEC-0009_cancellation-scope-exclusions.md))

## Relationships
Nothing recorded yet.
