---
title: "Room Capacity Enforcement"
slug: room-capacity-enforcement
owners:
  - Karan Jagdish (Product)
status: active
last_updated: 2026-09-04
proposed_by: agent
identity_confirmed: false
---

## Current State
No capacity enforcement exists today — this is a new feature request. Rooms have a capacity field, but it is nullable and largely unpopulated, nothing checks a booking's attendee count against it, and the system does not even collect an attendee count when a booking is made. Whether over-capacity bookings should be blocked or only warned about is undecided pending a capacity-data cleanup effort. ([DEC-0015](../../decisions/DEC-0015_room-capacity-enforcement-open.md))

## Key Facts
- Room capacity is stored but nullable, and roughly half of room rows have it unpopulated — the data is not currently trustworthy enough to enforce against. ([DEC-0015](../../decisions/DEC-0015_room-capacity-enforcement-open.md))
- Bookings do not currently capture an attendee count at all. ([DEC-0015](../../decisions/DEC-0015_room-capacity-enforcement-open.md))

## Requirements
Nothing recorded yet.

## Business Rules
Nothing recorded yet.

## Decisions
| Date | Title | Type | Ticket |
|---|---|---|---|
| 2026-09-04 | [Open: block vs. warn on over-capacity bookings, pending capacity data cleanup](../../decisions/DEC-0015_room-capacity-enforcement-open.md) | unresolved | Draft (pending) |

## Evidence
- [DEC-0015](../../decisions/DEC-0015_room-capacity-enforcement-open.md)

## Open Questions
- Is `room-capacity-enforcement` the right feature request for this work, or does it belong to an existing one? Created by an agent from ticket `boot-camp-recurring-bookings-capacity-review` (local wiki-ingest run); rename or merge if wrong.
- Should an over-capacity booking be blocked outright, or only produce a warning? Left undecided because current capacity data isn't trustworthy enough to answer this yet. ([DEC-0015](../../decisions/DEC-0015_room-capacity-enforcement-open.md))
- Who owns the room capacity data, and when will it be cleaned up (and an attendee-count field added to bookings)? A cleanup ticket was explicitly deferred until the data owner is identified. ([DEC-0015](../../decisions/DEC-0015_room-capacity-enforcement-open.md))

**Resolved:**
- Nothing recorded yet.

## Risks / Rejected Approaches
Nothing recorded yet.

## Relationships
Nothing recorded yet.
