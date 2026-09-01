---
title: "ECT-59 implementation-scope open questions for DEC-0006"
date: 2026-09-01
id: DEC-0010
feature: booking-cancellation
source_meeting: "Linear ticket ECT-59"
recording_id: ECT-59
transcript_id: https://linear.app/sairam-workspace/issue/ECT-59/dec-0006-frontend-cancel-action-visibility-and-inline-error-handling
type: unresolved
evidence_quote: "Should the inline error message text differ by status code (409 already-cancelled/past-check-in vs 403 wrong-owner vs 404 not-found), or is one generic message acceptable for all rejection cases?"
reconciliation:
  existed_before: true
  previously_rejected: false
  contradicts: []
  on_roadmap: true
  dependencies: ["DEC-0002", "DEC-0004", "DEC-0005"]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-59/dec-0006-frontend-cancel-action-visibility-and-inline-error-handling
---

## Statement
Implementation of DEC-0006 (frontend Cancel-action visibility and inline error handling) is blocked pending answers to five open questions raised in ECT-59's round 1: whether the ticket's scope is the DEC-0006 slice alone or the full epic's acceptance criteria, whether it should block on or stub the not-yet-built cancel API, in-flight/double-submit UX and scope boundaries, whether the inline error is shown per-row or page-level, and whether the error message text should vary by status code.

## Reconciliation Notes
This does not change or contradict DEC-0006's substance — it is the same decision, still awaiting ticket-level clarification before the align loop can mark ECT-59 `aligned`. Recorded as `unresolved` (rather than skipped as a duplicate) because DEC-0006 is `decided` while this ticket round is `unresolved` — a real content/type divergence, not a no-op re-confirmation.
