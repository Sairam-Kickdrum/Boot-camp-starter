---
title: "Cancellation Policy Acknowledgement at Checkout"
slug: cancellation-policy-acknowledgement
owners:
  - unassigned
status: active
last_updated: 2026-08-31
proposed_by: agent
identity_confirmed: false
---

## Current State
Nothing recorded yet. [DEC-0010](../../decisions/DEC-0010_cancellation-policy-acknowledgement-rejected-mismatch.md)
rejected the ticket that proposed this capability as a codebase mismatch — its architectural
premise (a Java `kdu-flux-core-backend`/`kdu-2026-flux-ibe-service` stack, `PaymentInfo.tsx`,
`BookingConfirmation.tsx`) does not correspond to this repo's actual Fastify + React stack.

## Key Facts
Nothing recorded yet.

## Requirements
Nothing recorded yet.

## Business Rules
Nothing recorded yet.

## Decisions
| Date | Title | Type | Ticket |
|---|---|---|---|
| 2026-08-31 | [Cancellation policy acknowledgement ticket rejected as codebase mismatch](../../decisions/DEC-0010_cancellation-policy-acknowledgement-rejected-mismatch.md) | rejected | [ECT-37](https://linear.app/sairam-workspace/issue/ECT-37/dec-0001-cancellation-policy-acknowledgement-at-checkout) |

## Evidence
- [DEC-0010](../../decisions/DEC-0010_cancellation-policy-acknowledgement-rejected-mismatch.md)

## Open Questions
- Is `cancellation-policy-acknowledgement` the right feature request for this work, or does it belong to an existing one? Created by an agent from ticket `ECT-37`; rename or merge if wrong.

**Resolved:**
Nothing recorded yet.

## Risks / Rejected Approaches
- The ticket's entire architectural premise (Java backend services, `PaymentInfo.tsx`, `BookingConfirmation.tsx`) does not exist in this codebase; rejected as a codebase mismatch, not an honest dependency on unbuilt work. [DEC-0010](../../decisions/DEC-0010_cancellation-policy-acknowledgement-rejected-mismatch.md)

## Relationships
Nothing recorded yet.
