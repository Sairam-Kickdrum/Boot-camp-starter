---
title: "Open: block vs. warn on over-capacity bookings, pending capacity data cleanup"
date: 2026-09-04
id: DEC-0015
feature: room-capacity-enforcement
source_meeting: boot-camp-recurring-bookings-capacity-review
recording_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
transcript_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
type: unresolved
evidence_quote: "Right, and if we only warn, nobody reads it. I genuinely don't know which one is correct here, and I don't want to guess — it depends on whether the capacity numbers are trustworthy, and right now they aren't. So: not decided. Leave the whole thing open. We need the capacity data cleaned up before the question is even answerable."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: []
  changes_plan: false
supersedes: []
linear_issue: null
---

## Statement
Whether an over-capacity booking (more attendees than the room's stated capacity) should be blocked outright or only produce a warning is undecided, and cannot be decided until room capacity data — currently nullable and largely unpopulated — is cleaned up and an attendee-count is actually collected on bookings.

## Reconciliation Notes
No prior decision covers room capacity. A related follow-up (filing a ticket to clean up the capacity data) was explicitly deferred: "Not yet. Let's understand who owns that data first." — so even the cleanup work itself has not been actioned yet.
