> **Reading order:** 01-feature-brief.md → 03-architecture-plan.md → this document.

# Scoping Doc: Admin Pages

**Feature:** BOOTCAMP-3
**Tier:** Standard (AI-SDLC Mode — Mode 2)
**Architecture Plan:** `docs/boot-camp/exercises/03-admin-pages/03-architecture-plan.md`
**Date:** 2026-06-04

---

## Feature Overview

An admin dashboard at `/admin` with three tabs — Rooms, Bookings, Users. Admins can manage rooms (create, edit, delete), view all bookings across all users with user email and room name, and manage user roles (view all users, toggle role between `user` and `admin`). All `/admin/*` API routes require `role = 'admin'`; non-admin users see no admin UI and receive 403 from the API.

---

## Split Rationale

The feature is split into a Foundation Skeleton followed by three fully parallel capability tickets. The skeleton (BOOTCAMP-3) establishes the admin shell, RBAC wiring, and tab structure — shared infrastructure that all three capability tickets inherit. Because the skeleton delivers the complete shared foundation, BOOTCAMP-3-1, 3-2, and 3-3 have no dependency on each other and can be implemented concurrently once the skeleton PR merges.

---

## Dependency Chain

```
BOOTCAMP-3 (Foundation Skeleton — admin shell, RBAC, tab structure)
  → BOOTCAMP-3-1 (Rooms Tab — CRUD)         [fully parallel with 3-2 and 3-3]
  → BOOTCAMP-3-2 (Bookings Tab — overview)  [fully parallel with 3-1 and 3-3]
  → BOOTCAMP-3-3 (Users Tab — management)   [fully parallel with 3-1 and 3-2]
```

All three capability tickets depend only on the skeleton. None depends on any other.

---

## Ticket BOOTCAMP-3: Admin Pages (Foundation Skeleton + Feature Parent)

**Type:** Feature Parent + Skeleton
**Branch:** `participant/<your-name>/03-admin-pages`
**PR targets:** `solutions/03-admin-pages`
**Run first:** `/implement BOOTCAMP-3`
**Sub-tickets:** BOOTCAMP-3-1, BOOTCAMP-3-2, BOOTCAMP-3-3

**Summary:** Admin dashboard for platform management — rooms, bookings, and users.

**Context:** The `/admin` section of the room-booking app. Admins need to create and manage rooms, see all bookings platform-wide, and manage user roles. There is no admin interface today; all these capabilities are new. RBAC infrastructure (`requireRole`) is already scaffolded — the work is in building the routes, services, and UI that use it.

### Foundation Skeleton Scope

The skeleton ticket delivers the shared infrastructure that all three capability sub-tickets build on. It contains no tab-specific content — only the shell, guards, and RBAC wiring that every capability ticket inherits.

| What | Where |
|---|---|
| `adminRoutes` Fastify plugin registered at `/admin` in `index.ts` | `apps/api/src/index.ts` |
| `requireRole('admin')` preHandler on all `/admin/*` handlers | `apps/api/src/routes/admin.ts` |
| `AdminPage.tsx` — tabbed shell with Rooms, Bookings, Users tabs (placeholder content in each) | `apps/web/src/routes/AdminPage.tsx` |
| `AdminRoute` guard — redirects non-admin users to `/rooms` | `apps/web/src/App.tsx` |
| Conditional Admin nav link — visible only when `user.role === 'admin'` | `apps/web/src/components/Nav.tsx` |

### Acceptance Criteria (Skeleton)

- [ ] AC-S1: `adminRoutes` plugin is registered in `apps/api/src/index.ts` at prefix `/admin`; all handlers use `preHandler: [app.requireAuth, app.requireRole('admin')]`
- [ ] AC-S2: `AdminPage.tsx` renders three tabs (Rooms, Bookings, Users); navigating to `/admin` as an admin shows the tabbed shell with placeholder content in each tab
- [ ] AC-S3: `AdminRoute` guard in `App.tsx` redirects a non-admin user who navigates directly to `/admin` to `/rooms`
- [ ] AC-S4: The Admin nav link is visible in `Nav.tsx` only when `user.role === 'admin'`; non-admin users do not see it
- [ ] AC-S5: App compiles and starts cleanly; no regressions on existing routes and tests
- [ ] AC-S6: PR opened into `solutions/03-admin-pages`

### After the skeleton PR merges

The `/implement BOOTCAMP-3` workflow automatically creates three capability branches and worktree directories after the skeleton PR is pushed. All three sub-tickets are now fully parallel — see the Parallel Sessions section below.

### Parallel Sessions (Exercise 03)

Once the BOOTCAMP-3 skeleton PR is created, all three capability sub-tickets (3-1, 3-2, 3-3) are fully independent. **Git worktrees are required** — running multiple sessions from the same checkout causes git conflicts when Claude agents commit to the same working tree simultaneously.

**Worktrees are created automatically:** The `/implement BOOTCAMP-3` workflow creates all three capability branches and worktrees automatically after the skeleton PR is pushed.

**Open three terminals — one per worktree:**
1. Terminal 1: `cd ../bootcamp-03-1-admin-room-management` → `/implement BOOTCAMP-3-1`
2. Terminal 2: `cd ../bootcamp-03-2-admin-bookings-overview` → `/implement BOOTCAMP-3-2`
3. Terminal 3: `cd ../bootcamp-03-3-admin-user-management` → `/implement BOOTCAMP-3-3`

All three sessions implement their respective tabs concurrently. Each reads the admin shell and RBAC wiring from the skeleton, implements its own tab content, and creates its own PR targeting `participant/<your-name>/03-admin-pages`.

> Each Claude session needs its own terminal, its own worktree directory, and its own context window. Do not run multiple tickets from the same directory or the same session.

### Reference Documents

- [01-feature-brief.md](./01-feature-brief.md) — High-level feature context and user stories
- [03-architecture-plan.md](./03-architecture-plan.md) — Admin dashboard structure and tab design

---

## Ticket BOOTCAMP-3-1: Admin — Room Management

**Type:** Capability
**Depends on:** BOOTCAMP-3 skeleton (admin shell, `adminRoutes` plugin, `requireRole` wiring, and `AdminPage.tsx` tab structure must exist)
**Parallel with:** BOOTCAMP-3-2, BOOTCAMP-3-3 (all three run concurrently after skeleton merges)

### Summary

Implement full room CRUD in the Rooms tab of the admin dashboard. The skeleton (BOOTCAMP-3) has already registered `adminRoutes`, wired RBAC, and created `AdminPage.tsx` with placeholder tab content. This ticket fills in the Rooms tab — create, edit, and delete rooms — by adding write methods to `RoomService` and `RoomRepository` and building the Rooms tab UI.

### Context — Where This Lives

**`/admin` → Rooms tab** (extends `apps/web/src/routes/AdminPage.tsx`).

The admin page shell, `adminRoutes` plugin, `AdminRoute` guard, and nav link all exist from BOOTCAMP-3. This ticket adds three handlers (`POST /admin/rooms`, `PATCH /admin/rooms/:id`, `DELETE /admin/rooms/:id`) to the existing plugin and replaces the Rooms tab placeholder with the full CRUD UI.

**API:** Three new handlers in the existing `apps/api/src/routes/admin.ts` plugin, each delegating to extended methods on `RoomService` → `RoomRepository`.

### What the User Can Do

**Rooms tab — creating a room:**
1. Admin clicks **Create Room**. A form appears with fields: name (required), description (optional), price per night in cents (required, positive integer), capacity (required, positive integer), image URL (optional).
2. Admin fills in the form and submits. The new room appears immediately in the Rooms tab list and on the public `/rooms` page.

**Rooms tab — editing a room:**
3. Admin clicks **Edit** next to an existing room. A form pre-filled with the room's current data appears.
4. Admin changes one or more fields and submits. Updated data appears immediately in the list.

**Rooms tab — deleting a room:**
5. Admin clicks **Delete** next to a room. A confirmation prompt appears.
6. Admin confirms. The room is removed from the Rooms tab list and from `/rooms`.

**Error paths:**
- Non-admin request to any `/admin/*` API route: 403 (enforced by skeleton).
- Create or edit form submitted with missing required field or invalid value: 400 with inline error.
- Edit or delete a room that no longer exists: 404.

### Acceptance Criteria

- [ ] AC-1: Admin can create a room with name, description, price per night, and capacity; the room appears in the Rooms tab list and the public `/rooms` listing immediately.
- [ ] AC-2: Admin can edit an existing room's name, description, price per night, and capacity; changes are reflected immediately in the list.
- [ ] AC-3: Admin can delete a room; it is removed from the Rooms tab list and the public `/rooms` listing.
- [ ] AC-4: `POST /admin/rooms` returns 201; `PATCH /admin/rooms/:id` returns 200; `DELETE /admin/rooms/:id` returns 204; all return 403 for non-admins (enforced by skeleton RBAC wiring).
- [ ] AC-5: Unit tests cover `RoomService.createRoom`, `RoomService.updateRoom`, `RoomService.deleteRoom` — happy paths and not-found cases.
- [ ] AC-6: Playwright test in `e2e/exercises/03-admin-pages.spec.ts` covers admin room create flow end-to-end.

### Existing System Behavior

Before this ticket (skeleton already provides):
- `adminRoutes` plugin registered at `/admin` with `requireRole('admin')` on all handlers
- `AdminPage.tsx` shell with Rooms tab showing placeholder content
- `AdminRoute` guard, nav link, `requireAuth`/`requireRole` decorators

Still missing after skeleton:
- `RoomService` has `listAvailable()` and `getById()` only — no write methods
- `RoomRepository` has `listAvailable()` and `findById()` only — no write methods
- Rooms tab contains placeholder content only

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| Rooms tab — create, edit, delete rooms | Admin shell (delivered by skeleton) |
| `RoomService` + `RoomRepository` write methods | `AdminRoute` guard or nav link (delivered by skeleton) |
| `CreateRoomRequest` and `UpdateRoomRequest` shared types | Bookings tab functionality (BOOTCAMP-3-2) |
| Unit tests for RoomService write methods | Users tab functionality (BOOTCAMP-3-3) |
| Playwright test for admin create flow | S3 image upload for `imageUrl` |
| | Soft-delete (hard-delete is acceptable) |
| | Pagination of the room list |
| | Audit log entries on room mutations (Exercise 04) |

### Design Reference

- **`requireRole` preHandler** — already wired on all `adminRoutes` handlers by the skeleton; new handlers follow the same `preHandler: [app.requireAuth, app.requireRole('admin')]` pattern.
- **Three-layer pattern** — route handles HTTP only; service holds business rules; repository writes to DB. See `apps/api/src/routes/bookings.ts` → `BookingService` → `BookingRepository` for the full pattern.
- **`NotFoundError` in repository** — `apps/api/src/repositories/room-repository.ts` line 35. `findById` throws `NotFoundError` if no row is returned. `RoomRepository.update()` and `RoomRepository.delete()` should call `findById` first and let the error propagate naturally.
- **`RoomSchema` reuse** — `packages/shared-types/src/room-schemas.ts` line 3. Admin room CRUD endpoints respond with the existing `Room` type — no new room response schema is needed.
- **`toRoom` mapper** — `apps/api/src/routes/rooms.ts` line 29. Extract or reuse this mapper in `adminRoutes` for POST and PATCH room responses.

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/03-admin-pages/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/03-admin-pages/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Ticket BOOTCAMP-3-2: Admin — Bookings Overview

**Type:** Capability
**Depends on:** BOOTCAMP-3 skeleton (admin shell, `AdminPage.tsx`, `adminRoutes` plugin, and `requireRole` wiring must exist)
**Parallel with:** BOOTCAMP-3-1, BOOTCAMP-3-3 (all three run concurrently after skeleton merges)

### Summary

Implement the Bookings tab in the admin dashboard. The tab shows every booking across all users with user email, room name, check-in date, check-out date, status, and creation date — sorted by most recent first. Backed by a new `AdminService` and `AdminRepository` that perform a joined query across the `bookings`, `users`, and `rooms` tables.

### Context — Where This Lives

**`/admin` — Admin Dashboard, Bookings tab** (extends `apps/web/src/routes/AdminPage.tsx`).

The admin page shell and the `adminRoutes` plugin exist from BOOTCAMP-3-1. This ticket adds one handler (`GET /admin/bookings`) to the existing plugin and fills in the Bookings tab component in `AdminPage.tsx`.

**API:** One new handler in `apps/api/src/routes/admin.ts`. It delegates to `AdminService.listAllBookings()` → `AdminRepository.findAllBookings()`.

### What the User Can Do

1. Admin navigates to `/admin` and clicks the **Bookings** tab.
2. Admin sees a table of all bookings in the system, across all users, with the following columns: booking ID (or a shortened version), user email, room name, check-in date, check-out date, status (confirmed / cancelled), and created date.
3. Bookings are sorted by most recent first (descending `createdAt`).
4. A non-admin user who navigates to `/admin` is redirected to `/rooms` by the `AdminRoute` guard (established in BOOTCAMP-3-1). A direct API call to `GET /admin/bookings` returns 403.

### Acceptance Criteria

- [ ] AC-1: `GET /admin/bookings` returns all bookings in the system — not just the authenticated user's bookings.
- [ ] AC-2: Each booking row includes user email and room name (joined data, not just IDs).
- [ ] AC-3: Bookings are sorted by `createdAt` descending (most recent first).
- [ ] AC-4: `GET /admin/bookings` requires `role = 'admin'`; returns 403 for non-admin authenticated users.
- [ ] AC-5: The Bookings tab renders the bookings table with all required columns.
- [ ] AC-6: Loading and empty states are handled in the UI (spinner while fetching; "No bookings yet" when the list is empty).
- [ ] AC-7: Unit test covers `AdminService.listAllBookings()` — happy path with multiple bookings from different users.
- [ ] AC-8: Playwright test in `e2e/exercises/03-admin-pages.spec.ts` verifies admin can see the bookings table and a non-admin receives 403 from the API.

### Existing System Behavior

Before this ticket:
- `GET /bookings` only returns the authenticated user's own bookings — `apps/api/src/routes/bookings.ts`. No endpoint returns all bookings.
- No admin endpoint for bookings exists.
- The Bookings tab exists in `AdminPage.tsx` (placeholder from BOOTCAMP-3-1) but contains no data.
- `AdminService` and `AdminRepository` do not exist yet — this ticket creates them.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| `GET /admin/bookings` — all bookings with joined user + room data | Admin cancellation or modification of bookings |
| `AdminService.listAllBookings()` | Filtering bookings by user, room, or status |
| `AdminRepository.findAllBookings()` — JOIN on users + rooms | Pagination of the bookings list |
| `AdminBookingRow` and `AdminBookingListResponse` shared types | Exporting bookings to CSV |
| Bookings tab UI with table | Editing booking dates from admin |
| Unit test for `listAllBookings` | Audit log for admin viewing bookings |
| Playwright test for bookings tab + 403 guard | Showing booking amounts or revenue totals |

### Design Reference

- **Pattern: existing bookings route** — `apps/api/src/routes/bookings.ts` line 12. The new admin bookings handler follows the same preHandler pattern but calls `AdminService` instead of `BookingService` and returns `AdminBookingRow[]` instead of the user-scoped `Booking[]`.
- **Pattern: `AdminService` → `AdminRepository`** — new three-layer chain. `AdminService` holds no business logic for this read; it delegates directly to `AdminRepository.findAllBookings()`.
- **Joined query** — `AdminRepository.findAllBookings()` uses a Drizzle `innerJoin` (or `leftJoin`) on `bookings → users` and `bookings → rooms`. Returns `userEmail` and `roomName` denormalized into the result row.
- **`AdminBookingRowSchema`** — defined in `packages/shared-types/src/admin-schemas.ts` (new file). Import and use as the route reply type.

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/03-admin-pages/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/03-admin-pages/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Ticket BOOTCAMP-3-3: Admin — User Management

**Type:** Capability
**Depends on:** BOOTCAMP-3 skeleton (admin shell, `AdminPage.tsx`, `adminRoutes` plugin, and `requireRole` wiring must exist)
**Parallel with:** BOOTCAMP-3-1, BOOTCAMP-3-2 (all three run concurrently after skeleton merges)

### Summary

Implement the Users tab in the admin dashboard. The tab shows all users (email, role, joined date) and lets the admin toggle any user's role between `user` and `admin`. A last-admin guard prevents removing the final admin from the platform. Backed by the same `AdminService` and `AdminRepository` introduced in BOOTCAMP-3-2 (or created here if worked in parallel).

### Context — Where This Lives

**`/admin` — Admin Dashboard, Users tab** (extends `apps/web/src/routes/AdminPage.tsx`).

The admin page shell and `adminRoutes` plugin exist from BOOTCAMP-3-1. This ticket adds two handlers (`GET /admin/users`, `PATCH /admin/users/:id`) to the existing plugin and fills in the Users tab component in `AdminPage.tsx`.

Because this ticket runs in parallel with BOOTCAMP-3-2 in separate worktrees, both tickets independently create `AdminService` and `AdminRepository`. Each worktree's implementation is self-contained — no coordination is needed during development. Any conflicts are resolved at PR merge time into the parent exercise branch.

### What the User Can Do

1. Admin navigates to `/admin` and clicks the **Users** tab.
2. Admin sees a table of all users with email, display name, current role, and joined date.
3. Each row has a role-change button. For a `role = 'user'` row, the button reads **Make Admin**. For a `role = 'admin'` row, the button reads **Remove Admin**.
4. Admin clicks **Make Admin** — the user's role changes to `admin`. The row updates in-place; the button label changes to **Remove Admin**.
5. Admin clicks **Remove Admin** — the user's role changes to `user`. The row updates in-place; the button label changes to **Make Admin**.
6. If the admin tries to remove the last remaining admin (including themselves), the action is rejected with a clear error message.
7. After a page refresh, the role change persists.

**Error paths:**
- Attempting to change role for a user that does not exist: 404.
- Attempting to remove the last admin: rejected (409 or 400, with message explaining the last-admin guard).
- Non-admin request to `GET /admin/users` or `PATCH /admin/users/:id`: 403.

### Acceptance Criteria

- [ ] AC-1: `GET /admin/users` returns all users with id, email, display name, role, and created date; requires `role = 'admin'`; returns 403 for non-admins.
- [ ] AC-2: `PATCH /admin/users/:id` with `{ role: "user" | "admin" }` updates the user's role and returns 200 with the updated `AdminUserRow`; requires `role = 'admin'`; returns 403 for non-admins.
- [ ] AC-3: `PATCH /admin/users/:id` returns 404 if the user does not exist.
- [ ] AC-4: The last-admin guard prevents demoting the final admin user — the API returns an error and the UI shows an inline message.
- [ ] AC-5: The Users tab renders a table of all users with email, display name, current role, and a role-change button per row.
- [ ] AC-6: After a successful role change, the user row updates in-place with the new role and updated button label (no full page reload required).
- [ ] AC-7: Unit tests cover `AdminService.updateUserRole()` — happy path, user not found, last-admin guard.
- [ ] AC-8: Playwright test in `e2e/exercises/03-admin-pages.spec.ts` verifies the role-change flow end-to-end and confirms non-admin receives 403 from the API.

### Existing System Behavior

Before this ticket:
- No endpoint exists to list all users. No endpoint exists to update a user's role.
- `roleEnum` has values `"user"` and `"admin"` — `db/schema/index.ts` line 14. No migration is needed.
- The Users tab exists in `AdminPage.tsx` (placeholder from BOOTCAMP-3-1) but contains no data or actions.
- `AdminService` and `AdminRepository` may exist (from BOOTCAMP-3-2 if done first) or may need to be created here.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| `GET /admin/users` — all users with role | Filtering or searching the user list |
| `PATCH /admin/users/:id` — change role to `user` or `admin` | User deactivation, suspension, or deletion |
| Users tab in `AdminPage.tsx` with role-toggle button | Bulk role changes |
| Last-admin guard in `AdminService.updateUserRole()` | Changing the currently authenticated admin's own role |
| In-place row update after successful role change | Email notification on role change (Exercise 05) |
| Unit tests for `AdminService.updateUserRole()` | Audit log entries on role change (Exercise 04) |
| Playwright test for role-change flow + non-admin 403 guard | Profile editing (display name, password reset) |
| `AdminUserRow` and `AdminUserListResponse` shared types | Pagination of the user list |

### Design Reference

- **Pattern: `requireRole` preHandler** — all existing handlers in `adminRoutes` already use `preHandler: [app.requireAuth, app.requireRole('admin')]`. New handlers in this ticket follow the same pattern.
- **Pattern: three-layer** — new handlers delegate to `AdminService.listAllUsers()` and `AdminService.updateUserRole()`, which delegate to `AdminRepository`. Follows the same structure as `listAllBookings()` from BOOTCAMP-3-2.
- **`NotFoundError` convention** — `apps/api/src/repositories/room-repository.ts` line 35. `AdminRepository.findUserById()` should throw `NotFoundError` if no user row is returned, matching the existing convention.
- **`roleEnum` values** — `db/schema/index.ts` line 14. `pgEnum("role", ["user", "admin"])`. The `PATCH /admin/users/:id` request body schema validates against `z.enum(["user", "admin"])`.
- **Last-admin guard** — `AdminService.updateUserRole()` should count current admins before demoting. If the count is 1 and the request would remove the last admin, throw a `ConflictError` or `ValidationError` with a clear message. `ConflictError` (409) is already available in `apps/api/src/errors/app-error.ts`.
- **`AdminUserRowSchema`** — defined in `packages/shared-types/src/admin-schemas.ts`. Import and use as the route reply type.

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/03-admin-pages/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/03-admin-pages/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Estimated Total Effort

| Ticket | Estimate | Notes |
|---|---|---|
| BOOTCAMP-3: Foundation Skeleton | 0.5–1 day | `adminRoutes` registration + `requireRole` wiring + `AdminPage.tsx` tab shell + `AdminRoute` guard + nav link |
| BOOTCAMP-3-1: Admin — Room Management | 1.5–2 days | 3 room CRUD routes + `RoomService`/`RoomRepository` write methods + Rooms tab UI + unit tests + Playwright |
| BOOTCAMP-3-2: Admin — Bookings Overview | 1–1.5 days | `AdminService` + `AdminRepository` + 1 API route + Bookings tab UI + unit test + Playwright |
| BOOTCAMP-3-3: Admin — User Management | 1–1.5 days | 2 API routes + `AdminService` methods + Users tab UI + last-admin guard + unit tests + Playwright |
| **Total** | **4–6 days** | Skeleton first; 3-1, 3-2, and 3-3 run in parallel (three worktrees) |

---

## Linear-Ready Trim Guidance

When creating Linear tickets from this scoping doc:

**Include in Linear:**
- Type, Depends on, Parallel with, Summary, Context, What the User Can Do, Acceptance Criteria, Scope Boundaries.

**Do NOT include in Linear** (stays in this doc and in the LLP):
- File paths (`apps/api/src/routes/admin.ts`, `apps/web/src/routes/AdminPage.tsx`, etc.)
- Column names (`roleEnum`, `pricePerNightCents`)
- Service and repository method names (`listAllBookings`, `updateUserRole`, `findAllUsers`)
- `data-testid` values
- Import patterns and code snippets
- Design Reference sections
