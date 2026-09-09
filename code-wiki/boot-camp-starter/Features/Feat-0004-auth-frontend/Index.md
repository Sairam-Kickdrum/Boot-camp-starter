---
feat_id: Feat-0004
feature: auth-frontend
type: frontend-feature
domain: identity
criticality: high
touched_paths:
  - apps/web/src/lib/auth/context.tsx
  - apps/web/src/lib/api/auth.ts
  - apps/web/src/routes/LoginPage.tsx
  - apps/web/src/components/Nav.tsx
depends_on: [Feat-0001, Feat-0007]
consumed_by: [Feat-0005, Feat-0006]
implements: []
tags: [auth, session]
---

## Overview

| Type | Package | Path | Domain | Last updated |
|---|---|---|---|---|
| frontend-feature | apps/web | `src/lib/auth/`, `src/lib/api/auth.ts`, `src/routes/LoginPage.tsx`, `src/components/Nav.tsx` | identity | 2026-09-08 |

## What This Does for the User

Lets a participant log in with email/password, keeps them logged in across page loads, shows who's
logged in, and lets them log out. Every other page in the app is gated behind this.

## Key User Flows

- **Log in**: enter email/password on `LoginPage` → `login()` → on success, `refreshUser()` re-fetches `/me` → navigate to `/rooms`. On failure, a generic "Invalid email or password." is shown (no distinction between network/5xx/401).
- **Log out**: click "Log out" in `Nav` → `logout()` (POST `/auth/logout` + clears local state) → navigate to `/login`.
- **Session restore on load**: `AuthProvider` calls `refreshUser()` on mount to check the existing cookie session before rendering any route.

## UI States

| Condition | What Renders |
|---|---|
| `loading=true` (initial mount) | "Loading…" — prevents a flash of the login page while the session check is in flight |
| `loading=false`, `user=null` | `LoginPage` |
| `loading=false`, `user!=null` | `Nav` + the requested route |
| Login submit in flight | Submit button disabled, text → "Signing in…" |
| Login fails | "Invalid email or password." below the form |
| Session expired mid-app (401 from any call) | `refreshUser()` silently sets `user=null` — no toast/redirect is triggered from this path itself; the next `ProtectedRoute` check redirects |

## APIs Consumed

| Method | Path | Owning `Feat-NNNN` |
|---|---|---|
| POST | `/auth/login` | Feat-0001 |
| POST | `/auth/logout` | Feat-0001 |
| GET | `/me` | Feat-0001 |

## State

`AuthContext` (`apps/web/src/lib/auth/context.tsx`) — the only state slice in this app; there is no
Redux/Zustand/RTK Query.

- Shape: `{ user: CurrentUserResponse | null, loading: boolean, logout(), refreshUser() }`
- `CurrentUserResponse`: `{ id, email, displayName, role: "user" | "admin" }` (from `@boot-camp/shared-types`)
- Consumed via the `useAuth()` hook, which throws if called outside `AuthProvider`
- `role` is present on `user` but **not read anywhere in the frontend** — no admin-only UI exists yet (see Gaps below)

## Invariants

- Auth state lives only in `AuthProvider` — pages must not duplicate user state locally (per `apps/web/CLAUDE.md`).
- The Cognito AccessToken is never visible to frontend JS — it's an `httpOnly` cookie; the frontend only ever sends `credentials: "include"`.

## Safe vs Dangerous Changes

### Safe
- Adding a new field to `Nav` sourced from `user` (e.g. displaying `displayName`).

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Adding role-based rendering (e.g. an admin nav item) | New security-relevant surface | Nothing enforces this today; a frontend-only check is not a substitute for a backend `requireRole` — see [[Feat-0001]] |
| Changing `refreshUser()`'s 401 handling | Silent auth-state bugs | It intentionally swallows 401 (session-expired) but re-throws everything else; changing that changes what every page sees on error |

### Human Escalation Required
- Any UI surface gated on `role` — pair with the backend's still-unused `requireRole` (Feat-0001) so the two don't drift.

## Known Error Scenarios

| Scenario | What Renders | Root Cause |
|---|---|---|
| Wrong credentials | "Invalid email or password." | `ApiError` caught in `LoginPage`, all errors mapped to one message |
| Network failure during login | Same generic message | Same catch-all in `LoginPage` |
| Session expired | Silent `user=null`, no explicit message | `refreshUser()`'s 401 branch |

## Testing Expectations

- No test file exists for this feature yet. `apps/web` has no `@testing-library/react`/`jsdom` installed — see [[frontend-test skill]] for what to add first.

## Forbidden Patterns

- Never call `fetch` directly for auth — always go through `src/lib/api/auth.ts`.
- Never treat a frontend `role` check as access control — the backend is the only enforcement point.

## Key Files

- `apps/web/src/lib/auth/context.tsx` — `AuthProvider`, `useAuth`
- `apps/web/src/lib/api/auth.ts` — `login`, `logout`, `getMe`
- `apps/web/src/lib/api/client.ts` — shared `request()` wrapper (cookie + JSON handling, `ApiError`)
- `apps/web/src/routes/LoginPage.tsx`
- `apps/web/src/components/Nav.tsx`
- `apps/web/src/App.tsx` — `ProtectedRoute` guard

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0004 | Touching login UI, session bootstrap, or route protection |

## Open Questions

- *Open question: is role-based UI (admin-only pages/actions) planned, or is `role` on `CurrentUserResponse` currently unused by design?*
- *Open question: should a session-expired 401 mid-app trigger an explicit redirect/toast, rather than relying on the next `ProtectedRoute` check?*
