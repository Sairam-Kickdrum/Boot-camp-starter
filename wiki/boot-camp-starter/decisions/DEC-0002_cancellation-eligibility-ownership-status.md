---
title: "Cancellation eligibility: ownership + confirmed status"
date: 2026-08-25
id: DEC-0002
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: decided
evidence_quote: "Decision: a customer can cancel only a booking they own and only when its status is confirmed. A successful cancellation changes the booking status to cancelled and sets cancelled_at."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: ["DEC-0001"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-55/dec-0002-cancellation-eligibility-ownership-confirmed-status
---

## Statement
A customer may cancel a booking only if they own it and its status is `confirmed`; a successful cancellation sets the booking's status to `cancelled` and records `cancelled_at`.

## Reconciliation Notes
No prior decision covers this; it builds directly on the soft-delete model from DEC-0001 by defining the state transition that soft-delete performs.
