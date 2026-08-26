---
title: "Booking cancellation is a soft-delete"
date: 2026-08-25
id: DEC-0001
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: decided
evidence_quote: "Cancellation must be a soft-delete. The booking record should remain in the database and remain visible in My Bookings, because customers need their booking history."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: []
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-54/dec-0001-booking-cancellation-is-a-soft-delete
---

## Statement
Cancelling a booking is implemented as a soft-delete: the booking record is preserved in the database and remains visible in My Bookings so customers retain their booking history.

## Reconciliation Notes
No prior decisions exist for this project (fresh wiki), so nothing existed before, nothing is contradicted, and nothing is on the roadmap yet — this establishes the baseline data-model approach for the feature.
