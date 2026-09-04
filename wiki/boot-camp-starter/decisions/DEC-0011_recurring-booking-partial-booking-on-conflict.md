---
title: "Recurring bookings: partial booking with a clear skipped-week list on conflict"
date: 2026-09-04
id: DEC-0011
feature: recurring-bookings
source_meeting: boot-camp-recurring-bookings-capacity-review
recording_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
transcript_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
type: decided
evidence_quote: "Book what's free and tell them clearly which weeks didn't happen. Refusing all twelve because of one clash is the kind of thing that makes people go back to doing it by hand. But it has to be obvious — not a toast that disappears."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: ["DEC-0010"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-63/recurring-bookings
---

## Statement
When a recurring series is created, the system books whichever weekly occurrences are free and clearly, persistently reports which weeks were skipped due to conflicts (e.g. "Booked 10 of 12. Week of 14 Oct and week of 4 Nov were already taken."), rather than refusing the whole series over a single clash.

## Reconciliation Notes
No prior decision covers this; it depends on DEC-0010 establishing the series/cadence/cap concept it applies to. The meeting specified this must appear as a persistent list on the confirmation screen, not a transient toast notification.
