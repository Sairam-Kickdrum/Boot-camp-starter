---
title: "Accessible room search ticket rejected as codebase mismatch"
date: 2026-09-04
id: DEC-0010
feature: null
source_meeting: "Linear ticket ECT-39"
recording_id: ECT-39
transcript_id: https://linear.app/sairam-workspace/issue/ECT-39/dec-0003-accessible-room-search-and-booking-eligibility
type: rejected
evidence_quote: "The repository actually checked out for this round is `Sairam-Kickdrum/Boot-camp-starter` — a single TypeScript monorepo (per its root `README.md` and `CLAUDE.md`): a Fastify + TypeScript API at `apps/api`, a React + Vite frontend at `apps/web`, shared Zod types in `packages/shared-types`, and a Drizzle/Postgres schema under `db/schema`."
reconciliation:
  existed_before: false
  previously_rejected: false
  contradicts: []
  on_roadmap: false
  dependencies: []
  changes_plan: false
supersedes: []
linear_issue: https://linear.app/sairam-workspace/issue/ECT-39/dec-0003-accessible-room-search-and-booking-eligibility
---

## Statement

Ticket ECT-39's accessible-room search and booking eligibility requirements were rejected as a codebase mismatch: the ticket's Summary, Acceptance Criteria, and Existing System Behavior describe a Java/Spring "KDU Flux" microservice architecture (`kdu-flux-core-backend`, `kdu-2026-flux-ibe-service`, `kdu-2026-flux-frontend`) that does not exist anywhere in this repository.

## Reconciliation Notes

No accessible-room-related feature request or decision exists anywhere in this project's wiki, so feature mapping found no match and conflict detection found no precedent or contradiction to reconcile against — this ticket's content targets a different product's codebase entirely, not an unbuilt capability of this one, so `feature` is left `null` rather than seeding a new feature-request candidate for a capability that isn't actually in this project's domain.
