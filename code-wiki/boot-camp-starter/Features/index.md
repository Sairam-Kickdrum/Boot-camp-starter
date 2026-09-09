# Features — boot-camp-starter

Generated from each feature's frontmatter. Never hand-edit this file directly — regenerate it from
`Features/*/Index.md` frontmatter instead.

## Feature Catalog

### backend-service

| feat_id | feature | domain | criticality | path |
|---|---|---|---|---|
| Feat-0001 | auth-backend | identity | high | `apps/api/src/routes/auth.ts`, `apps/api/src/routes/me.ts`, `apps/api/src/plugins/auth.ts` |
| Feat-0002 | bookings-backend | booking | high | `apps/api/src/routes/bookings.ts`, `apps/api/src/services/booking-service.ts`, `apps/api/src/repositories/booking-repository.ts` |
| Feat-0003 | rooms-backend | inventory | medium | `apps/api/src/routes/rooms.ts`, `apps/api/src/services/room-service.ts`, `apps/api/src/repositories/room-repository.ts` |

### frontend-feature

| feat_id | feature | domain | criticality | path |
|---|---|---|---|---|
| Feat-0004 | auth-frontend | identity | high | `apps/web/src/lib/auth/context.tsx`, `apps/web/src/lib/api/auth.ts`, `apps/web/src/routes/LoginPage.tsx`, `apps/web/src/components/Nav.tsx` |
| Feat-0005 | bookings-frontend | booking | high | `apps/web/src/routes/BookingPage.tsx`, `apps/web/src/routes/BookingsPage.tsx`, `apps/web/src/lib/api/bookings.ts` |
| Feat-0006 | rooms-frontend | inventory | medium | `apps/web/src/routes/RoomsPage.tsx`, `apps/web/src/lib/api/rooms.ts` |

### shared-library

| feat_id | feature | domain | criticality | path |
|---|---|---|---|---|
| Feat-0007 | shared-types | cross-cutting | high | `packages/shared-types/src/*.ts` |

## Workflow Routing Rules

| Keyword | Feature File |
|---|---|
| login, logout, session, Cognito, JWT, `requireAuth` | [Feat-0001](Feat-0001-auth-backend/Index.md) |
| booking, reservation, check-in/check-out, `bookRoom` | [Feat-0002](Feat-0002-bookings-backend/Index.md) |
| room listing, availability, capacity, price | [Feat-0003](Feat-0003-rooms-backend/Index.md) |
| login page, auth context, `useAuth`, `ProtectedRoute` | [Feat-0004](Feat-0004-auth-frontend/Index.md) |
| booking form, bookings page, `BookingPage`/`BookingsPage` | [Feat-0005](Feat-0005-bookings-frontend/Index.md) |
| rooms page, `RoomCard` | [Feat-0006](Feat-0006-rooms-frontend/Index.md) |
| any request/response shape, Zod schema, shared type | [Feat-0007](Feat-0007-shared-types/Index.md) |

### Per-Workflow Section-Loading

| Workflow | Load |
|---|---|
| `/implement` on a backend ticket | The relevant `Feat-000{1,2,3}` page's Business Rules + Safe/Dangerous Changes + Key Files, plus [Feat-0007](Feat-0007-shared-types/Index.md) if the ticket touches a request/response shape |
| `/implement` on a frontend ticket | The relevant `Feat-000{4,5,6}` page's Key User Flows + UI States + Key Files, plus [Feat-0007](Feat-0007-shared-types/Index.md) if the ticket touches a shape |
| `/pr-review-backend` | Business Rules + Safe/Dangerous Changes + Known Error Scenarios for every backend feature touched |
| `/pr-review-frontend` | UI States + Key User Flows + Safe/Dangerous Changes for every frontend feature touched |

## Dependency Graph

Generated from every feature's `depends_on`/`consumed_by` frontmatter — never hand-edited.

- **Feat-0001 (auth-backend)** depends on **Feat-0007 (shared-types)**; consumed by **Feat-0002**, **Feat-0003**, **Feat-0004**
- **Feat-0002 (bookings-backend)** depends on **Feat-0001**, **Feat-0003**, **Feat-0007**; consumed by **Feat-0005**
- **Feat-0003 (rooms-backend)** depends on **Feat-0001**, **Feat-0007**; consumed by **Feat-0002**, **Feat-0005**, **Feat-0006**
- **Feat-0004 (auth-frontend)** depends on **Feat-0001**, **Feat-0007**; consumed by **Feat-0005**, **Feat-0006**
- **Feat-0005 (bookings-frontend)** depends on **Feat-0002**, **Feat-0003**, **Feat-0004**, **Feat-0007**; consumed by nothing (leaf)
- **Feat-0006 (rooms-frontend)** depends on **Feat-0003**, **Feat-0004**, **Feat-0007**; consumed by **Feat-0005**
- **Feat-0007 (shared-types)** depends on nothing; consumed by all six other features

**Highest-risk edge**: Feat-0002 → Feat-0003 is the only backend-to-backend **compile-time import**
(`BookingRepository`/service imports `RoomRepository`) — see `Architecture/Overview.md`'s Coupling
Graph.

**Downstream impact**: a breaking change to Feat-0007 (shared-types) has the widest blast radius in
the repo — it is imported by every other feature. A breaking change to Feat-0001 (auth) affects
every protected route across both backend and frontend.
