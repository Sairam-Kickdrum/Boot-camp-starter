---
title: "Recurring Bookings"
slug: recurring-bookings
owners:
  - Karan Jagdish (Product)
status: active
last_updated: 2026-09-04
proposed_by: agent
identity_confirmed: false
---

## Current State
No recurring-booking capability exists yet — this is a new feature request. As scoped: a customer picks a room and slot and marks it to repeat weekly, creating a series capped at twelve occurrences ([DEC-0010](../../decisions/DEC-0010_recurring-booking-weekly-cadence-twelve-week-cap.md)). If some occurrences conflict with existing bookings, the series books whatever is free and clearly lists which weeks were skipped rather than failing the whole series ([DEC-0011](../../decisions/DEC-0011_recurring-booking-partial-booking-on-conflict.md)). Cancelling one occurrence only cancels that occurrence via the existing, unchanged single-booking Cancel control; cancelling the whole series is a separate, explicitly-confirmed action next to it ([DEC-0012](../../decisions/DEC-0012_recurring-booking-series-cancel-separate-confirmed-action.md)).

## Key Facts
- Roughly 40+ bookings a month (43 last month) are already informally recurring series created one booking at a time by hand, sometimes with gaps from manual error — the motivating workload for this feature. ([DEC-0010](../../decisions/DEC-0010_recurring-booking-weekly-cadence-twelve-week-cap.md))
- The bookings table currently has no series/parent concept, and `BookingRepository.hasConflict` checks conflicts one row at a time — implementation will need a schema change and a batch-aware conflict check. ([DEC-0010](../../decisions/DEC-0010_recurring-booking-weekly-cadence-twelve-week-cap.md))

## Requirements
- A customer can pick a room and slot and mark it to repeat weekly, creating a series of up to twelve occurrences; no daily, monthly, or custom cadence for now. ([DEC-0010](../../decisions/DEC-0010_recurring-booking-weekly-cadence-twelve-week-cap.md))
- If some weeks in the series conflict with existing bookings, the system books the free weeks and shows a clear, persistent list of which weeks were skipped (e.g. "Booked 10 of 12. Week of 14 Oct and week of 4 Nov were already taken.") — never a transient toast. ([DEC-0011](../../decisions/DEC-0011_recurring-booking-partial-booking-on-conflict.md))
- Cancelling a single occurrence uses the existing single-booking Cancel control, unchanged. Cancelling the entire series is a separate action placed alongside it and requires explicit confirmation before all remaining rooms are freed. ([DEC-0012](../../decisions/DEC-0012_recurring-booking-series-cancel-separate-confirmed-action.md))

## Business Rules
- A recurring series is capped at twelve weekly occurrences. ([DEC-0010](../../decisions/DEC-0010_recurring-booking-weekly-cadence-twelve-week-cap.md))
- Series-level cancellation is always a distinct, confirmation-gated action from single-occurrence cancellation. ([DEC-0012](../../decisions/DEC-0012_recurring-booking-series-cancel-separate-confirmed-action.md))

## Decisions
| Date | Title | Type | Ticket |
|---|---|---|---|
| 2026-09-04 | [Recurring bookings: weekly-only cadence, twelve-week cap](../../decisions/DEC-0010_recurring-booking-weekly-cadence-twelve-week-cap.md) | decided | Draft (pending) |
| 2026-09-04 | [Recurring bookings: partial booking with a clear skipped-week list on conflict](../../decisions/DEC-0011_recurring-booking-partial-booking-on-conflict.md) | decided | Draft (pending) |
| 2026-09-04 | [Series cancellation is a separate, confirmed action from single-occurrence cancel](../../decisions/DEC-0012_recurring-booking-series-cancel-separate-confirmed-action.md) | decided | Draft (pending) |
| 2026-09-04 | [Open: cancelling a series that is partially in the past](../../decisions/DEC-0013_recurring-booking-partial-past-series-cancellation-open.md) | unresolved | Draft (pending) |
| 2026-09-04 | [Open: who may cancel a series — contradicts existing ownership-based cancellation rule](../../decisions/DEC-0014_recurring-booking-series-cancel-permission-open.md) | unresolved | Draft (pending) |

## Evidence
- [DEC-0010](../../decisions/DEC-0010_recurring-booking-weekly-cadence-twelve-week-cap.md)
- [DEC-0011](../../decisions/DEC-0011_recurring-booking-partial-booking-on-conflict.md)
- [DEC-0012](../../decisions/DEC-0012_recurring-booking-series-cancel-separate-confirmed-action.md)
- [DEC-0013](../../decisions/DEC-0013_recurring-booking-partial-past-series-cancellation-open.md)
- [DEC-0014](../../decisions/DEC-0014_recurring-booking-series-cancel-permission-open.md)

## Open Questions
- Is `recurring-bookings` the right feature request for this work, or does it belong to an existing one? Created by an agent from ticket `boot-camp-recurring-bookings-capacity-review` (local wiki-ingest run); rename or merge if wrong.
- Should cancelling an entire series that is partially in the past affect (or delete) the already-occurred, past occurrences, or only ever apply to future ones? ([DEC-0013](../../decisions/DEC-0013_recurring-booking-partial-past-series-cancellation-open.md))
- Who is allowed to cancel a series — only its creator, or anyone? This surfaces an unresolved contradiction with [DEC-0002](../../decisions/DEC-0002_cancellation-eligibility-ownership-status.md) on booking-cancellation's ownership rule — see [DEC-0014](../../decisions/DEC-0014_recurring-booking-series-cancel-permission-open.md) for the full contradiction and the options a human needs to choose between. ([DEC-0014](../../decisions/DEC-0014_recurring-booking-series-cancel-permission-open.md))

**Resolved:**
- Nothing recorded yet.

## Risks / Rejected Approaches
Nothing recorded yet.

## Relationships
**Related:** booking-cancellation — series-level cancellation sits alongside the existing single-booking cancellation flow, which [DEC-0012](../../decisions/DEC-0012_recurring-booking-series-cancel-separate-confirmed-action.md) explicitly leaves unchanged; [DEC-0014](../../decisions/DEC-0014_recurring-booking-series-cancel-permission-open.md) also surfaces an unresolved contradiction with booking-cancellation's ownership rule ([DEC-0002](../../decisions/DEC-0002_cancellation-eligibility-ownership-status.md)).
