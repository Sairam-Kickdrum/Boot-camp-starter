---
feat_id: Feat-0002
feature: apps-web
type: frontend-feature
domain: room-booking
criticality: high
touched_paths:
  - apps/web/src
depends_on: [Feat-0001, Feat-0003]
consumed_by: []
implements: []
tags: [booking, auth, rooms]
---

## Overview

| Field | Value |
|---|---|
| Type | frontend-feature |
| Package | `@boot-camp/web` |
| Path | `apps/web/` |
| Domain | room-booking |
| Last updated | 2026-08-26 |

## Domain Purpose

Lets a logged-in cohort participant browse bookable rooms, reserve one for a date range, and see
their existing bookings — the single-page UI over Feat-0001's API.

## What This Does for the User

A participant logs in, sees a grid of rooms, picks dates on a room to book it, gets an immediate
confirmation, and can review everything they've booked so far.

## Key User Flows

| User Action | What Happens |
|---|---|
| Visits any protected route while logged out | Redirected to `/login` (`ProtectedRoute` in `App.tsx`) |
| Submits the login form | `POST /auth/login` → on success, `refreshUser()` fetches `GET /me` → navigates to `/rooms` |
| Lands on `/rooms` | Fetches `GET /rooms`, renders a card grid |
| Clicks "Book this room" on a room card | Navigates to `/rooms/:id/book` |
| Fills check-in/check-out and submits | `POST /bookings` → on success shows a confirmation screen; on 409 (date overlap) shows the server's error message |
| Clicks "View my bookings" after confirming | Navigates to `/bookings` |
| Lands on `/bookings` | Fetches `GET /bookings`, renders a list with status badges |
| Clicks "Log out" in `Nav` | `POST /auth/logout` → clears local user state → navigates to `/login` |

## UI States

| Condition | What Renders |
|---|---|
| Auth check still loading (`AuthProvider.loading`) | `ProtectedRoute` withholds children (no route content) |
| `RoomsPage` fetch in flight | "Loading rooms…" |
| `RoomsPage` fetch failed | Red error text |
| `RoomsPage` empty result | Empty grid — no explicit "no rooms" message (see Gaps below) |
| `BookingPage` room not yet fetched | "Loading…" instead of the form |
| `BookingPage` submit in flight | "Booking…", submit button disabled |
| `BookingPage` submit failed (e.g. 409 overlap) | Red error text below the form; form remains editable |
| `BookingPage` submit succeeded | Confirmation screen: room name + dates + "View my bookings" |
| `BookingsPage` fetch in flight | "Loading…" |
| `BookingsPage` fetch failed | Red error text |
| `BookingsPage` empty result | "No bookings yet." |
| `BookingsPage` with rows | List of rows, green badge for `confirmed`, red for anything else |

## APIs Consumed

| Method | Path | Owning `Feat-NNNN` |
|---|---|---|
| POST | `/auth/login` | Feat-0001 |
| POST | `/auth/logout` | Feat-0001 |
| GET | `/me` | Feat-0001 |
| GET | `/rooms` | Feat-0001 |
| GET | `/rooms/:id` | Feat-0001 |
| GET | `/bookings` | Feat-0001 |
| POST | `/bookings` | Feat-0001 |

`getBooking` (`GET /bookings/:id`) is defined in `apps/web/src/lib/api/bookings.ts` but not
currently called from any page.

## State

No Redux/RTK/Zustand — the only cross-page state is React Context.

- **`AuthContext`** (`apps/web/src/lib/auth/context.tsx`): `{ user: CurrentUserResponse | null,
  loading: boolean, logout(), refreshUser() }`. Populated on mount via `GET /me`; a `401` is
  treated as "logged out", any other error is re-thrown. Exposed via the `useAuth()` hook.
- Every page (`RoomsPage`, `BookingPage`, `BookingsPage`) owns its own local `useState` for its
  fetch result, `loading`, and `error` — there is no shared data-fetching cache, so navigating
  away and back always re-fetches.

## Invariants

- The `session` cookie is httpOnly — this app never reads or stores an auth token in JS; all
  API calls rely on `credentials: "include"` (`apps/web/src/lib/api/client.ts`).
- A `401` from any API call is the app's only signal that the user is logged out; it is handled
  explicitly in `AuthContext.refreshUser` and implicitly surfaces as a redirect via
  `ProtectedRoute` on the next render.
- `role` is fetched (`CurrentUserResponse.role`) but never branches rendering anywhere in this
  app today — see Feat-0001's Access Control for why that's not yet a gap to close blindly (no
  endpoint needs it either).

## Access Control

**Model**: Client-side route guarding only (`ProtectedRoute` checks `user`/`loading` from
`AuthContext`), which is advisory — the real access boundary is Feat-0001's `requireAuth`. No
role-based UI branching exists.

| Action | Access Condition | Enforced In |
|---|---|---|
| Viewing `/rooms`, `/rooms/:id/book`, `/bookings` | `useAuth().user` is non-null | `ProtectedRoute` in `apps/web/src/App.tsx` |
| Viewing `/login` while already authenticated | redirected to `/rooms` | `LoginPage` |

## Safe vs Dangerous Changes

### Safe
- Adding a new page that only reads from an existing endpoint
- Adding a loading/empty-state message where one is currently silent (see Gaps)
- Adding `data-testid` attributes to existing interactive elements

### Dangerous — Requires Review

| Change | Risk | Why |
|---|---|---|
| Changing what `AuthContext.refreshUser` treats as "logged out" | Could mask a real backend outage as a normal logout, or vice versa | It only special-cases HTTP 401 today; any other status is re-thrown as an unhandled error |
| Removing `credentials: "include"` from `client.ts` | Silently breaks every authenticated call | The `session` cookie is httpOnly and this is the only mechanism that sends it |
| Adding role-based UI branching without also adding the matching backend `requireRole` check | UI-only enforcement is not a security boundary | See Feat-0001 Access Control — the backend does not currently gate anything by role |

### Human Escalation Required
- Any change to how the login form submits credentials (must stay body-only, matching Feat-0001's `LoginRequestSchema`)

## Known Error Scenarios

| Scenario | Error Returned | Root Cause |
|---|---|---|
| Wrong email/password | "Invalid email or password." | `LoginPage` catches any exception from `login()` uniformly — does not distinguish network errors from 401s |
| Booking overlaps an existing one | Server's error message shown verbatim | `BookingPage` renders `ApiError.message` directly, unsanitized (see Gaps — trust boundary) |
| API unreachable / non-2xx, non-JSON response | Generic `ApiError` thrown from `client.ts` | No retry; single attempt only |

## Testing Expectations

No frontend tests exist yet (`apps/web` has zero `*.test.ts`/`*.test.tsx` files as of this scan).
Per `.claude/skills/frontend-test/`, new components with non-trivial logic should get Vitest +
Testing Library coverage: happy path, loading state, error state, and — per FE-02 — every
interactive element must carry a `data-testid` before it can be reliably targeted (two are
currently missing, see Gaps).

- Golden-path E2E coverage exists separately: `e2e/reference/booking-flow.spec.ts` (Playwright).

## Forbidden Patterns
- Never read or store the `session` token in JS — it is httpOnly by design; treat `401` as the
  only observable auth signal.
- Never call `fetch` directly for a new API integration — go through `apps/web/src/lib/api/*.ts`
  so the base URL, `credentials: "include"`, and error unwrapping stay consistent.

## Key Files
- `apps/web/src/App.tsx` — routes + `ProtectedRoute`
- `apps/web/src/main.tsx` — React render entry
- `apps/web/src/lib/auth/context.tsx` — `AuthProvider`/`useAuth`
- `apps/web/src/lib/api/client.ts` — base fetch wrapper (base URL, `credentials`, `ApiError`)
- `apps/web/src/lib/api/{auth,rooms,bookings}.ts` — typed endpoint wrappers
- `apps/web/src/components/Nav.tsx` — nav bar + logout
- `apps/web/src/routes/{LoginPage,RoomsPage,BookingPage,BookingsPage}.tsx` — the four pages

## Context Routing

| Feature | Load when |
|---|---|
| Feat-0002 (this page) | touching `apps/web/**` |
| Feat-0001 | a UI change needs to know an endpoint's exact request/response shape or error codes |
| Feat-0003 | a UI change needs to know a shared type's exact fields |

| Workflow | Sections to load |
|---|---|
| `/plan` impact analysis | Key User Flows, APIs Consumed, Safe vs Dangerous Changes |
| `/pr-review-frontend` | UI States, Access Control, Forbidden Patterns, Testing Expectations |

## Gaps found by this scan (not yet resolved)
- *Open question: `RoomsPage`'s empty-result state renders nothing (no "no rooms available"
  message) — is that intentional, or a missing UI state?*
- *Open question: the "View my bookings" button on `BookingPage`'s confirmation screen and the
  "Log out" button in `Nav` have no `data-testid` — FE-02 in `.claude/rules/frontend-lang.md`
  calls this a blocker for new interactive elements; these predate the rule.*
