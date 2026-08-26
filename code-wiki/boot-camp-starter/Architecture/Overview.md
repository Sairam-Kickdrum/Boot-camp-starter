# Architecture Overview

## System Topology

A two-service monorepo teaching app: one Fastify API, one React SPA, one shared-types package,
one Postgres database. There is no message queue, no background worker, and no third internal
service — this is intentionally the smallest shape that still demonstrates the three-layer
backend pattern and a typed frontend/backend contract.

```
apps/web (React SPA, :5173)
  │  fetch, credentials: include
  ▼
apps/api (Fastify, :3000)
  │  Drizzle ORM
  ▼
Postgres 16 (db/schema, db/migrations)

apps/api ──┐
apps/web ──┴──► packages/shared-types (Zod schemas + inferred types)

apps/api ──► AWS Cognito User Pools (InitiateAuth, JWKS verification)
```

## Tech Stack Per Layer

| Layer | Stack |
|---|---|
| Backend | Fastify 5, TypeScript, Drizzle ORM, `pg`, `jose` (JWT/JWKS), Pino logging |
| Frontend | React 18, Vite 8, TypeScript, React Router 6 |
| Shared contracts | Zod schemas + inferred TS types (`packages/shared-types`) |
| Auth | AWS Cognito User Pools — `InitiateAuth` (`USER_PASSWORD_AUTH`) on login; AccessToken in an httpOnly `session` cookie; JWKS verification per request |
| Database | Postgres 16, migrations managed by `drizzle-kit`, `db/schema/` is the single source of truth |
| Infra (synth-only in v1) | AWS CDK v2 (`infra/cdk`); LocalStack for S3 + SES only — Cognito is real, never mocked (see Feat-0001) |
| Testing | Vitest (unit/integration, per-workspace), Playwright (E2E, `e2e/reference/booking-flow.spec.ts`) |

## Cross-Cutting Architectural Decisions

These recur across 2+ features; a decision scoped to a single feature lives on that feature's
own page instead.

| Decision | Reason | Do Not Change Without |
|---|---|---|
| Session auth via httpOnly cookie only, never `Authorization` header | Keeps the AccessToken out of reach of frontend JS entirely (XSS mitigation); documented as a hard invariant in `apps/api/CLAUDE.md` | Reviewing both Feat-0001 (`plugins/auth.ts`) and Feat-0002 (`lib/api/client.ts`) together |
| No server-side session store — every request re-verifies the JWT against Cognito's JWKS | Removes an entire class of session-store bugs at the cost of a JWKS round-trip (cached) per cold key fetch | Understanding `apps/api/src/plugins/auth.ts`'s `createRemoteJWKSet` caching behavior |
| Request/response shapes are Zod schemas in `packages/shared-types`, never duplicated in `apps/api` or `apps/web` | One drift-proof source of truth for the API contract (root `CLAUDE.md`: "Never duplicate type definitions") | Touching any of Feat-0001, Feat-0002, or Feat-0003 in the same PR — see GEN-07 |
| `db/schema/` (Drizzle) is the single source of truth for the data model; migrations are generated from it, never hand-written | Prevents the schema and the migrations that build it from silently diverging | Any change to `db/schema/index.ts` |
| `role` (`user`/`admin`) exists on `users` and a `requireRole()` guard exists, but nothing uses it yet | Scaffolded ahead of an admin feature that hasn't landed | Do not assume "role-based access control" is enforced anywhere today — it isn't, see Feat-0001 Access Control |

## Coupling Graph

Rendered from `depends_on`/`consumed_by` frontmatter — see each feature page for evidence.

```
Feat-0003 (shared-types)
  ▲            ▲
  │ depends_on │ depends_on
  │            │
Feat-0001 ◄────┤ consumed_by
(apps-api)     │
  ▲            │
  │ depends_on │
  │            │
Feat-0002 ─────┘
(apps-web)
```

- **Feat-0001 (apps-api)** depends on Feat-0003 (shared-types); consumed by Feat-0002 (apps-web).
- **Feat-0002 (apps-web)** depends on Feat-0001 (apps-api) and Feat-0003 (shared-types);
  consumed by nothing else in-repo (it's the leaf).
- **Feat-0003 (shared-types)** depends on nothing; consumed by both Feat-0001 and Feat-0002 —
  the highest-risk node in the graph, since any breaking change there breaks both consumers at
  once (see Feat-0003's Safe vs Dangerous Changes).

## Open Questions From This Scan

- Whether `GET /health` (Feat-0001) has any real consumer (infra probe, monitoring) — no caller
  was found in either scanned target.
- Whether a booking-cancellation endpoint is planned — the `booking_status` enum already models
  `cancelled`, but no route can produce that transition today.
- Whether the booking-overlap check's known TOCTOU race (two concurrent requests both passing
  the check before either inserts) is accepted as-is for a teaching app, or slated for a fix
  (e.g. a DB exclusion constraint) — see Feat-0001 and `Schemas/schemas.md`'s Gaps section.
