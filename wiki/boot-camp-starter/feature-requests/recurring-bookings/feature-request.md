---
title: "Recurring Bookings"
slug: recurring-bookings
feature_id: FR-0002
description: "Users can book a recurring weekly series for the same room and time slot instead of creating each occurrence by hand."
domain: bookings
aliases: ["recurring bookings", "series bookings", "repeat weekly"]
owners: []
status: active
last_updated: 2026-09-09
dependencies: ["FR-0001"]
conflicts: []
proposed_by: agent
identity_confirmed: false
---

## Current State
Rooms are currently booked one occurrence at a time — there is no way to create a recurring series, so a person who needs the same room and slot every week has to make each week's booking by hand. (per meeting 2026-09-08, "The bookings table has no notion of a series at all. There's no parent column, no series id. And BookingRepository.hasConflict checks one row at a time, so for a series we'd have to loop it twelve times before we commit anything.")

## Key Facts
- Roughly 40-43 bookings a month are already an informal recurring pattern — the same room and time slot booked by hand for consecutive weeks — and a few of these have had gaps because whoever was creating them lost track partway through. (per meeting 2026-09-08, "Sanidhya pulled the numbers — roughly forty bookings a month that are obviously part of a series, same room, same time, consecutive weeks." / "Forty-three last month. And three of them had a gap in the middle because whoever was doing it lost their place.")

## Requirements
- A person can create a recurring booking series for a room and time slot with a weekly cadence, for up to 12 consecutive weeks. No other cadence (daily, monthly, or a custom pattern) is supported for now. (per meeting 2026-09-08, "Twelve weeks. That covers a cohort with room to spare, and if they need longer they can book again. Weekly only for now — no daily, no monthly, no \"every second Tuesday\". If someone asks for those later we'll look at it then.")

## Business Rules
- If some weeks in a requested series are already booked by someone else, the system books every week that's free and clearly lists, on the booking confirmation, exactly which weeks could not be booked — it does not refuse the whole series over a single clash. (per meeting 2026-09-08, "Book what's free and tell them clearly which weeks didn't happen... So a list on the confirmation screen. \"Booked 10 of 12. Week of 14 Oct and week of 4 Nov were already taken.\"")
- Cancelling a single occurrence of a recurring series only cancels that one booking, using the same cancel action already available for a standalone booking — the rest of the series is unaffected. (per meeting 2026-09-08, "Cancelling one occurrence cancels that occurrence... The existing cancel button keeps doing exactly what it does — one booking.")
- Cancelling an entire recurring series is a separate, explicit action next to the single-booking cancel action, and requires the person to confirm before it proceeds, since it frees every remaining booked week at once. (per meeting 2026-09-08, "If you want the whole series gone there should be a separate way to do that, and it should ask you to confirm, because that's twelve rooms freed at once... The series cancel is a separate thing next to it. Don't overload the same control.")

## Evidence
No codebase-wiki page exists — this feature isn't built yet.

## Open Questions
- What happens when someone cancels an entire series that's partially in the past — are already-occurred bookings in that series removed, or only the remaining future ones? Deferred pending a check with the ops team. (raised in meeting 2026-09-08: "What about a series that's half in the past? If four weeks already happened and I cancel the series?... Good question, and I don't know... Past bookings are a record of a room that was actually used, so I don't think we should be deleting them, but I want to check with ops before we decide. Put it down as open.")
- Who is allowed to cancel an entire recurring series — only the person who created it, or anyone? Today anyone can cancel anyone's booking, which may not be the right permission model, but that's a broader question about booking permissions generally, left open here. (raised in meeting 2026-09-08: "who's allowed to cancel a series — only the person who made it, or anyone?... Today anybody can cancel anybody's booking, which I'm not sure is right either, but that's a bigger conversation about permissions and I don't want to open it inside this. Leave it as an open question on this one.")

## Risks / Rejected Approaches
Nothing recorded yet.

## Relationships
**Depends On:** [FR-0001](../booking-cancellation/feature-request.md) — cancelling one occurrence of a series reuses the existing single-booking cancel action as-is.
