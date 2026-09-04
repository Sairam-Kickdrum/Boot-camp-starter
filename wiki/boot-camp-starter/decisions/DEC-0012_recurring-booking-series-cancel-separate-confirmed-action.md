---
title: "Series cancellation is a separate, confirmed action from single-occurrence cancel"
date: 2026-09-04
id: DEC-0012
feature: recurring-bookings
source_meeting: boot-camp-recurring-bookings-capacity-review
recording_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
transcript_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
type: decided
evidence_quote: "No. Definitely not. Cancelling one occurrence cancels that occurrence. If you want the whole series gone there should be a separate way to do that, and it should ask you to confirm, because that's twelve rooms freed at once. [...] The existing cancel button keeps doing exactly what it does — one booking. The series cancel is a separate thing next to it. Don't overload the same control."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: ["DEC-0010", "DEC-0001", "DEC-0002", "DEC-0003"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-63/recurring-bookings
---

## Statement
Cancelling a single occurrence of a recurring series cancels only that occurrence, using the existing single-booking Cancel control unchanged; cancelling the entire series is a separate, explicitly-confirmed action placed alongside it, never overloading the single-occurrence control.

## Reconciliation Notes
Depends on DEC-0010 (series concept) and reaffirms rather than changes booking-cancellation's existing single-booking flow (DEC-0001, DEC-0002, DEC-0003) — the meeting explicitly confirmed the shipped cancel button's behavior is untouched. The new substance here is the separate, confirmation-gated whole-series cancel action, so this is recorded as a new decision rather than `on_roadmap: true`.
