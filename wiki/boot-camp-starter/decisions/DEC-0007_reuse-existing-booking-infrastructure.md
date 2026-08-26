---
title: "Cancellation reuses existing booking infrastructure"
date: 2026-08-25
id: DEC-0007
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: decided
evidence_quote: "Use the existing booking routes, authentication flow, booking service, repository, and My Bookings page. No new page or route is needed. The existing status and nullable cancelled_at booking fields should be used."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: []
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-60/dec-0007-cancellation-reuses-existing-booking-infrastructure
---

## Statement
Booking cancellation is implemented entirely on top of existing infrastructure — the existing booking routes, authentication flow, booking service, repository, and My Bookings page — with no new page or route, using the existing `status` and nullable `cancelled_at` booking fields.

## Reconciliation Notes
No prior decision covers this; it sets the implementation-scope constraint that the rest of this feature's decisions build within.
