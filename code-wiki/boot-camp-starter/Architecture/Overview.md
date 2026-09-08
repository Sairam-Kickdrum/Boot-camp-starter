# Architecture Overview — boot-camp-starter

## What This Is

A teaching monorepo built around a simplified room-booking application ("book a room for a date
range"). The app itself is intentionally small — three domains (auth, rooms, bookings) — because
its purpose is to be a practice surface for cohort participants learning AI-assisted development,
not a production system.

## Topology

```
apps/web (React 18 + Vite, :5173)
   │  fetch, credentials: "include" (httpOnly session cookie)
   │  Vite dev-server proxies /api/* → :3000
   ▼
apps/api (Fastify 5, :3000)
   │  Drizzle ORM
   ▼
Postgres 16
   │
   └─ AWS Cognito User Pools (InitiateAuth on login; JWKS verification on every request)

packages/shared-types  — Zod schemas + inferred types, imported by both apps/api and apps/web
packages/config        — shared tsconfig/eslint base config, not a runtime dependency
db/schema, db/migrations, db/seed — single source of truth for the data model (Drizzle)
infra/cdk              — AWS CDK v2, synth-only in v1, not part of the request-time architecture
```

## Stack Per Layer

| Layer | Stack |
|---|---|
| Frontend | React 18, Vite 8, TypeScript, React Router 6 |
| Backend | Fastify 5, TypeScript, Drizzle ORM |
| Database | Postgres 16 |
| Auth | AWS Cognito User Pools (`USER_PASSWORD_AUTH`), `jose` for JWKS verification |
| Shared contracts | Zod schemas in `packages/shared-types`, consumed for runtime validation on the backend and as types only on the frontend |
| Testing | Vitest (unit/integration), Playwright (E2E) |
| Infra | AWS CDK v2 (synth-only), LocalStack (S3 + SES only — Cognito calls always hit real AWS, never LocalStack) |

## The Three Domains

| Domain | Backend | Frontend |
|---|---|---|
| Identity | [[Feat-0001]] (auth-backend) | [[Feat-0004]] (auth-frontend) |
| Inventory | [[Feat-0003]] (rooms-backend) | [[Feat-0006]] (rooms-frontend) |
| Booking | [[Feat-0002]] (bookings-backend) | [[Feat-0005]] (bookings-frontend) |
| Cross-cutting | [[Feat-0007]] (shared-types) — consumed by all six of the above | — |

## Cross-Cutting Architectural Decisions

These recur across multiple features and don't belong duplicated in any one feature's own page:

| Decision | Reason | Do Not Change Without |
|---|---|---|
| Cognito AccessToken in an `httpOnly` session cookie, never exposed to frontend JS, never accepted via an `Authorization` header | Removes an entire XSS-driven token-theft class; the frontend has no way to read or forward the token even if compromised | Reviewing [[Feat-0001]] and every route that calls `app.requireAuth` |
| Single shared Zod schema package (`packages/shared-types`) instead of independent frontend/backend DTOs | Structurally prevents field-name/enum drift between client and server | Reviewing [[Feat-0007]]'s consumer list before any shape change |
| Strict three-layer backend pattern (routes → services → repositories), enforced by convention (`apps/api/CLAUDE.md`'s invariants), not by a lint rule | Keeps business logic out of HTTP handlers and DB access out of services | — |
| No DB-level uniqueness constraint preventing overlapping bookings for the same room; the only gate is an application-level check-then-insert | Deliberately left as a known gap in a teaching app — see [[Feat-0002]]'s Known Error Scenarios | Any fix should add either a DB exclusion constraint or `SELECT ... FOR UPDATE`, not just tighten the app-level check further |
| No cascade-delete or 409 translation on `bookings.user_id`/`bookings.room_id` foreign keys (`ON DELETE NO ACTION`) | Also a deliberate gap — deleting a room or user with existing bookings currently fails at the raw DB-constraint level with no friendly error | See [[Feat-0002]] and [[Feat-0003]] |

## Coupling Graph

Rendered from each feature's `depends_on`/`consumed_by` frontmatter (see `Features/index.md` for
the generated table view). The one **compile-time** backend-to-backend coupling in the system:

```
Feat-0002 (bookings-backend) --imports RoomRepository--> Feat-0003 (rooms-backend)
```

This is the highest-risk coupling in the backend: a breaking change to `RoomRepository`'s interface
stops the bookings feature from compiling. Every other cross-feature edge is either a frontend→
backend HTTP call or a shared-types import — see `Features/index.md`'s Dependency Graph for the
full list.

## Known Gaps (Repo-Wide)

- No test coverage for `apps/api`'s auth routes/plugin, `apps/api`'s room service/repository, or
  any `apps/web` page/hook (frontend has no `@testing-library/react`/`jsdom` installed yet).
- No rate limiting anywhere, including on `/auth/login` and `POST /bookings`.
- `requireRole` exists in the auth plugin but is not used by any route — every endpoint that checks
  authorization today does so via ownership comparison, not role.
