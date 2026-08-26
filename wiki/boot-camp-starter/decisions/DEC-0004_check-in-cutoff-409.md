---
title: "Cancellation blocked once check-in has arrived"
date: 2026-08-25
id: DEC-0004
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: decided
evidence_quote: "Decision: cancellation is allowed only when check_in is strictly in the future. If check-in is today or has already passed, the cancellation request must be rejected with 409 Conflict, and the booking must remain unchanged."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: ["DEC-0002"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-57/dec-0004-cancellation-blocked-once-check-in-has-arrived
---

## Statement
Cancellation is only permitted while `check_in` is strictly in the future; if check-in is today or has already passed, the API rejects the cancellation with 409 Conflict and leaves the booking unchanged.

## Reconciliation Notes
No prior decision covers this cutoff rule; it adds a time-based guard on top of the ownership/status eligibility established in DEC-0002. Related test coverage was called out for the past/current check-in case (unit tests and a Playwright guard test), per the same meeting.
