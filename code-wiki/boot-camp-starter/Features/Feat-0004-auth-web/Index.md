---
feat_id: Feat-0004
feature: auth-web
type: frontend-feature
domain: auth
criticality: high
touched_paths:
  - apps/web/src/routes/LoginPage.tsx
  - apps/web/src/lib/auth/context.tsx
  - apps/web/src/lib/api/auth.ts
  - apps/web/src/App.tsx
  - apps/web/src/components/Nav.tsx
depends_on: [Feat-0001-auth-api, Feat-0007-shared-types]
consumed_by: []
implements: []
tags: [auth, session, routing]
---

# Auth (Web)

## Overview

| Field | Value |
|---|---|
| Type | frontend-feature |
| Package | `@boot-camp/web` |
| Path | `apps/web/src/routes/LoginPage.tsx`, `lib/auth/context.tsx`, `lib/api/auth.ts` |
| Domain | auth |
| Last updated | 2026-08-26 |

## What This Does for the User

Lets a participant log in with email/password, keeps them signed in via the `session` cookie, and
gates every other page behind that session.

## Key User Flows

- **Log in**: user enters email/password on `LoginPage` → submit calls `login()` (`POST
  /auth/login`) → on success calls `refreshUser()` (`GET /me`) → navigates to `/rooms`.
- **Auto-redirect if already logged in**: visiting `/login` while authenticated redirects to
  `/rooms`.
- **Session bootstrap**: on every app load, `AuthProvider` calls `getMe()` once; a 401 sets
  `user = null` rather than throwing.
- **Log out**: `Nav`'s "Log out" button calls `logout()` (`POST /auth/logout`) → navigates to
  `/login`.
- **Route protection**: `ProtectedRoute` (`App.tsx`) redirects to `/login` if `user` is `null` and
  the initial `loading` check has finished.

## UI States

| Condition | What Renders |
|---|---|
| `loading = true` (login submit in flight) | Submit button disabled, text → "Signing in…" |
| Login fails (any reason) | Generic message: "Invalid email or password." — no distinction between wrong credentials, network error, or server error |
| `AuthProvider` first mount, before `getMe()` resolves | `ProtectedRoute` renders "Loading…" |
| Not authenticated, mount resolved | Redirect to `/login` |

## APIs Consumed

| Method | Path | Owning `Feat-NNNN` |
|---|---|---|
| POST | `/auth/login` | [Feat-0001-auth-api](../Feat-0001-auth-api/Index.md) |
| POST | `/auth/logout` | [Feat-0001-auth-api](../Feat-0001-auth-api/Index.md) |
| GET | `/me` | [Feat-0001-auth-api](../Feat-0001-auth-api/Index.md) |

## State

`AuthProvider` (React Context, `apps/web/src/lib/auth/context.tsx`) — no Redux/Zustand store in
this codebase (see [Feat-0007-shared-types](../Feat-0007-shared-types/Index.md) and root
`CLAUDE.md`; frontend state is plain `useState` + Context throughout).

- Shape: `{ user: CurrentUserResponse | null, loading: boolean, logout(): Promise<void>,
  refreshUser(): Promise<void> }`
- Exported via `useAuth()` hook.
- `user.role` is fetched and held in state but **never read anywhere in the UI** — no
  role-based conditional rendering exists on the frontend (grep of `apps/web/src` for `role`
  returns zero component matches).

## Invariants

- The frontend never reads, writes, or inspects the `session` cookie's contents — it relies
  entirely on the browser auto-attaching it via `credentials: "include"` (`lib/api/client.ts`).
- No token is ever stored in `localStorage`/`sessionStorage`.

## Access Control

**Model**: mirrors the backend — cookie-session only, no client-side role gating.

| Action | Access Condition | Enforced In |
|---|---|---|
| View `/rooms`, `/rooms/:id/book`, `/bookings` | `user !== null` | `App.tsx` `ProtectedRoute` |
| View `/login` | none (redirects away if already authenticated) | `App.tsx` |

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Wrong credentials / any login failure | Generic "Invalid email or password." shown | `LoginPage.tsx` catches all exceptions identically |
| `getMe()` returns 401 on mount | `user` set to `null`, no error surfaced | `context.tsx:31-32` (handled) |
| `getMe()` fails with a non-401 error on mount | **Error re-thrown, not caught** — can break app init | `context.tsx:34-35` — flagged as a gap below |
| A call *after* mount returns 401 (session expired mid-session) | **Nothing redirects the user** — no global 401 interceptor | `lib/api/client.ts` has no interceptor; only the mount-time `getMe()` call is handled |

## Testing Expectations

*Open question: no test files found under `apps/web/src` for any component (grep for
`*.test.tsx`/`*.test.ts` in `apps/web` returns nothing). Per `.claude/rules/testing-standards.md`
(TEST-09), `LoginPage` and `AuthProvider` are exactly the kind of non-trivial-logic components
that should have tests — the mid-session-401 gap above would be a good first test to write
before fixing it.*

## Forbidden Patterns

- Never store a token or session identifier in `localStorage`/`sessionStorage` — this app relies
  exclusively on the httpOnly cookie; adding client-readable token storage would be a security
  regression, not a feature.
- Never branch UI on `user.role` without first confirming with a human whether that's intentional
  net-new authorization — no such branching exists today, and the backend has no enforced
  role model to back it (see [Feat-0001-auth-api](../Feat-0001-auth-api/Index.md) BR-05).

## Key Files

- `apps/web/src/routes/LoginPage.tsx` — login form and submit flow
- `apps/web/src/lib/auth/context.tsx` — `AuthProvider`/`useAuth`
- `apps/web/src/lib/api/auth.ts` — `login`/`logout`/`getMe` wrappers
- `apps/web/src/lib/api/client.ts` — base `fetch` wrapper (`credentials: "include"`, `ApiError`)
- `apps/web/src/App.tsx` — `ProtectedRoute`, route table
- `apps/web/src/components/Nav.tsx` — logout action, displays `user.email`

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0004-auth-web | touching login UI, session context, or route protection |

| Workflow | Sections to load |
|---|---|
| `/pr-review-frontend` on an auth change | Key User Flows, Known Error Scenarios, Forbidden Patterns |
