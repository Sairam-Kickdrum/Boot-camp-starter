---
title: "Whether DEC-0009's scope exclusions need dedicated negative-test coverage"
date: 2026-08-26
id: DEC-0010
feature: booking-cancellation
source_meeting: "Linear ticket ECT-62"
recording_id: ECT-62
transcript_id: https://linear.app/sairam-workspace/issue/ECT-62/dec-0009-cancellation-scope-excludes-refunds-policy-windows
type: unresolved
evidence_quote: "This ticket's exclusions (no refund calc, no notification, no hard delete, no undo, no admin-cancel-of-others) are only verifiable today by the absence of corresponding code. Should the implementation of DEC-0001–DEC-0007 include explicit negative-assertion tests for these exclusions (e.g. a test confirming cancellation triggers no notification/refund call), or is \"no such code exists\" sufficient acceptance evidence without a dedicated test?"
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: [DEC-0009]
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-62/dec-0009-cancellation-scope-excludes-refunds-policy-windows
---

## Statement
It is not yet decided whether the DEC-0001–DEC-0007 implementation needs dedicated negative-assertion tests proving DEC-0009's exclusions (no refund/credit calc, no notification, no hard delete, no undo, no admin-cancel) hold, or whether the absence of the corresponding code is sufficient acceptance evidence on its own.

## Reconciliation Notes
This is a new open question raised on ticket ECT-62 against the already-recorded DEC-0009 — it does not restate DEC-0009's substance (the exclusions themselves are unchanged and uncontested), so it is not a duplicate. It depends on DEC-0009 and does not contradict it.
