---
title: "Cancel action requires a confirmation modal"
date: 2026-08-25
id: DEC-0003
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: decided
evidence_quote: "On the My Bookings page, confirmed bookings should show a Cancel action. Clicking it must not cancel immediately; it should first show a confirmation modal. [...] Confirmed. The modal message should be: \"Are you sure you want to cancel this booking?\" After the customer confirms, the booking row should update in-place. It must show a Cancelled badge, display the cancellation date, and no longer display the Cancel action."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: ["DEC-0002"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-56/dec-0003-cancel-action-requires-a-confirmation-modal
---

## Statement
On the My Bookings page, confirmed bookings show a Cancel action that opens a confirmation modal ("Are you sure you want to cancel this booking?") before cancelling; after confirmation the row updates in place to show a Cancelled badge and the cancellation date, and the Cancel action is removed.

## Reconciliation Notes
No prior UI decision exists for this flow; it depends on DEC-0002's eligibility rule (Cancel only appears for confirmed bookings owned by the customer).
