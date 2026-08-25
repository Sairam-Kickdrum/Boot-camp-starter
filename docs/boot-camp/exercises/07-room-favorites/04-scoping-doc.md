> **Reading order:** 01-feature-brief.md → this document.

# Scoping Doc: Room Favorites

**Feature:** BOOTCAMP-7
**Tier:** Medium (AI-SDLC Mode 1)
**Date:** 2026-06-22

---

## Feature Overview

Authenticated users can save (favorite) rooms they like and access a curated list of saved rooms. All users see the save button, but only logged-in users can save. Saved rooms are persisted and displayed distinctly on the rooms list and in a dedicated favorites view.

---

## Single-Ticket Scope

This feature is implemented as a single ticket — no subtickets. The entire feature (backend, frontend, DB if needed, tests) is the scope of **BOOTCAMP-7**.

---

## Ticket BOOTCAMP-7: Room Favorites

**Type:** Feature
**Estimate:** 1.5–2 days

### Summary

Add a "Save for Later" capability that lets users bookmark rooms. The system persists favorites, shows them distinctly on the rooms list, and provides a dedicated view to browse and manage the collection.

### Context — Where This Lives

**Frontend changes:**
- `apps/web/src/routes/RoomsPage.tsx` — Add "Save" / "Saved" button/icon to each room card
- `apps/web/src/routes/FavoritesPage.tsx` (new) — Dedicated page to browse and manage favorites
- `apps/web/src/routes/AppRouter.tsx` — Add route for `/favorites`
- `apps/web/src/api/` — API client method to add/remove favorites (if backend-persisted)

**Backend changes (if database-persisted):**
- `apps/api/src/routes/favorites.ts` (new) — `POST /favorites` (add), `DELETE /favorites/:roomId` (remove), `GET /favorites` (list)
- `apps/api/src/services/favorite-service.ts` (new) — Business logic for add/remove/list
- `apps/api/src/repositories/favorite-repository.ts` (new) — Drizzle queries
- `db/schema/index.ts` — Add `user_favorites` table definition
- `db/migrations/` — Migration for the new table

**Frontend state (if session-persisted):**
- Use `localStorage` or React context to track favorites
- Load on app start if using localStorage

**Shared types:**
- `packages/shared-types/src/favorite-schemas.ts` (new) — Zod schemas if backend-persisted

### What the User Can Do

1. On `/rooms`, a user sees each room card with a "Save" button / outline heart icon.
2. Clicking "Save" adds the room to favorites (persists based on choice: DB or localStorage).
3. The button updates immediately to "Saved" / filled heart.
4. User can navigate to `/favorites` to see all saved rooms.
5. On `/favorites`, the user can click "Remove" or click the filled heart to unsave a room.
6. Unsaving updates the list in-place without requiring a page reload.

### Open Questions

These design decisions must be resolved before coding:

- **Database or localStorage persistence?** Database persistence is shared across devices and survives logout. localStorage is private to the browser and is lost on logout. This affects which code path to implement (backend endpoints vs client-side state).
- **Favorites view location?** Separate page (`/favorites`) or a filter tab on the existing `/rooms` page?
- **If database-persisted: Should the favorite count show on room cards?** If yes, the rooms response must include count per room (aggregation query or denormalized column).
- **If database-persisted: Should removed/deleted rooms be handled gracefully?** If a favorited room is deleted by an admin, should it silently disappear from the user's favorites, or show as archived?

### Acceptance Criteria

- [ ] AC-1: Users can save a room by clicking a button/icon on the room card.
- [ ] AC-2: Saved rooms are persisted according to the chosen design (DB or localStorage).
- [ ] AC-3: The save button updates immediately to reflect saved state (visual feedback).
- [ ] AC-4: Users can navigate to the favorites view and see all saved rooms.
- [ ] AC-5: Users can unsave a room from the favorites view; the list updates in-place.
- [ ] AC-6: Only authenticated users can save; logged-out users see the button but it is disabled or shows a login prompt.
- [ ] AC-7: Unsaved rooms still appear on `/rooms` (favorites is a view, not a filter that removes from main list).
- [ ] AC-8: If database-persisted: Saved state is consistent across page reloads.
- [ ] AC-9: Unit or integration tests cover save, unsave, and list operations.
- [ ] AC-10: Playwright test covers: saving a room, navigating to favorites, seeing the saved room, unsaving it.

### Existing System Behavior

- `RoomsPage.tsx` at `/rooms` — extends this to add save button.
- `GET /rooms` endpoint — extend response to include `isFavoritedByMe` (if backend-persisted).
- `requireAuth` preHandler — use on any backend favorite endpoints.
- Room cards use a standard layout — preserve existing fields (name, capacity, price).

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| Save/unsave a room | Favorite collections or lists |
| Favorites view (list + remove) | Notes on favorites |
| Persistent state (DB or session) | Sharing favorites with others |
| Visual indicator (filled/outline heart) | Favorite count sorting |
| Disabled button for logged-out users | Favorite recommendations |

### Contingency: Path A (Database Persistence) vs Path B (localStorage)

**Path A (Database) — Recommended for learning:**
- Add `user_favorites` table (user_id, room_id, created_at).
- Endpoints: `POST /favorites`, `DELETE /favorites/:roomId`, `GET /favorites`.
- `GET /rooms` extended with `isFavoritedByMe` per room.
- Allows sharing across devices; persists after logout.
- Complexity: ~2 days.

**Path B (localStorage) — Simpler, session-only:**
- No backend changes.
- localStorage key: `favorites` → JSON array of room IDs.
- On app load, hydrate from localStorage into React context or state hook.
- Favorites lost on logout (if you clear localStorage on auth state change).
- Complexity: ~1 day.

**Recommendation:** Choose Path A (database) for a more complete learning experience and real-world scenario.

---

### Reference Documents

- [01-feature-brief.md](./01-feature-brief.md) — High-level feature context and user stories

---

## After Implementation

When this PR merges to `solutions/07-room-favorites`:
- The scaffold gains the favorites feature.
- Future exercises can reference this as a model for user-specific state management.
- Consider: Could favoriting be re-used for other resources (wishlist for future trips, etc.)?
