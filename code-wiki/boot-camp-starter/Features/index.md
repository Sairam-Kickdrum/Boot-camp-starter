# Features Index

**Generated from `Features/*/Index.md` frontmatter — never hand-edit.** If this disagrees with a
feature file's frontmatter, the frontmatter is correct; regenerate this file.

## Feature Catalog

### backend-service

| feat_id | Feature | Domain | Criticality | Path |
|---|---|---|---|---|
| Feat-0001 | [auth-api](Feat-0001-auth-api/Index.md) | auth | high | `apps/api/src/routes/auth.ts`, `me.ts`, `plugins/auth.ts` |
| Feat-0002 | [bookings-api](Feat-0002-bookings-api/Index.md) | bookings | high | `apps/api/src/routes/bookings.ts`, `services/booking-service.ts`, `repositories/booking-repository.ts` |
| Feat-0003 | [rooms-api](Feat-0003-rooms-api/Index.md) | rooms | medium | `apps/api/src/routes/rooms.ts`, `services/room-service.ts`, `repositories/room-repository.ts` |

### frontend-feature

| feat_id | Feature | Domain | Criticality | Path |
|---|---|---|---|---|
| Feat-0004 | [auth-web](Feat-0004-auth-web/Index.md) | auth | high | `apps/web/src/routes/LoginPage.tsx`, `lib/auth/context.tsx` |
| Feat-0005 | [bookings-web](Feat-0005-bookings-web/Index.md) | bookings | high | `apps/web/src/routes/BookingPage.tsx`, `BookingsPage.tsx` |
| Feat-0006 | [rooms-web](Feat-0006-rooms-web/Index.md) | rooms | medium | `apps/web/src/routes/RoomsPage.tsx` |

### shared-library

| feat_id | Feature | Domain | Criticality | Path |
|---|---|---|---|---|
| Feat-0007 | [shared-types](Feat-0007-shared-types/Index.md) | contracts | high | `packages/shared-types/src/` |

## Workflow Routing Rules

Keyword → feature file, so a consumer loads only what it needs instead of the whole tree.

| Keyword / area | Feature file |
|---|---|
| login, logout, session, Cognito, JWT, `requireAuth`, `requireRole` | [Feat-0001-auth-api](Feat-0001-auth-api/Index.md) |
| booking, reservation, overlap, conflict, check-in/check-out (backend) | [Feat-0002-bookings-api](Feat-0002-bookings-api/Index.md) |
| room, availability, catalog (backend) | [Feat-0003-rooms-api](Feat-0003-rooms-api/Index.md) |
| login page, `AuthProvider`, `ProtectedRoute`, `useAuth` | [Feat-0004-auth-web](Feat-0004-auth-web/Index.md) |
| booking form, booking list, `BookingPage`, `BookingsPage` | [Feat-0005-bookings-web](Feat-0005-bookings-web/Index.md) |
| room grid, `RoomsPage`, `RoomCard` | [Feat-0006-rooms-web](Feat-0006-rooms-web/Index.md) |
| Zod schema, DTO, request/response shape, `@boot-camp/shared-types` | [Feat-0007-shared-types](Feat-0007-shared-types/Index.md) |

| Workflow | Section-loading guidance |
|---|---|
| `/pr-review-backend` | Business Rules, Access Control, Safe vs Dangerous Changes from the touched backend feature(s) |
| `/pr-review-frontend` | UI States, Known Error Scenarios, Forbidden Patterns from the touched frontend feature(s) |
| `/plan` impact analysis | `depends_on`/`consumed_by` from every touched feature, plus the Dependency Graph below |
| Alignment loop (ticket-vs-reality check) | Domain Purpose, Business Rules, Status/State Machine of the feature(s) the ticket names |

## Dependency Graph

Mandatory dependencies (`depends_on`) and downstream impact (`consumed_by`), from frontmatter.

| Feature | Depends on | Consumed by |
|---|---|---|
| Feat-0001-auth-api | *(none)* | Feat-0002-bookings-api, Feat-0003-rooms-api, Feat-0004-auth-web |
| Feat-0002-bookings-api | Feat-0001-auth-api, Feat-0003-rooms-api | Feat-0005-bookings-web |
| Feat-0003-rooms-api | Feat-0001-auth-api | Feat-0002-bookings-api, Feat-0006-rooms-web |
| Feat-0004-auth-web | Feat-0001-auth-api, Feat-0007-shared-types | *(none)* |
| Feat-0005-bookings-web | Feat-0002-bookings-api, Feat-0006-rooms-web, Feat-0007-shared-types | *(none)* |
| Feat-0006-rooms-web | Feat-0003-rooms-api, Feat-0007-shared-types | Feat-0005-bookings-web |
| Feat-0007-shared-types | *(none)* | Feat-0001, Feat-0002, Feat-0003, Feat-0004, Feat-0005, Feat-0006 |

**Highest downstream impact**: Feat-0007-shared-types (all 6 other features) and Feat-0001-auth-api
(3 direct consumers, and transitively everything, since every route requires auth). See
[`Architecture/Overview.md`](../Architecture/Overview.md) for the rendered coupling graph and the
one flagged high-risk coupling (`Feat-0002-bookings-api → Feat-0003-rooms-api`).
