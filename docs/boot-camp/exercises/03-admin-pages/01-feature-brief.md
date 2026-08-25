> **Start here.** Read this document fully before opening any other file in this exercise.

# Feature Brief: Admin Pages

**Tier:** Standard (AI-SDLC Mode — Mode 2)
**Module:** Boot Camp Starter — Room Booking App
**Author (PM):** Boot Camp Facilitator
**Date:** 2026-06-04
**Linear Ticket:** BOOTCAMP-3
**Prototype:** Scaffold running at `http://localhost:5173` (admin user required — see below)

---

## What

An admin dashboard at `/admin`, accessible only to users with `role = 'admin'`. The dashboard provides full operational control over rooms (create, edit, delete), a cross-user view of all bookings in the system, and a user management interface where admins can view all users and toggle their roles between `user` and `admin`. Regular users who attempt to access `/admin` or any `/admin/*` API route receive a 403 Forbidden response. The admin nav link is hidden from non-admin users.

---

## Who

**Primary:** Any authenticated user with `role = 'admin'`.
**Affected:** Regular users (`role = 'user'`) — they see no admin UI and receive 403 from all admin API routes.

---

## Where

**`/admin` — Admin Dashboard** (new page: `apps/web/src/routes/AdminPage.tsx`).

A tabbed interface with three tabs:

| Tab | Content |
|---|---|
| **Rooms** | Room list with Create, Edit, Delete actions |
| **Bookings** | All bookings across all users, with user email and room name |
| **Users** | User list with role display and role-change action |

The `/admin` route is new. The nav renders an **Admin** link visible only when `user.role === 'admin'`.

---

## Approach

RBAC (`requireRole`) is already scaffolded in `apps/api/src/plugins/auth.ts` — participants apply it to new admin routes using `preHandler: [app.requireAuth, app.requireRole('admin')]`. The auth plugin attaches `request.sessionUser.role` on every authenticated request; no new auth infrastructure is needed.

`RoomService` and `RoomRepository` already exist but only have read methods (`listAvailable`, `getById`). This exercise extends them with write operations (create, update, delete). A new `AdminService` and `AdminRepository` handle the booking and user queries that are admin-specific (joined data, cross-user scope).

The frontend adds a new `AdminPage.tsx` route protected by a role-check guard component, a conditional admin link in `Nav.tsx`, and typed API client functions in `apps/web/src/lib/api/admin.ts`.

---

## What's New

- **New screen?** Yes — `AdminPage.tsx` at `/admin`. Tabbed layout: Rooms | Bookings | Users.
- **Extends existing services?** Yes — `RoomService` and `RoomRepository` gain write methods.
- **New service and repository?** Yes — `AdminService` and `AdminRepository` for joined booking queries and user queries.
- **New routes file?** Yes — `apps/api/src/routes/admin.ts`.
- **New shared types?** Yes — `CreateRoomRequest`, `UpdateRoomRequest` (in room-schemas), `AdminBookingRow`, `AdminUserRow` (in new admin-schemas file).
- **New infrastructure?** No — no new tables, no migrations. All columns exist in the current schema.

---

## Prototype Reference

Run the scaffold locally with an admin account:

```
http://localhost:5173
```

Log in as `admin@example.com` (password: `Bootcamp1!`). After login, navigate to `/admin` — the page does not exist yet. This is the blank canvas participants fill in.

The admin user is created by `./scripts/seed-cognito.sh`. If you see a 404 or a blank screen, the page has not been built yet — that is expected.

---

## Interaction Model

- **Interaction pattern:** Multi-screen admin dashboard. Each tab is an independent read or write flow. Write operations (create/edit/delete room, change role) are single-shot — one form submit or one confirmation click.
- **State location:** Server-persisted — all mutations write to Postgres.
- **Sync vs async:** Synchronous — all operations are immediate; no background jobs.
- **Conversation memory:** Not applicable.

---

## Capabilities

| # | Capability | Category | Target screen | Expected services | Validation method | Priority |
|---|---|---|---|---|---|---|
| 1 | Room Management | Write + Read | `/admin` (Rooms tab) | RoomService + RoomRepository | Room CRUD works; public `/rooms` reflects changes immediately | Must |
| 2 | Bookings Overview | Read & Query | `/admin` (Bookings tab) | New AdminService | All bookings visible with user email + room name; non-admin gets 403 | Must |
| 3 | User Management | Write + Read | `/admin` (Users tab) | New AdminService | Role changes persist; last-admin guard works; non-admin gets 403 | Must |

---

## Confirmed Prototype Decisions

These behaviors are confirmed requirements, grounded in the existing scaffold:

- `requireRole` already exists in `apps/api/src/plugins/auth.ts` and is decorated on the Fastify instance — participants call `app.requireRole('admin')` directly as a preHandler.
- `request.sessionUser.role` is typed as `"user" | "admin"` — confirmed in `apps/api/src/plugins/auth.ts` (`SessionUser` interface, line 11).
- `requireRole` throws `ForbiddenError` (403) when the role does not match — confirmed `apps/api/src/plugins/auth.ts` (line 86).
- `CurrentUserResponseSchema` in `packages/shared-types/src/auth-schemas.ts` already includes `role: z.enum(["user", "admin"])`. `useAuth()` returns this shape, so `user.role` is available in `Nav.tsx` with no changes to the auth context.
- `roleEnum` is `pgEnum("role", ["user", "admin"])` — confirmed in `db/schema/index.ts` (line 14). No migration is needed to add admin role support.
- `RoomService` only has `listAvailable()` and `getById()` — confirmed in `apps/api/src/services/room-service.ts`. Write methods are new work for this exercise.
- `RoomRepository` only has `listAvailable()` and `findById()` — confirmed in `apps/api/src/repositories/room-repository.ts`. Write methods are new work.
- Admin route prefix will be `/admin` — registered via `app.register(adminRoutes, { prefix: '/admin' })` in `apps/api/src/index.ts`, following the pattern of existing route registrations (line 48).

---

## Excluded Features

- **S3 image uploads** — `imageUrl` on `rooms` accepts any string; file upload UI and S3 integration are out of scope for v1.
- **User deactivation or deletion** — this exercise only changes `role`. Removing or disabling user accounts is out of scope.
- **Admin booking cancellation** — admins view bookings only in this exercise; cancellation belongs to the booking owner (Exercise 01/02).
- **Audit logging** — recording who changed what and when is Exercise 04. This exercise has no audit logging requirement.
- **Email notifications** — notifying users when their role changes is Exercise 05.
- **Pagination** — a full list is acceptable for the boot camp. Pagination is a nice-to-have.

---

## Open Questions

None — all decisions are grounded in the scaffold.

---

## Success Metric

- A participant completes all three sub-tickets (BOOTCAMP-3-1, BOOTCAMP-3-2, BOOTCAMP-3-3) end-to-end using the `/implement` workflow.
- The `e2e/exercises/03-admin-pages.spec.ts` Playwright test passes on the participant's branch without modification.
- A non-admin user receives a 403 on all `/admin/*` API routes and is redirected away from `/admin` in the UI.
