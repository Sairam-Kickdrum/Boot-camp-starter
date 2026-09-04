---
title: "Recurring bookings: weekly-only cadence, twelve-week cap"
date: 2026-09-04
id: DEC-0010
feature: recurring-bookings
source_meeting: boot-camp-recurring-bookings-capacity-review
recording_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
transcript_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
type: decided
evidence_quote: "Twelve weeks. That covers a cohort with room to spare, and if they need longer they can book again. Weekly only for now — no daily, no monthly, no \"every second Tuesday\". If someone asks for those later we'll look at it then."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: []
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-63/recurring-bookings
---

## Statement
Recurring bookings support only a weekly cadence (no daily, monthly, or custom recurrence patterns), with a series capped at a maximum of twelve occurrences.

## Reconciliation Notes
No prior decision covers recurring bookings — this is the first decision establishing the capability. Motivated by ops manually creating roughly 40+ same-room/same-slot bookings a month (43 last month per the meeting), some with gaps from manual error. The meeting also noted the bookings table currently has no series/parent concept and `BookingRepository.hasConflict` checks one row at a time, which implementation will need to account for.
