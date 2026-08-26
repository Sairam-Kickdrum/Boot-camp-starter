---
title: "API enforces duplicate-cancellation, ownership, and existence checks server-side"
date: 2026-08-25
id: DEC-0005
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: decided
evidence_quote: "The service layer, not the browser, should enforce these rules. [...] Confirmed. Cancelling an already-cancelled booking returns 409 Conflict. Cancelling another customer’s booking returns 403 Forbidden. A booking that does not exist returns 404 Not Found."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: ["DEC-0002"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-58/dec-0005-api-enforces-duplicate-cancellation-ownership-and-existence
---

## Statement
The booking service layer (not the client) enforces cancellation rules server-side: cancelling an already-cancelled booking returns 409 Conflict, cancelling another customer's booking returns 403 Forbidden, and cancelling a nonexistent booking returns 404 Not Found.

## Reconciliation Notes
No prior decision covers these error semantics; it extends DEC-0002's ownership/status eligibility rule with the specific server-side error codes for each violation. Related test coverage was called out for the already-cancelled, wrong-owner, and not-found cases, per the same meeting.
