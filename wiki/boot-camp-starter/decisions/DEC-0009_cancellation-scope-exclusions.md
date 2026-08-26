---
title: "Cancellation scope excludes refunds, policy windows, notifications, hard delete, undo, and admin cancellation"
date: 2026-08-25
id: DEC-0009
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: rejected
evidence_quote: "Do not include refunds, cancellation-policy windows, email notifications, hard deletion, undo or un-cancel behaviour, or admin cancellation of another customer’s booking."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: []
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-62/dec-0009-cancellation-scope-excludes-refunds-policy-windows
---

## Statement
The initial booking-cancellation implementation explicitly excludes refunds, cancellation-policy windows, email notifications, hard deletion, undo/un-cancel behavior, and admin cancellation of another customer's booking.

## Reconciliation Notes
No prior decision covers this; it is an explicit scope-exclusion call made in the same meeting that defined the feature, recorded so these ideas aren't silently re-proposed without context later.
