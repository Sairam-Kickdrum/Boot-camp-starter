---
title: "Open UX/copy questions for the cancellation flow"
date: 2026-08-25
id: DEC-0008
feature: booking-cancellation
source_meeting: boot-camp-booking-cancellation-review-3
recording_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
transcript_id: 1ZJ7Sb4VtzdJavq55cBYP9-m2v9aIqIQt7iaQ_5Blef0
type: unresolved
evidence_quote: "The following product decisions are still open and must be clarified before implementation: 1. Should the cancellation date show only the date, or both date and time? 2. Should cancelled bookings stay in their current list position, or move to the bottom of My Bookings? 3. What exact inline message should users see for a past or current check-in date? 4. Should the Cancel button label be “Cancel” or “Cancel booking”? 5. Should the confirmation modal have a secondary button labelled “Keep booking” or “Close”?"
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: ["DEC-0003", "DEC-0004"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-61/dec-0008-open-uxcopy-questions-for-the-cancellation-flow
---

## Statement
Five UX/copy details for the cancellation flow remain undecided: cancellation-date display format (date-only vs. date+time), whether cancelled bookings stay in place or move to the bottom of the My Bookings list, the exact inline error message for a past/current check-in, the Cancel button's label, and the confirmation modal's secondary-button label. These must be resolved via the Boot-Camp alignment workflow before the implementation ticket is finalized.

## Reconciliation Notes
No prior decision covers these; they are open questions surfaced against DEC-0003 (modal/UI copy) and DEC-0004 (check-in error case), explicitly flagged in the meeting as blocking before implementation.
