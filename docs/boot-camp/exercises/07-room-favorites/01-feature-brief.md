> **Start here.** Read this document fully before opening any other file in this exercise.

# Feature Brief: Room Favorites / Save for Later

**Tier:** Medium (AI-SDLC Mode 1)
**Module:** Boot Camp Starter — Room Booking App
**Author (PM):** Boot Camp Facilitator
**Date:** 2026-06-22
**Linear Ticket:** BOOTCAMP-7
**Prototype:** Scaffold running at `http://localhost:5173/rooms`

---

## What

Users should be able to save rooms they like and view their curated list later. A "Save" button appears on each room card; saved rooms are marked visually. Users can view all their saved rooms on a dedicated "Favorites" view and remove rooms from their list.

---

## Who

**Primary:** Any authenticated user (`role = 'user'` or `role = 'admin'`) who wants to bookmark rooms for later.

**Secondary:** All users (logged in or not) should see the "Save" button, but only logged-in users can actually save.

---

## Where

On the **Rooms** page (`/rooms`). Each room card gets a "Save" / "Saved" button (or icon). Saved rooms appear:
- Marked distinctly on the main `/rooms` list (e.g., filled heart vs outline heart).
- Collected in a new "Favorites" tab or view — your choice how to expose it (separate page at `/favorites`, or a filter tab on `/rooms`).

---

## Approach

You'll probably need a new table to link users to rooms (`user_favorites` or similar). Decide whether to store the favorites in the database or in the browser (localStorage / session state). If stored in the database, you'll need:
- A new table and migration.
- Backend endpoints to add/remove favorites.
- Frontend state management to reflect add/remove UI feedback.

If stored in the browser, you'll need localStorage management and handle the logged-in → logged-out transition carefully (favorites disappear on logout).

---

## What's New

- **New DB table + migration?** Maybe — depends on your persistence choice.
- **New service?** Maybe — if you go with DB persistence.
- **New routes?** Maybe — if you go with backend endpoints.
- **New page or UI?** Yes — users need a way to see and manage favorites.
- **Touches admin area?** No.

---

## Prototype Reference

Run the scaffold locally:
```
http://localhost:5173/rooms
```

The Rooms page currently shows a list of rooms with name, capacity, and price. There is no "Save" button, no favorites view, and no way to mark a room as liked.

---

## Interaction Model

- **Interaction pattern:** Toggle-state button (save / unsave) + read-only list (browse favorites).
- **State location:** Your choice — database (persistent, shared) or browser (ephemeral, local only).
- **Sync vs async:** Add/remove favorite — synchronous or queued, your call.
- **Conversation memory:** Not applicable.

---

## Open Questions

These are intentionally left open. You will need to resolve them with your team (or an agent) before implementing.

- Should favorites persist after logout (database), or only within the session (localStorage)?
- If database-persisted: Should the favorite count show on room cards? Should there be a "most favorited" sorting option?
- If session-persisted: How should you handle the case where a user logs in — should session favorites merge with their DB favorites, or replace them?
- Should the favorites view be a separate page (`/favorites`) or a filter tab on the existing `/rooms` page?
- If a room is deleted by an admin, what happens to users who favorited it (remove silently, or show as archived)?
- Can users sort or filter their favorites (by price, capacity, date saved)?

---

## Excluded Features

- **Sharing favorites with other users** — out of scope.
- **Favorites recommendations** — not in scope for v1.
- **Export favorites** — out of scope.
- **Favorite collections / lists** — users can only have one global favorites list, not multiple.
- **Notes on favorites** — users cannot attach custom notes to individual favorites.

---

## Success Metric

A user can save a room from the `/rooms` page, see it marked as saved, navigate to their favorites view, and remove it. The saved status persists (either in DB or session, depending on your design choice). The `e2e/exercises/08-room-favorites.spec.ts` Playwright test passes on the participant's branch without modification.
