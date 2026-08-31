---
title: "Cancellation policy acknowledgement ticket rejected as codebase mismatch"
date: 2026-08-31
id: DEC-0010
feature: cancellation-policy-acknowledgement
source_meeting: "Linear ticket ECT-37"
recording_id: ECT-37
transcript_id: https://linear.app/sairam-workspace/issue/ECT-37/dec-0001-cancellation-policy-acknowledgement-at-checkout
type: rejected
evidence_quote: "The actual codebase in this clone (repo `Sairam-Kickdrum/Boot-camp-starter`, per its `README.md`: \"Boot Camp Starter — a simplified room-booking application\") is a different application entirely: a single TypeScript monorepo with a Fastify API (`apps/api/src/routes|services|repositories/*` covering `rooms` and `bookings`) and a React/Vite frontend (`apps/web/src/routes/RoomsPage.tsx`, `BookingPage.tsx`, `BookingsPage.tsx`)."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: []
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-37/dec-0001-cancellation-policy-acknowledgement-at-checkout
---

## Statement
Ticket ECT-37 (cancellation policy acknowledgement at checkout) is rejected as a codebase mismatch — its entire architectural premise (a Java `kdu-flux-core-backend`/`kdu-2026-flux-ibe-service` stack, `PaymentInfo.tsx`, `BookingConfirmation.tsx`) does not correspond to this repo's actual Fastify + React/Vite stack.

## Reconciliation Notes
No existing decision in this project's ledger addresses cancellation-policy acknowledgement at checkout, so there is nothing this contradicts, supersedes, or duplicates. The rejection is a codebase-reality mismatch (the ticket describes a different application entirely), not a contested product decision, so no dependencies or roadmap ties apply.
