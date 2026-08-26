<!-- GENERATED from Features/*/Index.md frontmatter — do not hand-edit. Regenerate whenever a
     feature page's frontmatter changes. -->

# Feature Catalog

## backend-service

| feat_id | feature | domain | criticality | path |
|---|---|---|---|---|
| Feat-0001 | apps-api | room-booking | high | `apps/api/src`, `db/schema`, `db/migrations` |

## frontend-feature

| feat_id | feature | domain | criticality | path |
|---|---|---|---|---|
| Feat-0002 | apps-web | room-booking | high | `apps/web/src` |

## shared-library

| feat_id | feature | domain | criticality | path |
|---|---|---|---|---|
| Feat-0003 | shared-types | room-booking | high | `packages/shared-types/src` |

## Workflow Routing Rules

Keyword → feature file, so a consumer doesn't have to load the whole tree:

| Keyword / Topic | Feature File |
|---|---|
| login, session, cookie, Cognito, JWT, JWKS, `requireAuth`, `requireRole` | `Feat-0001-apps-api/Index.md` |
| booking, overlap, availability, `bookings` table | `Feat-0001-apps-api/Index.md`, `Schemas/schemas.md#bookings` |
| room, `rooms` table | `Feat-0001-apps-api/Index.md`, `Schemas/schemas.md#rooms` |
| user, `users` table, role, admin | `Feat-0001-apps-api/Index.md`, `Schemas/schemas.md#users` |
| React page, component, route (frontend), UI state | `Feat-0002-apps-web/Index.md` |
| AuthProvider, useAuth, ProtectedRoute | `Feat-0002-apps-web/Index.md` |
| Zod schema, request/response shape, DTO, API contract | `Feat-0003-shared-types/Index.md` |

Per-workflow section-loading:

| Workflow | Sections to load |
|---|---|
| `/plan` impact analysis | Business Rules + Safe vs Dangerous Changes + API Endpoints/APIs Consumed/Exports, on every feature touched by the ticket |
| `/pr-review-backend` | Feat-0001: Business Rules, Access Control, Known Error Scenarios, Forbidden Patterns |
| `/pr-review-frontend` | Feat-0002: UI States, Access Control, Forbidden Patterns, Testing Expectations |
| GEN-07 contract-consistency review (any API shape change) | Feat-0003 Exports table + the Feat-0001/Feat-0002 sections referencing that schema |
| alignment loop (ticket vs reality) | Domain Purpose + Business Rules/Key User Flows on every feature the ticket claims to touch |

## Dependency Graph

Derived from `depends_on`/`consumed_by` — see `Architecture/Overview.md` for the rendered
coupling diagram and the risk note on Feat-0003.

| Feature | Depends On | Consumed By | Downstream Impact If Changed |
|---|---|---|---|
| Feat-0001 (apps-api) | Feat-0003 | Feat-0002 | A breaking API/route change breaks Feat-0002 directly |
| Feat-0002 (apps-web) | Feat-0001, Feat-0003 | *(none — leaf)* | Nothing in-repo depends on apps-web; changes are self-contained |
| Feat-0003 (shared-types) | *(none)* | Feat-0001, Feat-0002 | Highest-risk node — any breaking schema change breaks both consumers simultaneously |
