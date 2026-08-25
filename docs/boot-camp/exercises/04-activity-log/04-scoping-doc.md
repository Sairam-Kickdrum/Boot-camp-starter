> **Reading order:** 01-feature-brief.md → 03-architecture-plan.md → this document.

# Scoping Doc: Activity Log

**Feature:** BOOTCAMP-4
**Tier:** Standard (AI-SDLC Mode 2)
**Architecture Plan:** `docs/boot-camp/exercises/04-activity-log/03-architecture-plan.md`
**Date:** 2026-06-04

---

## Feature Overview

Every booking lifecycle event — created, cancelled, or dates modified — is recorded as an immutable row in a new `booking_events` table. A new `GET /bookings/:id/events` endpoint returns the chronological event timeline (owner-only). A new `BookingDetailPage` at `/bookings/:id` renders that timeline, and the My Bookings page gets a "View details" link per row.

---

## Split Rationale

Split by stack layer boundary that maps to an independent deployment unit. The backend (schema + event writes + API) is a prerequisite for the frontend: the `BookingDetailPage` cannot be meaningfully implemented or tested until the `GET /bookings/:id/events` endpoint exists and returns real data. Each ticket is a full vertical slice within its layer — the backend ticket delivers the complete server-side capability, and the frontend ticket delivers the complete UI.

---

## Dependency Chain

```
BOOTCAMP-4 (Foundation Skeleton — booking_events schema + migration + shared type)
    → BOOTCAMP-4-1 (Backend: Event Writes + API)
        → BOOTCAMP-4-2 (Frontend: Booking Detail Page)
```

BOOTCAMP-4-1 depends on the skeleton (schema must be migrated). BOOTCAMP-4-2 depends on BOOTCAMP-4-1 (the events API must exist and return real data).

---

## Ticket BOOTCAMP-4: Activity Log (Foundation Skeleton + Feature Parent)

**Type:** Feature Parent + Skeleton
**Branch:** `participant/<your-name>/04-activity-log`
**PR targets:** `solutions/04-activity-log`
**Run first:** `/implement BOOTCAMP-4`
**Sub-tickets:** BOOTCAMP-4-1, BOOTCAMP-4-2

**Summary:** Add a complete booking event timeline to the room booking application. Every booking lifecycle action — creation, cancellation, and date modification — automatically records an immutable event. Users can view the full history of any booking they own on a new Booking Detail page, accessed via a "View details" link from the My Bookings list.

**Context:** Extends the booking lifecycle established in Exercises 01 and 02. Every state change is now recorded and viewable. This introduces the append-only event log pattern, JSONB metadata, and the cross-cutting service hook — a new architectural layer on top of the existing three-layer pattern.

### Foundation Skeleton Scope

The skeleton ticket delivers the shared DB schema that both capability sub-tickets depend on. It contains no service logic, no API endpoint, and no UI — only the `booking_events` table definition, migration, and the shared type export.

| What | Where |
|---|---|
| `booking_events` table definition | `db/schema/index.ts` |
| Drizzle migration | `db/migrations/` (generated) |
| `BookingEventType` enum export | `packages/shared-types/src/booking-event-schemas.ts` (new) |

**Table columns:** `id` (uuid, PK), `booking_id` (FK → `bookings.id`), `event_type` (enum: `booking_created`, `booking_cancelled`, `dates_modified`), `metadata` (JSONB), `created_at` (timestamp, default now)

### Acceptance Criteria (Skeleton)

- [ ] AC-S1: `booking_events` table is present in Postgres after `npm run db:migrate` with all required columns and the `event_type` enum
- [ ] AC-S2: `BookingEventType` enum (`booking_created | booking_cancelled | dates_modified`) is exported from `shared-types` and importable in both `api` and `web`
- [ ] AC-S3: App compiles and starts cleanly; `npm run db:migrate` runs without errors; no regressions on existing routes and tests
- [ ] AC-S4: PR opened into `solutions/04-activity-log`

### After the skeleton PR merges

Create the BOOTCAMP-4-1 branch from the skeleton branch and begin the backend implementation. BOOTCAMP-4-2 starts after 4-1 is merged.

### Reference Documents

- [01-feature-brief.md](./01-feature-brief.md) — Feature context and user stories
- [03-architecture-plan.md](./03-architecture-plan.md) — Event timeline design and API contract

---

## Ticket BOOTCAMP-4-1: Activity Log — Event Writes & API

**Type:** Capability
**Depends on:** BOOTCAMP-4 skeleton (`booking_events` table migrated, `BookingEventType` exported from shared-types)
**Parallel with:** None (BOOTCAMP-4-2 depends on this)
**Estimate:** 1–1.5 days

### Summary

Implement a `BookingEventRepository` (insert + listForBooking only), synchronous event-writing hooks in `BookingService` for all three event types, and the `GET /bookings/:id/events` endpoint with ownership check. The `booking_events` schema and migration are provided by the skeleton — this ticket begins from a migrated table.

### Context

Server-side only. New `booking_events` table added via a Drizzle migration. `BookingEventRepository` is a new repository injected into `BookingService` via constructor — the same constructor injection pattern already used for `BookingRepository`. Event writes fire synchronously inside the three `BookingService` mutation methods, after each DB mutation succeeds. The new `GET /bookings/:id/events` endpoint reuses the same ownership check pattern as `GET /bookings/:id`.

### What the User Can Do

After this ticket, every booking lifecycle action (create, cancel, modify-dates) automatically records an event in `booking_events`. An authenticated API call to `GET /bookings/:id/events` returns the full event timeline for a booking the caller owns, in chronological order.

### Acceptance Criteria

- [ ] AC-1: `BookingService.bookRoom()` writes a `booking_created` event with `metadata: { roomId, checkIn, checkOut }` after the booking row is successfully created.
- [ ] AC-2: `BookingService.cancelBooking()` writes a `booking_cancelled` event with `metadata: { cancelledAt }` after the cancellation is successfully applied.
- [ ] AC-3: `BookingService.modifyDates()` writes a `dates_modified` event with `metadata: { oldCheckIn, oldCheckOut, newCheckIn, newCheckOut }` after the date update is successfully applied.
- [ ] AC-4: `GET /bookings/:id/events` returns 200 with `{ events: [...] }` in ascending `created_at` order for a booking owned by the authenticated user.
- [ ] AC-5: `GET /bookings/:id/events` returns 403 when the authenticated user does not own the booking, or the booking does not exist.
- [ ] AC-6: `BookingEventRepository` has no `update` or `delete` methods — only `insert` and `listForBooking`.
- [ ] AC-7: Unit tests cover: event written on `bookRoom`, event written on `cancelBooking`, event written on `modifyDates`; `listForBooking` returns events in ascending `created_at` order.

### Existing System Behavior

Before this ticket (skeleton already provides):
- `booking_events` table exists in Postgres with all required columns and the `event_type` enum
- `BookingEventType` is exported from `shared-types`

Still missing after skeleton:
- `BookingService` — has `listForUser()`, `getById()`, `bookRoom()`. After Exercises 01 and 02: also `cancelBooking()` and `modifyDates()`. No event writing exists yet.
- `BookingRepository` — has `listForUser()`, `findById()`, `hasConflict()`, `create()`. After Exercises 01 and 02: also `cancel()` and `update()`.
- `GET /bookings/:id` — ownership check pattern at `apps/api/src/routes/bookings.ts:39-46`. Reuse this exact pattern for `GET /bookings/:id/events`.
- `buildService()` at `apps/api/src/routes/bookings.ts:52-56` — manually constructs repos and `BookingService`. Update this function to also instantiate `BookingEventRepository` and pass it to `BookingService`.
- No `BookingEventRepository` exists. No `/events` endpoint exists.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| `BookingEventRepository` with `insert` + `listForBooking` | `booking_events` schema + migration (delivered by skeleton) |
| Event writes in `bookRoom`, `cancelBooking`, `modifyDates` | `BookingEventType` shared type (delivered by skeleton) |
| `GET /bookings/:id/events` endpoint (owner-only) | Hard-deleting or editing event rows |
| `BookingEvent` response type in `shared-types` | Admin viewing events for any booking |
| Unit tests for service-layer event writes | Real-time event streaming (SSE / WebSocket) |
| | Event replay to reconstruct booking state |

### Design Reference

- **Constructor injection pattern** — `apps/api/src/services/booking-service.ts:7-10`. Add `BookingEventRepository` as a third constructor parameter using the same `private readonly` pattern.
- **Ownership check pattern** — `apps/api/src/routes/bookings.ts:39-46`. The `GET /:id` route catches `NotFoundError` and rethrows as `ForbiddenError`, then checks `userId`. Apply the identical pattern to `GET /:id/events`.
- **Three-layer pattern** — route handles HTTP only; service holds business logic (event writes are business logic, not route logic); repository handles DB. Never write events from a route handler.
- **Drizzle migration** — run `npm run db:generate` after updating `db/schema/index.ts`; verify the generated SQL; run `npm run db:migrate` to apply.

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/04-activity-log/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/04-activity-log/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Ticket BOOTCAMP-4-2: Activity Log — Booking Detail Page

**Type:** Capability
**Depends on:** BOOTCAMP-4-1 (the `GET /bookings/:id/events` endpoint must exist)
**Parallel with:** None
**Estimate:** 1–1.5 days

### Summary

Build a `BookingDetailPage` at `/bookings/:id` that fetches and renders the event timeline from `GET /bookings/:id/events`. Add a "View details" link to each row on the My Bookings page. Register the new route in `App.tsx`.

### Context

New page at `/bookings/:id`, linked from `BookingsPage.tsx`. `BookingDetailPage` uses `useParams` to read the booking ID, fetches the event list on mount, and renders a chronological timeline with human-readable labels and formatted timestamps. Route registered in `App.tsx` inside `ProtectedRoute`.

### What the User Can Do

The user clicks "View details" on any booking row in the My Bookings list, navigates to `/bookings/:id`, and sees a chronological list of all events with human-readable labels ("Booking created", "Booking cancelled", "Dates modified"), formatted timestamps, and relevant metadata details (e.g., old and new dates for a `dates_modified` event).

### Acceptance Criteria

- [ ] AC-1: `BookingsPage` renders a "View details" link on each booking row pointing to `/bookings/:id`.
- [ ] AC-2: The `/bookings/:id` route is registered in `App.tsx` inside `ProtectedRoute` and renders `BookingDetailPage`.
- [ ] AC-3: `BookingDetailPage` fetches and displays all events for the booking in chronological order (ascending `created_at`).
- [ ] AC-4: Each event shows a human-readable label: `booking_created` → "Booking created", `booking_cancelled` → "Booking cancelled", `dates_modified` → "Dates modified".
- [ ] AC-5: `dates_modified` events display both the old dates and the new dates from the event `metadata`.
- [ ] AC-6: The page handles loading state, error state (including a specific message for 403), and empty events list ("No events yet.").
- [ ] AC-7: All key elements have `data-testid` attributes: `booking-detail-page`, `event-list`, `event-item`, `event-type-label`, `event-timestamp`, `view-details-link`.
- [ ] AC-8: Playwright test in `e2e/exercises/04-activity-log.spec.ts`: create a booking → cancel it → navigate to the detail page → assert both events appear in chronological order.

### Existing System Behavior

- `BookingsPage.tsx` — renders a component per booking row; currently shows dates, status badge, and truncated booking ID. No "View details" link exists.
- `App.tsx` — React Router v6 with four existing `<Route>` elements inside `<ProtectedRoute>` wrappers. No `/bookings/:id` route exists.
- `lib/api/bookings.ts` — has `listBookings()`, `bookRoom()`, and (after Exercises 01 and 02) `cancelBooking()` and `updateBookingDates()`. A new `getBookingEvents()` function follows the same pattern.
- `@boot-camp/shared-types` — will have `BookingEvent` and `BookingEventListResponse` types after BOOTCAMP-4-1.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| `BookingDetailPage` at `/bookings/:id` | Real-time event updates (polling or streaming) |
| Human-readable event type labels | Inline cancel or modify-dates actions from the detail page |
| Formatted `created_at` timestamp | Admin detail page showing events for any booking |
| Old and new dates displayed for `dates_modified` events | Pagination of events |
| "View details" link in `BookingsPage` | |
| Route registration in `App.tsx` | |
| API client `getBookingEvents()` | |
| Loading, error, and empty states | |
| Playwright end-to-end test | |

### Design Reference

- **Data-fetching page pattern** — `apps/web/src/routes/BookingsPage.tsx:6-16`. Uses `useState` + `useEffect` for fetch-on-mount with loading/error/data states. Follow the same pattern in `BookingDetailPage`.
- **Route registration pattern** — `apps/web/src/App.tsx:36-43`. Existing `<Route path="/bookings">` wrapped in `<ProtectedRoute>`. Add `<Route path="/bookings/:id">` immediately below it using the same `<ProtectedRoute>` wrapper.
- **API client pattern** — `apps/web/src/lib/api/bookings.ts`. Follow existing function signatures: typed return value using `@boot-camp/shared-types` types, `fetch` call via the shared `apiFetch` utility (or equivalent pattern already in the file).
- **data-testid requirement** — every interactive element and key data display must have a `data-testid`. The Playwright test depends on the specific IDs listed in AC-7.

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/04-activity-log/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/04-activity-log/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Estimated Total Effort

| Ticket | Estimate | Notes |
|---|---|---|
| BOOTCAMP-4: Foundation Skeleton | 0.25–0.5 days | `booking_events` schema + migration + `BookingEventType` shared type |
| BOOTCAMP-4-1: Backend — Event Writes + API | 1–1.5 days | Repo + service hooks + endpoint + unit tests (schema from skeleton) |
| BOOTCAMP-4-2: Frontend — Booking Detail Page | 1–1.5 days | New page + route + API client + BookingsPage link + Playwright test |
| **Total** | **2.25–3.5 days** | Skeleton first; 4-1 and 4-2 sequential |

---

## Linear-Ready Trim Guidance

When creating your Linear tickets from this scoping doc:

**Include in Linear:**
- Summary, Context, What the User Can Do, Acceptance Criteria, Scope Boundaries.

**Do NOT include in Linear** (stays here and in your LLP):
- File paths (`apps/api/src/repositories/booking-event-repository.ts`, etc.)
- Column names (`event_type`, `booking_id`, `metadata`)
- Method names (`insert`, `listForBooking`, `getBookingEvents`)
- Import patterns and Drizzle migration steps
- `data-testid` attribute names
