---
title: "Frontend Cancel-action visibility and inline error handling"
date: 2026-08-25
id: DEC-0006
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: decided
evidence_quote: "The frontend will only render the Cancel action for bookings whose status is confirmed. If the API rejects a cancellation, the row should not change and the page should show an inline error message."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: ["DEC-0002", "DEC-0003"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-59/dec-0006-frontend-cancel-action-visibility-and-inline-error-handling
---

## Statement
The frontend renders the Cancel action only for bookings with status `confirmed`; if the API rejects a cancellation request, the booking row stays unchanged and an inline error message is shown on the page.

## Reconciliation Notes
No prior decision covers this; it is the frontend-side mirror of the eligibility rule (DEC-0002) and the modal/UI flow (DEC-0003), specifying what happens when the server-side rejects a request the client allowed the user to attempt.
