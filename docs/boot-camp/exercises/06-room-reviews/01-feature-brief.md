> **Start here.** Read this document fully before opening any other file in this exercise.

# Feature Brief: Room Reviews & Ratings

**Tier:** Advanced (AI-SDLC Mode 2)
**Module:** Boot Camp Starter — Room Booking App
**Author (PM):** Boot Camp Facilitator
**Date:** 2026-06-19
**Linear Ticket:** BOOTCAMP-6
**Prototype:** Scaffold running at `http://localhost:5173/rooms`

---

## What

Users who have completed a stay should be able to leave a review — a star rating and a short comment — on the room they booked. Reviews are visible to all users browsing rooms. Admins can remove reviews that violate community guidelines.

---

## Who

**Primary:** Any authenticated user (`role = 'user'` or `role = 'admin'`) who has a past booking for a room where `check_out` is in the past and `status = 'confirmed'`.

**Secondary:** Admins who need to moderate reviews.

---

## Where

Somewhere near the room. Maybe the rooms list, maybe a room detail page — that's up to you to figure out. The review form should be accessible from a booking the user completed.

---

## Approach

You'll need a new table to store reviews. Think about what columns make sense and what constraints apply. The average rating probably needs to show up on rooms somehow — decide whether you calculate it on the fly or store it. The admin moderation flow probably touches the admin area from Exercise 03.

---

## What's New

- **New DB table + migration?** Probably — think it through.
- **New service?** Likely — or extend an existing one.
- **New routes?** Yes — at minimum something to submit and fetch reviews.
- **New page or UI?** Yes — users need to see and submit reviews somewhere.
- **Touches admin area?** Possibly — moderation needs a home.

---

## Prototype Reference

Run the scaffold locally:
```
http://localhost:5173/rooms
```
The Rooms page currently shows a list of rooms with name, capacity, and price. There is no ratings display, no review form, and no room detail page.

---

## Interaction Model

- **Interaction pattern:** Form submission (write a review) + read-only list (browse reviews).
- **State location:** Server-persisted — new table in Postgres.
- **Sync vs async:** Review submission is synchronous. Average rating display — your call.
- **Conversation memory:** Not applicable.

---

## Open Questions

These are intentionally left open. You will need to resolve them with your team (or an agent) before implementing.

- Can a user review a room more than once? Once per completed booking? Once per room ever?
- What happens to the review if a booking is later disputed or the status changes?
- Should the average rating be a stored column on `rooms` or a live aggregation query?
- Does "completed stay" mean `check_out < today`, or does it include today?
- What does admin moderation look like — soft-delete, a `flagged` status, or a workflow to approve/reject?
- Where does the review form live — on a room detail page, on the My Bookings row, or somewhere else?
- Can users edit or delete their own reviews after submitting?
- Do anonymous (logged-out) users see reviews?

---

## Excluded Features

- **Review responses from room owners** — not applicable in this app (no host role).
- **Review voting / helpfulness scores** — out of scope for v1.
- **Photo attachments on reviews** — out of scope.
- **Review notifications** — not in scope for this exercise.

---

## Success Metric

A participant can complete a booking, then navigate to the room and leave a star rating and comment. The average rating is visible to all users on the rooms page. An admin can remove an inappropriate review. The `e2e/exercises/06-room-reviews.spec.ts` Playwright test passes on the participant's branch without modification.
