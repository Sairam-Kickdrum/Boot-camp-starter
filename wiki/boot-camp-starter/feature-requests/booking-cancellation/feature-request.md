---
title: "Booking Cancellation"
slug: booking-cancellation
feature_id: FR-0001
description: "Customers can cancel an upcoming confirmed booking they own from the My Bookings page."
domain: bookings
aliases: ["booking cancellation", "cancellation"]
owners:
  - Sairam
  - Anika
status: active
last_updated: 2026-09-09
dependencies: []
conflicts: []
proposed_by: agent
identity_confirmed: false
---

## Current State
A customer can cancel an upcoming booking they own from the My Bookings page, reusing the existing booking process. (per meeting 2026-08-25, "We need customers to cancel an upcoming booking they own.")

## Key Facts
- This feature does not introduce a new page — it's part of the existing My Bookings page and booking process, using the same sign-in already used elsewhere in the app. (per meeting 2026-08-25, "Use the existing booking routes, authentication flow, booking service, repository, and My Bookings page. No new page or route is needed.")

## Requirements
- On the My Bookings page, a confirmed booking shows a Cancel action. Choosing it opens a confirmation prompt before anything is cancelled. (per meeting 2026-08-25, "On the My Bookings page, confirmed bookings should show a Cancel action. Clicking it must not cancel immediately; it should first show a confirmation modal.")
- The Cancel action is only shown for bookings that are confirmed. If a cancellation attempt is rejected, the booking's row does not change and the page shows an inline error message. (per meeting 2026-08-25, "The frontend will only render the Cancel action for bookings whose status is confirmed. If the API rejects a cancellation, the row should not change and the page should show an inline error message.")
- Before this feature ships, the following scenarios must be verified: a successful cancellation, cancelling an already-cancelled booking, cancelling on or after the check-in date, cancelling another customer's booking, and cancelling a booking that doesn't exist — including an end-to-end check of the successful cancellation flow and the past-check-in guard. (per meeting 2026-08-25, "Add unit coverage for: successful cancellation, already-cancelled booking, check-in today or in the past, wrong owner, and booking not found. Add a Playwright test for the successful cancellation flow and the past-check-in guard.")

## Business Rules
- Cancelling a booking does not remove it — the booking stays visible in the customer's booking history, now shown as cancelled. (per meeting 2026-08-25, "The booking record should remain in the database and remain visible in My Bookings, because customers need their booking history.")
- A customer can cancel only a booking they own, and only while it's confirmed. A successful cancellation moves the booking to a cancelled state and records when it was cancelled. (per meeting 2026-08-25, "a customer can cancel only a booking they own and only when its status is confirmed. A successful cancellation changes the booking status to cancelled and sets cancelled_at.")
- The confirmation prompt asks "Are you sure you want to cancel this booking?" After the customer confirms, the booking updates in place: it shows a Cancelled badge, displays the cancellation date, and no longer shows the Cancel action. (per meeting 2026-08-25, "The modal message should be: \"Are you sure you want to cancel this booking?\" After the customer confirms, the booking row should update in-place. It must show a Cancelled badge, display the cancellation date, and no longer display the Cancel action.")
- A booking can only be cancelled while check-in is still in the future. If check-in is today or has already passed, the cancellation attempt is rejected and the booking is left unchanged. (per meeting 2026-08-25, "cancellation is allowed only when check_in is strictly in the future. If check-in is today or has already passed, the cancellation request must be rejected with 409 Conflict, and the booking must remain unchanged.")
- These rules are enforced by the system itself, not just by hiding options in the interface — a cancellation request that violates them is refused even if it doesn't go through the app's screens, and a booking cannot be cancelled more than once. (per meeting 2026-08-25, "The API also needs to prevent duplicate cancellation and enforce ownership. The service layer, not the browser, should enforce these rules.")
- Trying to cancel a booking that's already cancelled is rejected as a conflict. Trying to cancel a booking that belongs to someone else is refused. Trying to cancel a booking that doesn't exist returns a not-found result. (per meeting 2026-08-25, "Cancelling an already-cancelled booking returns 409 Conflict. Cancelling another customer's booking returns 403 Forbidden. A booking that does not exist returns 404 Not Found.")

## Evidence
No codebase-wiki page exists — this feature isn't built yet.

## Open Questions
- Is `booking-cancellation` the right feature request for this work, or does it belong to an existing one? Created by an agent from meeting 2026-08-25 ("Boot-Camp booking cancellation review"); rename or merge if wrong.
- Should the displayed cancellation date show only the date, or both date and time? (raised in meeting 2026-08-25: "Should the cancellation date show only the date, or both date and time?")
- Should a cancelled booking stay in its current position in My Bookings, or move to the bottom of the list? (raised in meeting 2026-08-25: "Should cancelled bookings stay in their current list position, or move to the bottom of My Bookings?")
- What exact inline message should customers see when they try to cancel a booking on or after its check-in date? (raised in meeting 2026-08-25: "What exact inline message should users see for a past or current check-in date?")
- Should the Cancel button be labelled "Cancel" or "Cancel booking"? (raised in meeting 2026-08-25: "Should the Cancel button label be \"Cancel\" or \"Cancel booking\"?")
- Should the confirmation prompt's secondary button be labelled "Keep booking" or "Close"? (raised in meeting 2026-08-25: "Should the confirmation modal have a secondary button labelled \"Keep booking\" or \"Close\"?")

## Risks / Rejected Approaches
- Rejected: issuing refunds as part of this cancellation feature — out of scope for this work (per meeting 2026-08-25, "Do not include refunds, cancellation-policy windows, email notifications, hard deletion, undo or un-cancel behaviour, or admin cancellation of another customer's booking.")
- Rejected: enforcing a cancellation-policy time window — out of scope for this work (per meeting 2026-08-25, "Do not include refunds, cancellation-policy windows, email notifications, hard deletion, undo or un-cancel behaviour, or admin cancellation of another customer's booking.")
- Rejected: sending email notifications when a booking is cancelled — out of scope for this work (per meeting 2026-08-25, "Do not include refunds, cancellation-policy windows, email notifications, hard deletion, undo or un-cancel behaviour, or admin cancellation of another customer's booking.")
- Rejected: permanently deleting a cancelled booking — cancellations must remain visible in booking history instead (per meeting 2026-08-25, "Do not include refunds, cancellation-policy windows, email notifications, hard deletion, undo or un-cancel behaviour, or admin cancellation of another customer's booking.")
- Rejected: letting a customer undo or un-cancel a booking — out of scope for this work (per meeting 2026-08-25, "Do not include refunds, cancellation-policy windows, email notifications, hard deletion, undo or un-cancel behaviour, or admin cancellation of another customer's booking.")
- Rejected: letting an admin cancel a booking on another customer's behalf — out of scope for this work (per meeting 2026-08-25, "Do not include refunds, cancellation-policy windows, email notifications, hard deletion, undo or un-cancel behaviour, or admin cancellation of another customer's booking.")

## Relationships
