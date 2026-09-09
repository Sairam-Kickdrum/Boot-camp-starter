---
title: "Room Capacity Checks"
slug: room-capacity-checks
feature_id: FR-0003
description: "Booking a room checks the number of attendees against the room's capacity, so people can't book a room that's too small for their session."
domain: bookings
aliases: ["capacity checking", "room capacity"]
owners: []
status: active
last_updated: 2026-09-09
dependencies: []
conflicts: []
proposed_by: agent
identity_confirmed: false
---

## Current State
Rooms have a capacity value, but nothing checks it against how many people are attending a session, and the booking flow doesn't currently ask how many people are coming. (per meeting 2026-09-08, "There's a capacity number on the room but nothing checks it, and nothing even asks how many people are coming.")

## Key Facts
- The room capacity information that exists today is unreliable — it isn't consistently filled in when a room is set up, and roughly half of rooms don't have a capacity value recorded at all. (per meeting 2026-09-08, "We'd need to ask for it, and the rooms table would need the capacity actually populated — it's nullable right now and half the rows are empty.")

## Requirements
Nothing recorded yet.

## Business Rules
Nothing recorded yet.

## Evidence
No codebase-wiki page exists — this feature isn't built yet.

## Open Questions
- Should booking a room with more attendees than its recorded capacity be blocked outright, or allowed with a warning? Left undecided because today's capacity numbers aren't trustworthy enough to safely block on. (raised in meeting 2026-09-08: "do we block the booking, or warn and let them through?... I genuinely don't know which one is correct here, and I don't want to guess — it depends on whether the capacity numbers are trustworthy, and right now they aren't. So: not decided. Leave the whole thing open.")
- Who owns keeping room capacity data accurate and complete? Needs to be answered before any data-cleanup work is scheduled. (raised in meeting 2026-09-08: "Should I do a ticket for cleaning the capacity data?... Not yet. Let's understand who owns that data first. Leave it open.")

## Risks / Rejected Approaches
Nothing recorded yet.

## Relationships
Nothing recorded yet.
