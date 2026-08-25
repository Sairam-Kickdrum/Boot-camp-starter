> **For participants:** This plan describes the target architecture. Your job is to implement it following the existing patterns in the codebase.

# Architecture Plan: Admin Pages

**Status:** Final
**Feature:** BOOTCAMP-3
**Tier:** Standard (AI-SDLC Mode — Mode 2)
**Author:** Boot Camp Facilitator
**Date:** 2026-06-04
**Parent feature branch:** `solutions/03-admin-pages` (reference); participants use `participant/<name>/03-admin-pages`

---

## Approach Summary

Add a protected `/admin` route and a new `adminRoutes` Fastify plugin. Room write operations (create, update, delete) extend the existing `RoomService` and `RoomRepository`. Admin-specific reads — all bookings with user/room detail, all users — go into a new `AdminService` backed by a new `AdminRepository`. Role mutation lives in `AdminService` as well. The frontend adds `AdminPage.tsx` with three tabs (Rooms, Bookings, Users), an `AdminRoute` guard component in `App.tsx`, and a conditional nav link. No new tables or migrations are required.

---

## Interaction Model

Multi-screen admin dashboard. An admin logs in, navigates to `/admin`, and interacts with three independent tabs:

- **Rooms tab** — room list with Create (opens a form), Edit (opens pre-filled form), and Delete (confirmation) actions.
- **Bookings tab** — read-only table of all bookings with user email, room name, dates, and status.
- **Users tab** — user list with role display and a role toggle per row.

Each write action is a single round-trip. There is no multi-step wizard and no async background work.

---

## Assumptions

| Assumption | What depends on it | Grounded in | If wrong, what changes |
|---|---|---|---|
| `requireRole('admin')` throws `ForbiddenError` when role does not match | Admin routes use `preHandler: [app.requireAuth, app.requireRole('admin')]` without additional guard logic | `apps/api/src/plugins/auth.ts` lines 82–88 | Check decoration name in auth plugin |
| `request.sessionUser` is always set when `requireAuth` has run | Admin route handlers access `request.sessionUser!` without extra null check | `apps/api/src/plugins/auth.ts` line 77 | Add null guard before `requireRole` call |
| `users.role` column exists with `roleEnum` values `"user"` and `"admin"` | `updateUserRole` writes a valid enum value with no migration | `db/schema/index.ts` line 14 | Add migration if enum is missing the `admin` value |
| `rooms` table has `id`, `name`, `description`, `pricePerNightCents`, `capacity`, `imageUrl` | `CreateRoomRequest` and `UpdateRoomRequest` schemas match column names | `db/schema/index.ts` lines 27–35 | Sync schema if columns differ |
| `NotFoundError` is the correct error when a room or user is not found | `RoomRepository.update/delete` and `AdminRepository.findUserById` throw it on missing records | `apps/api/src/repositories/room-repository.ts` line 35 | Confirm convention against existing `findById` pattern |
| `ForbiddenError` (403) is thrown by `requireRole` when role does not match | Regular users are blocked from all admin endpoints | `apps/api/src/plugins/auth.ts` line 86 | Confirmed; no change needed |
| No migration needed — all tables and columns already exist | No `db/migrations` changes in this exercise | `db/schema/index.ts` — users, rooms, bookings tables complete | Verify schema before starting if unsure |
| `CurrentUserResponse.role` is available from `useAuth()` in frontend | `Nav.tsx` can read `user.role` to conditionally render the Admin link without changing the auth context | `packages/shared-types/src/auth-schemas.ts` line 12; `apps/web/src/components/Nav.tsx` line 5 | Update auth context if shape changes |

All assumptions confirmed — see Codebase Grounding Report below.

---

## Alternatives Considered

**1. Put admin logic in existing room and booking route files**

Rejected. Mixing user-facing and admin-facing handlers in the same route file makes RBAC enforcement inconsistent — a missing `preHandler` on a single handler is a security gap. A dedicated `admin.ts` route file makes it trivial to audit: every handler in that file carries the same `[app.requireAuth, app.requireRole('admin')]` preHandler, with no exceptions. This also keeps the user-facing routes clean and avoids coupling their tests to admin behavior.

**2. Separate admin microservice**

Rejected. The scaffold is a monolith by design. Splitting admin into a separate service would require a second Fastify instance, a separate DB connection pool, and shared-type distribution overhead — none of which is pedagogically useful for this exercise. The three-layer pattern (route → service → repository) already provides adequate separation within the monolith.

---

## Services Affected

| Service / File | Change Type | Description |
|---|---|---|
| `apps/api/src/routes/admin.ts` | **New** | Admin route plugin; all `/admin/*` handlers use `[app.requireAuth, app.requireRole('admin')]` preHandlers |
| `apps/api/src/services/room-service.ts` | **Extend** | Add `createRoom()`, `updateRoom()`, `deleteRoom()` |
| `apps/api/src/repositories/room-repository.ts` | **Extend** | Add `create()`, `update()`, `delete()` |
| `apps/api/src/services/admin-service.ts` | **New** | `listAllBookings()`, `listAllUsers()`, `updateUserRole()` |
| `apps/api/src/repositories/admin-repository.ts` | **New** | Joined booking query, user list query, user role update |
| `apps/api/src/index.ts` | **Extend** | Register `adminRoutes` with `{ prefix: '/admin' }` |
| `packages/shared-types/src/room-schemas.ts` | **Extend** | Add `CreateRoomRequestSchema`, `UpdateRoomRequestSchema`, and inferred types |
| `packages/shared-types/src/admin-schemas.ts` | **New** | `AdminBookingRowSchema`, `AdminUserRowSchema`, `AdminBookingListResponseSchema`, `AdminUserListResponseSchema` |
| `packages/shared-types/src/index.ts` | **Extend** | Re-export from `./admin-schemas.js` |
| `apps/web/src/routes/AdminPage.tsx` | **New** | Three-tab admin dashboard component with Rooms, Bookings, Users tabs |
| `apps/web/src/lib/api/admin.ts` | **New** | Typed API client functions: `getAdminBookings()`, `getAdminUsers()`, `createRoom()`, `updateRoom()`, `deleteRoom()`, `updateUserRole()` |
| `apps/web/src/App.tsx` | **Extend** | Add `/admin` route wrapped in `AdminRoute` guard component |
| `apps/web/src/components/Nav.tsx` | **Extend** | Conditionally render Admin link when `user.role === 'admin'` |

---

## Cross-Service Data Flows

### Capability 1 — Room Management

**Create a room:**
```
Browser (AdminPage — Rooms tab — Create form)
  → POST /api/admin/rooms   { name, description, pricePerNightCents, capacity, imageUrl }
  → adminRoutes: preHandler [requireAuth, requireRole('admin')]
  → RoomService.createRoom(data)
  → RoomRepository.create(data)        — INSERT INTO rooms
  ← returns Room row
  ← route replies 201 with Room
  ← AdminPage adds room to local list
```

**Edit a room:**
```
Browser (AdminPage — Rooms tab — Edit form)
  → PATCH /api/admin/rooms/:id   { name?, description?, pricePerNightCents?, capacity?, imageUrl? }
  → adminRoutes: preHandler [requireAuth, requireRole('admin')]
  → RoomService.updateRoom(id, data)
  → RoomRepository.findById(id)        — throws NotFoundError if missing
  → RoomRepository.update(id, data)    — UPDATE rooms SET ... WHERE id = :id
  ← returns updated Room row
  ← route replies 200 with Room
  ← AdminPage updates room in local list
```

**Delete a room:**
```
Browser (AdminPage — Rooms tab — Delete confirmation)
  → DELETE /api/admin/rooms/:id
  → adminRoutes: preHandler [requireAuth, requireRole('admin')]
  → RoomService.deleteRoom(id)
  → RoomRepository.findById(id)        — throws NotFoundError if missing
  → RoomRepository.delete(id)          — DELETE FROM rooms WHERE id = :id
  ← route replies 204 No Content
  ← AdminPage removes room from local list
```

### Capability 2 — Bookings Overview

```
Browser (AdminPage — Bookings tab)
  → GET /api/admin/bookings
  → adminRoutes: preHandler [requireAuth, requireRole('admin')]
  → AdminService.listAllBookings()
  → AdminRepository.findAllBookings()  — SELECT with JOIN on users + rooms; ORDER BY createdAt DESC
  ← returns AdminBookingRow[]
  ← route maps to AdminBookingListResponse and replies
  ← AdminPage renders booking table
```

Non-admin path: `requireRole('admin')` throws `ForbiddenError` → `errorHandler` returns `{ statusCode: 403, code: "FORBIDDEN" }`.

### Capability 3 — User Management

**List all users:**
```
Browser (AdminPage — Users tab)
  → GET /api/admin/users
  → adminRoutes: preHandler [requireAuth, requireRole('admin')]
  → AdminService.listAllUsers()
  → AdminRepository.findAllUsers()     — SELECT from users; ORDER BY createdAt ASC
  ← returns AdminUserRow[]
  ← route maps to AdminUserListResponse and replies
  ← AdminPage renders user table
```

**Change user role:**
```
Browser (AdminPage — Users tab — role toggle)
  → PATCH /api/admin/users/:id   { role: "user" | "admin" }
  → adminRoutes: preHandler [requireAuth, requireRole('admin')]
  → AdminService.updateUserRole(id, newRole)
  → AdminRepository.findUserById(id)       — throws NotFoundError if missing
  → [last-admin guard: if newRole === "user", check admin count > 1]
  → AdminRepository.updateUserRole(id, newRole)  — UPDATE users SET role = :role WHERE id = :id
  ← returns updated AdminUserRow
  ← route replies 200 with AdminUserRow
  ← AdminPage updates user row in-place
```

Auth on all paths: `session` httpOnly cookie → `requireAuth` verifies Cognito AccessToken via JWKS → attaches `request.sessionUser` → `requireRole('admin')` checks `request.sessionUser.role === 'admin'`.

---

## Frontend Approach

- **New page:** `apps/web/src/routes/AdminPage.tsx`. Uses local `useState` for active tab, per-tab list data, and in-flight mutation state. Follows the `useState` + async fetch pattern established in `BookingsPage.tsx`.
- **Route guard:** Add `AdminRoute` component alongside the existing `ProtectedRoute` in `App.tsx`. `AdminRoute` checks `user.role === 'admin'`; non-admins are redirected to `/rooms`. It wraps `ProtectedRoute` rather than replacing it.
- **Nav link:** `Nav.tsx` already receives `user` from `useAuth()`. Add `{user?.role === 'admin' && <Link to="/admin" style={styles.link}>Admin</Link>}` alongside the existing links.
- **Forms:** Inline forms — no external form library. Match the zero-dependency inline-style approach of the existing scaffold UI.
- **API client:** `apps/web/src/lib/api/admin.ts` — typed fetch functions following the same pattern as `apps/web/src/lib/api/bookings.ts`. Never call `fetch` directly from page components.
- **`data-testid` requirements (required by Playwright):**
  - `admin-rooms-tab`, `admin-bookings-tab`, `admin-users-tab` — tab buttons
  - `admin-rooms-table`, `admin-bookings-table`, `admin-users-table` — table containers
  - `create-room-btn`, `create-room-form`, `create-room-submit` — create room flow
  - `edit-room-btn-{id}`, `edit-room-form`, `edit-room-submit` — edit room flow
  - `delete-room-btn-{id}`, `delete-room-confirm` — delete room flow
  - `change-role-btn-{id}` — role change button per user row

---

## Shared Type Design

**`packages/shared-types/src/admin-schemas.ts`** (new file):

```ts
// Admin booking row — denormalized user and room fields for display
AdminBookingRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  roomId: z.string().uuid(),
  roomName: z.string(),
  checkIn: z.string().date(),
  checkOut: z.string().date(),
  status: z.enum(["confirmed", "cancelled"]),   // reuse BookingStatusSchema
  createdAt: z.string().datetime(),
  cancelledAt: z.string().datetime().nullable(),
})

// Admin user row — subset of users table columns safe to expose
AdminUserRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string().nullable(),
  role: z.enum(["user", "admin"]),
  createdAt: z.string().datetime(),
})
```

**`packages/shared-types/src/room-schemas.ts`** (additions):

```ts
CreateRoomRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  pricePerNightCents: z.number().int().positive(),
  capacity: z.number().int().positive(),
  imageUrl: z.string().url().nullable().optional(),
})

UpdateRoomRequestSchema = CreateRoomRequestSchema.partial()
```

---

## Reuse Opportunities

| Resource | Evidence | How this feature uses it |
|---|---|---|
| `requireAuth` preHandler pattern | `apps/api/src/routes/bookings.ts` line 13 — every protected route uses `preHandler: [app.requireAuth]` | Same pattern on all admin route handlers; combined with `app.requireRole('admin')` |
| `requireRole` decorator | `apps/api/src/plugins/auth.ts` line 82 — `app.decorate("requireRole", ...)` | `preHandler: [app.requireAuth, app.requireRole('admin')]` on every handler in `adminRoutes` |
| `ForbiddenError` | `apps/api/src/errors/app-error.ts` line 30 — `ForbiddenError extends AppError` with status 403 | `requireRole` already throws it; `AdminService.updateUserRole` throws it for last-admin guard |
| `NotFoundError` | `apps/api/src/repositories/room-repository.ts` line 35 — `findById` throws `NotFoundError` if missing | `RoomRepository.update()` and `delete()` call `findById` first; `AdminRepository.findUserById()` does the same |
| `RoomSchema` | `packages/shared-types/src/room-schemas.ts` line 3 — existing `Room` response type | Admin room CRUD endpoints respond with the same `Room` type — no new room response schema needed |
| `toRoom` mapper | `apps/api/src/routes/rooms.ts` line 29 — maps DB row to `Room` response shape | `adminRoutes` reuses or extracts this mapper for `POST /admin/rooms` and `PATCH /admin/rooms/:id` responses |
| Three-layer pattern | `apps/api/src/routes/bookings.ts` → `BookingService` → `BookingRepository` | `adminRoutes` → `AdminService` → `AdminRepository`; `adminRoutes` → `RoomService` → `RoomRepository` |
| `ProtectedRoute` component | `apps/web/src/App.tsx` lines 8–13 — role-agnostic route guard | `AdminRoute` follows the same pattern, adding a `user.role === 'admin'` check |
| `useAuth()` in Nav | `apps/web/src/components/Nav.tsx` line 5 — Nav already calls `useAuth()` | `Nav.tsx` uses existing `user.role` field to conditionally render the Admin link; no new hook needed |

---

## Infrastructure Changes

None. All required tables and columns already exist:

- `users.role` — `roleEnum` with values `"user"` and `"admin"` (`db/schema/index.ts` line 14)
- `rooms` table — all columns needed for CRUD (`db/schema/index.ts` lines 27–35): `id`, `name`, `description`, `pricePerNightCents`, `capacity`, `imageUrl`, `createdAt`
- `bookings` table with `userId` and `roomId` foreign keys — sufficient for the admin joined query (`db/schema/index.ts` lines 37–58)

No `db/migrations` files need to be added or modified for this exercise.

---

## Codebase Grounding Report

| Claim | Result | Evidence |
|---|---|---|
| `requireRole` is decorated on `app` as `app.requireRole(role)` | Confirmed | `apps/api/src/plugins/auth.ts` line 82 — `app.decorate("requireRole", ...)` |
| `requireRole` throws `ForbiddenError` when role does not match | Confirmed | `apps/api/src/plugins/auth.ts` line 86 — `if (request.sessionUser.role !== role) throw new ForbiddenError()` |
| `SessionUser` has `role: "user" | "admin"` | Confirmed | `apps/api/src/plugins/auth.ts` line 11 — `role: "user" \| "admin"` in `SessionUser` interface |
| `roleEnum` has `"admin"` value | Confirmed | `db/schema/index.ts` line 14 — `pgEnum("role", ["user", "admin"])` |
| `RoomService` has only `listAvailable()` and `getById()` | Confirmed | `apps/api/src/services/room-service.ts` — two methods only; no write methods |
| `RoomRepository` has only `listAvailable()` and `findById()` | Confirmed | `apps/api/src/repositories/room-repository.ts` — two methods only; no write methods |
| `CurrentUserResponse` includes `role` field | Confirmed | `packages/shared-types/src/auth-schemas.ts` line 12 — `role: z.enum(["user", "admin"])` |
| `useAuth()` returns `user` with `role` field | Confirmed | `CurrentUserResponse` type flows through auth context; `Nav.tsx` line 5 already calls `useAuth()` |
| No `/admin` route exists in `App.tsx` | Confirmed | `apps/web/src/App.tsx` — routes are `/login`, `/rooms`, `/rooms/:id/book`, `/bookings`, `/` only |
| No Admin link exists in `Nav.tsx` | Confirmed | `apps/web/src/components/Nav.tsx` — only Rooms and My Bookings links |
| Route registration pattern is `app.register(routes, { prefix })` | Confirmed | `apps/api/src/index.ts` line 48 — `await app.register(bookingRoutes, { prefix: "/bookings" })` |
| `ForbiddenError` and `NotFoundError` are available in `app-error.ts` | Confirmed | `apps/api/src/errors/app-error.ts` lines 12, 30 |

---

## Open Questions

None.

---

## Validation

- [x] All sections complete
- [x] All assumptions confirmed against codebase with file:line evidence
- [x] Alternatives documented with rationale
- [x] Cross-service data flows cover all three capabilities
- [x] Reuse opportunities grounded in file references
- [x] Shared type additions designed to avoid duplication with existing schemas
- [x] `data-testid` requirements specified for Playwright compatibility
- [x] No new infrastructure or migrations required
