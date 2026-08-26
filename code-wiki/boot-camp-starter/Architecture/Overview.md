# Architecture Overview

## System Topology

A two-app monorepo: a Fastify API and a React SPA, sharing a Zod-schema contract package and a
single Postgres database whose Drizzle schema lives outside either app's workspace.

```
apps/web (React + Vite, port 5173)
   │  fetch, credentials: "include"
   ▼
apps/api (Fastify 5, port 3000)
   │  Drizzle ORM
   ▼
Postgres 16 (db/schema/index.ts, db/migrations/)

apps/api ──┐
           ├──> packages/shared-types  (Zod schemas + inferred types)
apps/web ──┘

apps/api ──> AWS Cognito (InitiateAuthCommand on login; JWKS verification on every request)
```

There is no service-to-service HTTP boundary inside `apps/api` — it's a single Fastify process
with routes grouped by domain (`auth`, `rooms`, `bookings`), each following the repo's fixed
three-layer pattern (routes → services → repositories, see root `CLAUDE.md`). "Backend service"
in this wiki's `Features/` tree means a domain grouping within that one process, not a separately
deployed service.

## Tech Stack Per Layer

| Layer | Stack |
|---|---|
| Backend | Fastify 5, TypeScript, Drizzle ORM, `pg`, `jose` (JWT/JWKS), `@aws-sdk/client-cognito-identity-provider`, `pino` (logging), Vitest |
| Frontend | React 18, Vite 8, TypeScript, React Router 6, plain `fetch` (no data-fetching library — no RTK Query, no TanStack Query), Vitest |
| Shared | Zod schemas in `packages/shared-types`, consumed for validation (backend) and typed responses (frontend) |
| Database | Postgres 16, Drizzle ORM as the single source of truth for the schema (`db/schema/index.ts`), SQL migrations in `db/migrations/` |
| Infra | AWS CDK v2 (`infra/cdk`, synth-only in v1 — not deployed by this repo), LocalStack for S3 + SES only, AWS Cognito User Pools for auth (real AWS, not LocalStack) |
| E2E | Playwright (`e2e/`), golden-path tests under `e2e/reference/` |

## Cross-Cutting Architectural Decisions

These recur across two or more features — a single feature's own decision belongs in that
feature's own `Index.md`, not here.

| Decision | Reason | Recurs In |
|---|---|---|
| Cookie-session auth via Cognito, never an `Authorization` header | One verification path (`requireAuth`) for every protected route; no token ever touches frontend JS | [Feat-0001-auth-api](../Features/Feat-0001-auth-api/Index.md), [Feat-0004-auth-web](../Features/Feat-0004-auth-web/Index.md) |
| Ownership checks instead of role checks for authorization | `requireRole` exists but is wired into zero routes; every access-control decision found in the scan is "is this your own resource," not "what role are you" | [Feat-0002-bookings-api](../Features/Feat-0002-bookings-api/Index.md), [Feat-0001-auth-api](../Features/Feat-0001-auth-api/Index.md) BR-05 |
| Zod schemas as the single request/response contract, imported by both apps | Avoids hand-duplicating DTOs; validated once via Zod, typed once via inference (root `CLAUDE.md`) | [Feat-0007-shared-types](../Features/Feat-0007-shared-types/Index.md), consumed by all 6 other features |
| Drizzle schema (`db/schema/index.ts`) as the single source of truth for the data model, with migrations as the actual-truth tiebreaker | Repo convention (root `CLAUDE.md`); no drift found between the two in this scan | [`Schemas/schemas.md`](../Schemas/schemas.md) |
| No DB-level `CHECK` for `rooms.price_per_night_cents`/`capacity` positivity, or for preventing overlapping confirmed bookings on the same room | Zod-only / application-only enforcement — an intentional gap, not yet closed | [Feat-0003-rooms-api](../Features/Feat-0003-rooms-api/Index.md) BR-05, [Feat-0002-bookings-api](../Features/Feat-0002-bookings-api/Index.md) BR-06 |
| No test files exist anywhere under `apps/web/src` | Repo-wide gap, not one feature's — every frontend feature file in this tree carries the same open question | All three `*-web` features |

## Coupling Graph

Rendered from `depends_on`/`consumed_by` frontmatter across `Features/`. `A → B` means A depends
on B (B breaks A if B's contract changes).

```
Feat-0004-auth-web ────────► Feat-0001-auth-api ────────► Feat-0007-shared-types
                                     ▲
                                     │ (session identity)
Feat-0006-rooms-web ───► Feat-0003-rooms-api ───► Feat-0007-shared-types
       │                        │
       ▼                        ▼ (compile-time import: RoomRepository)
Feat-0005-bookings-web ─► Feat-0002-bookings-api ─► Feat-0007-shared-types
                                     │
                                     └──► Feat-0003-rooms-api (runtime call: roomRepo.findById)
```

**Highest-risk coupling**: `Feat-0002-bookings-api → Feat-0003-rooms-api` is a compile-time import
(`RoomRepository`) plus a runtime call (`roomRepo.findById()` in `booking-service.ts`) — a type or
behavior change in the rooms repository breaks booking creation both at build time and at runtime.
See both features' "Safe vs Dangerous Changes" tables.

**`Feat-0007-shared-types`** has no `depends_on` and is `consumed_by` all six other features — the
widest blast radius in the codebase for any single change (see its own Safe vs Dangerous Changes
table).

No event publishers/consumers, no cross-service HTTP calls, and no async processes (scheduled
jobs, queue consumers, webhooks) were found anywhere in this scan.

## Open Questions

- *Open question: is the `apps/api` domain-grouping (auth/rooms/bookings) intended to ever split
  into genuinely separate deployed services, or does "backend-service" in this wiki's
  `type:` frontmatter just mean "route group within one process," as it does today?*
