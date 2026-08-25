# Boot Camp Starter — Project Context

## What this project is

A monorepo containing a simplified room-booking application. Cohort participants use this as a practice environment to learn AI-assisted development with Claude Code. The booking app is not a product — it's a teaching vehicle.

## Repo layout

```
boot-camp-starter/
├── apps/
│   ├── api/          # Fastify + TypeScript backend (port 3000)
│   └── web/          # React + Vite + TypeScript frontend (port 5173)
├── packages/
│   ├── shared-types/ # Zod schemas + inferred TS types shared between api and web
│   └── config/       # Shared tsconfig and eslint base configs
├── db/
│   ├── schema/       # Drizzle table definitions (single source of truth for data model)
│   ├── migrations/   # Drizzle-generated SQL migrations
│   └── seed/         # Seed data for local dev
├── infra/cdk/        # AWS CDK stacks — synth-only in v1
├── e2e/              # Playwright tests
│   └── reference/   # Golden path tests for the booking flow
├── scripts/
│   ├── bootstrap.sh      # ONE command to set up local dev
│   ├── db-reset.sh       # Drop + recreate + migrate + seed
│   └── seed-cognito.sh   # Creates Cognito User Pool + users in LocalStack, links subs to Postgres
├── docs/boot-camp/   # Participant-facing docs and exercise packets
└── .claude/          # Claude Code harness (rules, skills, agents)
```

## Tech stack

- **Backend**: Fastify 5, TypeScript, Drizzle ORM, Postgres 16
- **Frontend**: React 18, Vite 8, TypeScript, React Router 6
- **Auth**: AWS Cognito User Pools — `InitiateAuth` (USER_PASSWORD_AUTH) on login; Cognito AccessToken stored in httpOnly `session` cookie; JWKS verification on each request via `jose`
- **Testing**: Vitest (unit + integration), Playwright (E2E)
- **Infra**: AWS CDK v2 (synth-only), LocalStack (S3 + SES only)

## Architecture patterns

The API follows a strict three-layer pattern:
1. **Routes** (`apps/api/src/routes/`) — HTTP only: parse → call service → respond
2. **Services** (`apps/api/src/services/`) — business logic
3. **Repositories** (`apps/api/src/repositories/`) — Drizzle queries only

**Shared types**: `packages/shared-types/` exports Zod schemas. Both the API (for validation) and the web (for typed fetch calls) import from here. Never duplicate type definitions.

## Running locally

**Cohort participant** — you received credentials and `.env` values from your facilitator:
```bash
cp .env.cohort.example .env   # then fill in COGNITO_USER_POOL_ID + COGNITO_CLIENT_ID
./scripts/bootstrap.sh
npm run dev
```
Log in at http://localhost:5173 with the credentials your facilitator provided. Your local DB user is created automatically on first login — no extra steps.

**Local dev / contributor** — you manage your own Cognito User Pool:
```bash
cp .env.example .env          # then follow docs/boot-camp/cognito-setup.md
./scripts/bootstrap.sh
./scripts/seed-cognito.sh     # creates participant@example.com + admin@example.com
npm run dev
```
Login: `participant@example.com` / `Bootcamp1!`

## Skills available

| Skill | Purpose |
|-------|---------|
| `/implement <ticket>` | Full end-to-end workflow orchestrator |
| `/continue` | Resume a paused workflow |
| `/requirements <ticket>` | Extract requirements from a ticket |
| `/plan` | Generate implementation plan from requirements |
| `/implement-code` | Implement tasks from the plan |
| `/post-checks` | Run post-implementation verification |
| `/create-prs` | Push branches and open pull requests |
| `/pr-review-backend` | Review a backend pull request |
| `/pr-review-frontend` | Review a frontend pull request |

## Workflow for exercises

1. `git checkout claude-harness-v1.0.1 && git checkout -b participant/<name>/NN-exercise`
2. Read `docs/boot-camp/exercises/NN-<name>/feature-brief.md`
3. Run `/implement BOOTCAMP-N`
4. PR targets `solutions/NN-<name>` — **never main**

## Commit format

```
BOOTCAMP-N: descriptive message
```

## Environment & Setup

**Node version**: Frontend vitest tests require **Node 24** (not Node 18) due to a Fastify 5 / test-runner incompatibility. Switch with `nvm use 24` before running tests. Check your version with `node --version`.

## Git workflow

**Never push directly to main.** When resolving PR conflicts, merge `main` INTO the PR branch — confirm the direction with Claude before any rebase/merge that touches main. Verify the planned git commands before executing.

After any `git rebase` or `git stash pop`, verify the working tree still contains all intended changes before continuing (re-run the build or diff against the expected files). Stash conflicts can silently drop hunks — a Cancel button disappeared in production this way.

## Testing

After implementing any feature, run the full test suite (vitest + Playwright) and fix any pre-existing skeleton tests that assert placeholder text like "Coming soon" before considering the task done. Tests must pass cleanly across two consecutive runs to surface test-isolation or state-pollution bugs.

**Playwright E2E tests:**
- Always use retrying `expect()` assertions (never one-shot `isVisible()` checks) — one-shot checks fire during loading states and produce false negatives
- Ensure each test cleans up created DB state (bookings, rooms, users) to avoid test-pollution that breaks other specs
- Use `.first()` or index-based selectors carefully; they fail when previous tests leave state in the database

**Vitest unit/integration tests:**
- Fix stale skeleton assertions (e.g., "Coming soon" placeholder text) when implementing features that replace that UI
- Use Node 24 to avoid Fastify 5 test-runner incompatibilities

## Backend / Database Conventions

**Drizzle null-guards**: Always null-guard the result of `.returning()` before accessing fields. The query may return an empty result on constraint violations or concurrent deletes.

**Foreign-key handling**: When deleting a parent record (e.g., a room), add cascade-delete handling for child records (e.g., bookings). Check FK constraints in the schema and either cascade-delete or return a 409 Conflict error with a clear message.

## Review rules

Rule files in `.claude/rules/` auto-load when Claude edits matching files:
- `backend-lang.md` — loads for any `apps/api/**/*.ts` file
- `frontend-lang.md` — loads for any `apps/web/**/*.ts` or `.tsx` file
- `security.md` — loads for any file in `apps/api/**` or `apps/web/**`
- `general-quality.md` — loads for all files
- `testing-standards.md` — loads for all files

Severity: `blocker` → must fix before merge. `suggestion` → should fix. `nit` → optional.
