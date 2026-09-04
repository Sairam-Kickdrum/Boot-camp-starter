---
title: "Open: who may cancel a series — contradicts existing ownership-based cancellation rule"
date: 2026-09-04
id: DEC-0014
feature: recurring-bookings
source_meeting: boot-camp-recurring-bookings-capacity-review
recording_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
transcript_id: 1EGkK5GKFYmt6UmFcNS98TNhyq3TZ4QTzQ23GuTrSZCI
type: unresolved
evidence_quote: "Also open. Today anybody can cancel anybody's booking, which I'm not sure is right either, but that's a bigger conversation about permissions and I don't want to open it inside this. Leave it as an open question on this one."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: ["DEC-0002"]
  on_roadmap: false
  dependencies: ["DEC-0012"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-63/recurring-bookings
---

## Statement
Who is allowed to cancel a recurring series — only the person who created it, or anyone — is left as an explicitly open question, deferred to a broader permissions conversation.

## Reconciliation Notes
**Unresolved contradiction, not auto-resolved:** this item asserts, as a statement of today's system behavior, that "anybody can cancel anybody's booking." That directly contradicts [DEC-0002](DEC-0002_cancellation-eligibility-ownership-status.md), which states "a customer can cancel only a booking they own." What each says: DEC-0002 records an already-decided ownership-based eligibility rule for single-booking cancellation; this meeting describes current production behavior as having no such ownership restriction in practice. A human needs to choose between: (a) DEC-0002's ownership rule is authoritative and this meeting's characterization of "today" is stale or mistaken; (b) DEC-0002 was decided but has not actually been implemented/shipped yet, so the ownership check does not yet exist in the running system — a decided-vs-shipped gap; or (c) leave both single- and series-level cancellation permissions open together as part of the larger permissions conversation Karan Jagdish explicitly declined to open in this meeting. This decision record intentionally leaves the tension unresolved rather than picking one of these for the human.
