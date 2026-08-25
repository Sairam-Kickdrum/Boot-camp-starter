> **Reading order:** 01-feature-brief.md → this document.

# Scoping Doc: Room Reviews & Ratings

**Feature:** BOOTCAMP-6
**Tier:** Advanced (AI-SDLC Mode 2)
**Date:** 2026-06-19

---

## Feature Overview

Users who have completed a confirmed stay can leave a star rating (1–5) and a short text comment on the room they booked. All users (logged in or not) can see reviews and the average rating on rooms. Admins can remove reviews that violate community guidelines.

---

## Split Rationale

Split by capability and dependency boundary. The skeleton delivers the shared DB schema and types that all three capability tickets depend on. Each capability ticket owns a specific feature:

- **BOOTCAMP-6-1 (User Review Form):** The submission endpoint, eligibility validation, and the backend infrastructure that powers review creation.
- **BOOTCAMP-6-2 (Room Ratings):** The display of average ratings on room cards and the room detail page, plus the review list UI and submit form for eligible users.
- **BOOTCAMP-6-3 (Admin Moderation):** The soft-remove capability and admin reviews management tab, independent of the user-facing features.

All three capability tickets depend only on the skeleton. None depends on any other.

---

## Dependency Chain

```
BOOTCAMP-6 (Foundation Skeleton — reviews table, migration, shared types)
  → BOOTCAMP-6-1 (User Review Form)      [fully parallel with 6-2 and 6-3]
  → BOOTCAMP-6-2 (Room Ratings)          [fully parallel with 6-1 and 6-3]
  → BOOTCAMP-6-3 (Admin Moderation)      [fully parallel with 6-1 and 6-2]
```

---

## Ticket BOOTCAMP-6: Room Reviews & Ratings (Foundation Skeleton)

**Type:** Feature Parent + Skeleton
**Branch:** `participant/<your-name>/06-room-reviews`
**PR targets:** `solutions/06-room-reviews`
**Sub-tickets:** BOOTCAMP-6-1, BOOTCAMP-6-2, BOOTCAMP-6-3
**Run first:** `/implement BOOTCAMP-6`

**Summary:** Add a review and rating system to the room booking application. Users who have completed a confirmed stay can submit a star rating and comment. Reviews are publicly visible and contribute to a room's average rating. Admins can remove reviews that violate guidelines.

**Context:** This exercise introduces a new cross-resource relationship — a review links a `user`, a `room`, and a `booking` — and the eligibility business rule (only completable stays can be reviewed). The moderation sub-ticket re-uses the admin area from Exercise 03.

### Foundation Skeleton Scope

The skeleton ticket delivers the shared DB schema that all three capability sub-tickets depend on. No service logic, no API endpoint, no UI — just the table definition, migration, and shared type export.

| What | Where |
|---|---|
| `reviews` table definition | `db/schema/index.ts` |
| Drizzle migration | `db/migrations/` (generated) |
| `ReviewSchema` and `CreateReviewSchema` Zod exports | `packages/shared-types/src/review-schemas.ts` (new) |

**Table columns (minimum):**
- `id` uuid PK
- `booking_id` uuid FK → `bookings.id` (links review to the stay it was written about)
- `user_id` uuid FK → `users.id`
- `room_id` uuid FK → `rooms.id`
- `rating` smallint not-null (1–5)
- `comment` text
- `is_removed` boolean not-null default false (soft-delete for admin moderation)
- `created_at` timestamptz default now

### Acceptance Criteria (Skeleton)

- [ ] AC-S1: Review data can be created and stored in the system
- [ ] AC-S2: Review data can be imported and used across the application
- [ ] AC-S3: App compiles and starts cleanly; no regressions on existing features
- [ ] AC-S4: PR opened into `solutions/06-room-reviews`

### After the skeleton PR merges

Create BOOTCAMP-6-1 from the skeleton branch. BOOTCAMP-6-2 and BOOTCAMP-6-3 are unblocked after 6-1 merges.

### Reference Documents

- [01-feature-brief.md](./01-feature-brief.md) — High-level feature context and user stories
- [03-architecture-plan.md](./03-architecture-plan.md) — Technical architecture, API contract, and data model

---

## Ticket BOOTCAMP-6-1: User Review Form

**Type:** Capability
**Depends on:** BOOTCAMP-6 skeleton (`reviews` table migrated, schemas exported from shared-types)
**Parallel with:** BOOTCAMP-6-2, BOOTCAMP-6-3 (all three run concurrently after skeleton merges)
**Estimate:** 1.5–2 days

### Summary

Implement `ReviewRepository` and `ReviewService` with the review submission endpoint and fetch logic. The service enforces the eligibility rule (only confirmed, past-checkout bookings can be reviewed) and implements the uniqueness constraint on reviews.

### Context — Where This Lives

**New routes file:** `apps/api/src/routes/reviews.ts` — `POST /reviews` (submit) and `GET /rooms/:id/reviews` (fetch list)
**New service:** `apps/api/src/services/review-service.ts`
**New repository:** `apps/api/src/repositories/review-repository.ts`

### What the User Can Do

1. A logged-in user with an eligible booking calls `POST /reviews` with `{ bookingId, rating, comment }`.
2. The system validates eligibility: the booking must belong to the caller, must be `confirmed`, and `check_out` must be in the past.
3. The review is persisted (subject to uniqueness constraint — see open questions).
4. Any user calls `GET /rooms/:id/reviews` to fetch the review list for a room (excludes removed reviews).

### Open Questions

These design decisions shape the service implementation and must be resolved before coding begins:

- **One review per booking or one per room ever?** If per-booking, a user can review the same room multiple times (across different stays). If per-room, a user can only review a room once ever. This affects the uniqueness constraint: `UNIQUE(booking_id)` vs `UNIQUE(room_id, user_id)`.
- **Can users edit or delete their own reviews after submitting?** If yes, `POST /reviews` may be idempotent and there should be `PATCH /reviews/:id` and `DELETE /reviews/:id` endpoints (only the reviewer can call them). If no, reviews are immutable once submitted.

### Acceptance Criteria

- [ ] AC-1: Users can submit a review (1–5 stars + comment) for a confirmed booking they completed (past check-out date).
- [ ] AC-2: The system enforces the uniqueness constraint per the design decision (one review per booking or one per room per user).
- [ ] AC-3: Users cannot submit a review for someone else's booking.
- [ ] AC-4: Users cannot submit a review for a booking that is not confirmed or has not yet checked out.
- [ ] AC-5: Reviews can be fetched for any room, sorted by most recent first, excluding removed reviews.
- [ ] AC-6: Star rating must be a valid value (1–5); invalid ratings are rejected.
- [ ] AC-7: Unit tests cover happy path, uniqueness guard, ineligibility checks (status, check-out date, ownership), and invalid ratings.
- [ ] AC-8: If user-edit capability is decided in this ticket, Playwright test covers submit and edit/delete flow.

### Existing System Behavior

- `bookings` table has `status`, `check_out`, `user_id`, `room_id` — use these for eligibility.
- `GET /rooms/:id` in `apps/api/src/routes/rooms.ts` — extend this response shape; do not break existing fields.
- `requireAuth` preHandler — use on `POST /reviews`; `GET /rooms/:id/reviews` can be public.
- `ConflictError` (409) — use for duplicate review and ineligible booking, matching the pattern in `BookingService.bookRoom()`.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| Submit review (one per booking) | Edit or delete own review |
| Fetch room reviews (public) | Review voting / helpfulness |
| Average rating on room responses | Stored `avg_rating` column on rooms table |
| Eligibility check (confirmed + past check-out) | Review photos or attachments |
| Unit tests for service layer | Admin moderation (BOOTCAMP-6-3) |

### Reference Documents

- [01-feature-brief.md](./01-feature-brief.md) — Feature context and user stories
- [03-architecture-plan.md](./03-architecture-plan.md) — API contract for `POST /reviews` and `GET /rooms/:id/reviews`

---

## Ticket BOOTCAMP-6-2: Room Ratings

**Type:** Capability
**Depends on:** BOOTCAMP-6-1 (reviews API must exist)
**Parallel with:** BOOTCAMP-6-1, BOOTCAMP-6-3 (all three run concurrently after skeleton merges)
**Estimate:** 1–1.5 days

### Summary

Display average room ratings on the rooms listing (`/rooms`) and on a new room detail page at `/rooms/:id`. The detail page also shows the review list and a submit form for eligible users.

### Context — Where This Lives

**New page:** `apps/web/src/routes/RoomDetailPage.tsx` at `/rooms/:id`
**Extends:** `apps/web/src/routes/RoomsPage.tsx` — room cards gain a star rating display and a "View room" link
**Extends:** `apps/api/src/routes/rooms.ts` — `GET /rooms` and `GET /rooms/:id` responses include `averageRating`

### What the User Can Do

1. On `/rooms`, each room card displays the average star rating (or "No reviews yet").
2. Any user clicks "View room" on a room card → navigates to `/rooms/:id`.
3. The detail page shows room info, average rating (stars), and the list of reviews sorted newest first.
4. If the logged-in user has an eligible unreviewed booking for this room, a submit form appears: star selector (1–5) + comment textarea + Submit button.
5. Submitting calls `POST /reviews`, then refreshes the review list in-place.
6. If the user has no eligible booking (not logged in or no completed stay yet), the form is not shown (no error — just absent).

### Open Questions

- **Store average rating as a column on `rooms` or compute live from the `reviews` table?** Live computation (aggregation query) is simpler for v1; stored column is more performant at scale. This decision affects: (1) whether `rooms` schema is modified in the backend, (2) whether the service recalculates on each review creation/deletion, and (3) API response shape.

### Acceptance Criteria

- [ ] AC-1: Room cards display the average star rating (or "No reviews yet" if no reviews exist).
- [ ] AC-2: Users can click through to a room detail page.
- [ ] AC-3: Room detail page displays room information and average rating.
- [ ] AC-4: Review list shows reviewer name, star rating, comment, and submission date; reviews are sorted by most recent first.
- [ ] AC-5: A review submit form is shown only to users with an eligible unreviewed booking for that room.
- [ ] AC-6: Submitting a review updates the list and average rating in-place without requiring a page reload.
- [ ] AC-7: Form validation prevents submission without selecting a rating.
- [ ] AC-8: Playwright test covers: viewing room detail, seeing reviews, submitting a review (eligible user), and verifying ineligible users cannot submit.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| Room detail page at `/rooms/:id` | Editing or deleting own review |
| Average rating display on room cards | Pagination of reviews |
| Review submit form (eligible users only) | Real-time review updates |
| Star rating component (1–5) | Photo attachments |

### Reference Documents

- [01-feature-brief.md](./01-feature-brief.md) — Feature context and user stories
- [03-architecture-plan.md](./03-architecture-plan.md) — API contract for `GET /rooms` and `GET /rooms/:id` response shape (avgRating field)

---

## Ticket BOOTCAMP-6-3: Admin Moderation

**Type:** Capability
**Depends on:** BOOTCAMP-6-1 (reviews API must exist)
**Parallel with:** BOOTCAMP-6-1, BOOTCAMP-6-2 (all three run concurrently after skeleton merges)
**Estimate:** 0.5–1 day

### Summary

Extend the admin area (Exercise 03) with a Reviews tab. Admins can see all reviews and remove ones that violate guidelines using the soft-delete mechanism (`is_removed = true`). Removed reviews are hidden from public-facing pages.

### Context — Where This Lives

**Extends:** `apps/web/src/routes/AdminPage.tsx` — new "Reviews" tab
**New endpoints:** `GET /admin/reviews` (all reviews, including removed) and `DELETE /admin/reviews/:id` (soft-remove)

### What the Admin Can Do

1. Admin navigates to `/admin` and clicks the "Reviews" tab.
2. The tab shows all reviews in the system (including removed ones, which are visually distinguished).
3. Admin clicks "Remove" on a review → confirmation prompt → `DELETE /admin/reviews/:id` → review is marked `is_removed = true`.
4. Removed reviews no longer appear on `/rooms/:id` or in average rating calculations; they are hidden from all public-facing views.
5. Admins still see removed reviews in the admin Reviews tab with a visual indicator (e.g. strikethrough, greyed out, or flagged).

### Open Questions

- **What does admin moderation look like — soft-delete only, or a workflow to approve/reject reviews?** The current design uses soft-delete (`is_removed = true`, reversible, hidden from public). An alternative is a "flagged" state where reviews wait for admin approval before being published. This ticket assumes soft-delete; if a workflow is preferred, the endpoint and UI design will differ significantly.

### Acceptance Criteria

- [ ] AC-1: Admins can view all reviews in the system, including those that have been removed.
- [ ] AC-2: Only admins can access the reviews moderation interface; non-admins receive a 403 error.
- [ ] AC-3: Admins can remove a review; the system requires confirmation before removal.
- [ ] AC-4: Removed reviews are no longer visible to public users (on room detail pages or in average rating calculations).
- [ ] AC-5: Removed reviews are visually distinguished in the admin interface (e.g. greyed out, strikethrough, or flagged).
- [ ] AC-6: After removal, the admin interface updates in-place without requiring a page reload.
- [ ] AC-7: Unit tests cover removal and 404 scenarios.
- [ ] AC-8: Playwright test covers admin removal flow and verifies removed review is hidden from public room pages.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| Soft-remove a review (`is_removed = true`) | Permanently delete a review |
| Admin reviews list with removed indicator | Restore a removed review |
| Removed reviews excluded from public views | Notify user their review was removed |
| | Approval workflow for flagged reviews |

### Reference Documents

- [01-feature-brief.md](./01-feature-brief.md) — Feature context and user stories
- [03-architecture-plan.md](./03-architecture-plan.md) — API contract for `GET /admin/reviews` and `DELETE /admin/reviews/:id`

---

## Parallel Sessions (Exercise 06)

Once the BOOTCAMP-6 skeleton PR is created, all three capability sub-tickets (6-1, 6-2, 6-3) are fully independent. **Git worktrees are required** — running multiple sessions from the same checkout causes git conflicts when Claude agents commit to the same working tree simultaneously.

### Worktrees are created automatically

The `/implement BOOTCAMP-6` workflow creates all three capability branches and worktrees automatically after the skeleton PR is pushed. At the end of the skeleton run you will see output like:

```
✅ Worktrees ready for parallel sub-tickets:

  BOOTCAMP-6-1 → ../bootcamp-06-1-user-review-form
  BOOTCAMP-6-2 → ../bootcamp-06-2-room-ratings
  BOOTCAMP-6-3 → ../bootcamp-06-3-admin-moderation

Open each sub-ticket in Claude Code using either method:
...
```

### Open each sub-ticket in Claude Code using either method

**Option A — Claude Code (recommended):**
```bash
claude --worktree participant/<your-name>/06-1-user-review-form
claude --worktree participant/<your-name>/06-2-room-ratings
claude --worktree participant/<your-name>/06-3-admin-moderation
```
Claude Code opens automatically in each worktree. In each session, run `/implement BOOTCAMP-6-1`, `/implement BOOTCAMP-6-2`, and `/implement BOOTCAMP-6-3`.

**Option B — terminal:**
Open three terminals and `cd` into each directory:
```bash
cd ../bootcamp-06-1-user-review-form && /implement BOOTCAMP-6-1
cd ../bootcamp-06-2-room-ratings && /implement BOOTCAMP-6-2
cd ../bootcamp-06-3-admin-moderation && /implement BOOTCAMP-6-3
```

All three sessions implement their respective capabilities concurrently. Each reads the schema and shared types from the skeleton, implements its own endpoints and UI, and creates its own PR targeting `participant/<your-name>/06-room-reviews`.

> Each Claude session needs its own terminal, its own worktree directory, and its own context window. Do not run multiple tickets from the same directory or the same session.

For more details on worktrees, see [`docs/boot-camp/git-worktrees.md`](../../git-worktrees.md).
