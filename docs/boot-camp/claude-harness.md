# Claude Code Harness — `.claude/` Reference

This document explains every file in the `.claude/` directory: what it does, when it activates, and how the pieces fit together.

---

## Overview

The `.claude/` folder is a **harness** that shapes how Claude Code behaves in this repository. It has three types of files:

| Type | Location | How it activates |
|------|----------|-----------------|
| **Skills** | `.claude/skills/*/SKILL.md` | You type `/skill-name` in the prompt |
| **Agents** | `.claude/agents/*.md` | Skills spawn them automatically |
| **Rules** | `.claude/rules/*.md` | Auto-loaded when Claude edits matching files |

The overall goal: turn a one-line prompt like `/implement BOOTCAMP-3` into a structured, repeatable workflow — requirements → clarifications → plan → code → tests → PR — with consistent code quality enforced at every step.

---

## Skills

Skills are slash commands. You type them; Claude executes a defined workflow.

---

### `/implement <ticket-id>`

**File**: `.claude/skills/implement/SKILL.md`

The **top-level orchestrator**. You will use this skill for every exercise.

It drives the full development lifecycle end-to-end:

```
/implement BOOTCAMP-3
  ↓
1. REQUIREMENTS   — extracts what needs to be built
2. CLARIFICATIONS — surfaces unknowns, waits for your answers
3. PLAN           — designs the implementation task list
4. EXECUTION_SETUP — creates execution tracking artifacts
5. IMPLEMENTATION  — spawns agents to write the code
6. POST_CHECKS     — runs tests, typecheck, lint
7. UPDATE_DOCS     — updates CLAUDE.md files
8. CREATE_PRS      — pushes branches, opens pull requests
```

Each phase updates an `execution-state.md` file so that if the session is interrupted, the workflow can resume from exactly where it left off. You never lose progress.

**Key behaviour:**
- Pauses at CLARIFICATIONS — you must answer questions before it continues
- Pauses at PLAN — you must approve the plan before any code is written
- Each step transitions state before stopping so `/continue` always knows where to pick up

---

### `/continue`

**File**: `.claude/skills/continue/SKILL.md`

Resumes the most recent paused workflow. It searches `docs/execution/*/execution-state.md` for the latest state file and jumps to whatever phase was recorded.

Use this when:
- You closed and reopened your terminal
- A session expired mid-workflow
- You ran `/implement` and paused at clarifications or plan approval

---

### `/requirements <ticket-id>`

**File**: `.claude/skills/requirements/SKILL.md`

**Phase 1 of the workflow** (also callable standalone).

Reads the ticket and extracts structured requirements into two files inside `docs/execution/{TICKET_ID}-{slug}/`:

- `requirements.md` — functional requirements, acceptance criteria, scope boundaries, affected layers (BE/FE/DB)
- `clarifications.md` — open questions that need answers before planning can start

If the ticket is clear enough, `clarifications.md` may be empty and you can skip straight to `/plan`.

---

### `/plan`

**File**: `.claude/skills/plan/SKILL.md`

**Phase 3 of the workflow** (also callable standalone).

Reads the finalized `requirements.md` and explores the codebase to produce `implementation-plan.md` — a sequenced task list with:
- Which layer each task lives in (BE / FE / shared-types / DB migration)
- File paths to create or modify
- Cross-layer contracts (e.g., "BE must return X before FE can render Y")
- Estimated complexity

Claude presents the plan and waits for your approval before any code is written. This is the gate that prevents AI from building the wrong thing.

---

### `/implement-code`

**File**: `.claude/skills/implement-code/SKILL.md`

**Phase 5 of the workflow** (also callable standalone after a plan is approved).

Reads the approved `implementation-plan.md` and `execution-state.md`, then spawns specialized sub-agents (see Agents below) to implement each task. Tasks are worked in sequence; each agent commits after completing its task and marks it done in `execution-state.md`.

If a task fails, it is logged and the workflow continues with the next task rather than halting everything.

---

### `/post-checks`

**File**: `.claude/skills/post-checks/SKILL.md`

**Phase 6 of the workflow** (also callable standalone).

Runs verification across all affected workspaces:

- `npm run typecheck` — TypeScript must compile cleanly
- `npm run lint` — ESLint must pass with zero warnings
- `npm test` — Vitest unit tests must pass
- `npm run test:e2e` — Playwright E2E tests (if applicable)
- `npm run build` — production build must succeed

Reports pass/fail per check. Any blocker failures must be resolved before proceeding to PRs.

---

### `/create-prs`

**File**: `.claude/skills/create-prs/SKILL.md`

**Phase 8 of the workflow** (also callable standalone).

For each feature branch created during implementation:
- Pushes the branch to the remote
- Opens a GitHub pull request with a generated title and description
- PR description includes: summary of changes, test plan, link back to the ticket
- PRs target the correct base branch (never `main` directly — always `solutions/NN-name` for exercises)

Returns the PR URLs so you can share them for review.

---

### `/pr-review-backend <pr-url-or-number>`

**File**: `.claude/skills/pr-review-backend/SKILL.md`

Reviews a backend pull request. It:
1. Fetches the PR diff via GitHub CLI
2. Reads all modified files in full for context
3. Loads the applicable rules from `.claude/rules/` (always: `general-quality.md`, `security.md`, `testing-standards.md`; for backend: `backend-lang.md`, `backend-migrations.md`, `backend-testing.md`)
4. Analyses the diff against every rule
5. Posts inline comments on the PR — blockers, warnings, and nits — with rule references

The review is rule-driven, not opinion-driven. Every finding cites the specific rule it violates.

---

### `/pr-review-frontend <pr-url-or-number>`

**File**: `.claude/skills/pr-review-frontend/SKILL.md`

Same as `pr-review-backend` but loads frontend rules: `frontend-lang.md`, `frontend-state.md`, plus the shared rules.

---

### `/clarifications`

**File**: `.claude/skills/clarifications/SKILL.md`

Run this after you have manually filled in answers in `clarifications.md`. It:
1. Reads your answers
2. Validates all questions are answered
3. Merges the answers back into `requirements.md`
4. Closes open questions; adds new ones if answers revealed new unknowns
5. Tells you whether to proceed to `/plan` or answer more questions

---

### `/execution-setup`

**File**: `.claude/skills/execution-setup/SKILL.md`

**Phase 4** — sets up execution tracking from an approved plan. Creates the `execution-state.md` checklist with all tasks from `implementation-plan.md` and (if a Linear/Jira MCP is connected) creates subtasks in the ticket tracker.

Usually called automatically by `/implement` after plan approval. You would call it manually if you approved a plan in one session and want to start implementation in a new one.

---

### `/update-claude-md`

**File**: `.claude/skills/update-claude-md/SKILL.md`

**Phase 7** — after implementation is approved, updates `CLAUDE.md` files to document new patterns introduced by the feature: new endpoints, new env vars, new conventions, new migration patterns.

Proposes changes before applying them and only updates files relevant to what changed. It never removes existing content — only adds or modifies.

---

### `/audit-claude-md`

**File**: `.claude/skills/audit-claude-md/SKILL.md`

A **periodic maintenance** skill (not part of the regular feature workflow). Run it after a batch of features ship to:
- Verify all file paths referenced in CLAUDE.md files still exist
- Confirm documented patterns match the actual codebase
- Remove stale content and de-duplicate sections across files
- Report lines-before/after per file

Recommended cadence: after every 5–10 exercises, or when CLAUDE.md files start feeling out of date.

---

### `/backend-test`

**File**: `.claude/skills/backend-test/SKILL.md`

Writes Vitest integration tests for backend services. Reads existing test files for patterns before writing new ones. Tests use real database connections (no mocks for DB), mock only external HTTP/service clients, and assert both response shape and database state.

---

### `/frontend-test`

**File**: `.claude/skills/frontend-test/SKILL.md`

Writes unit tests for frontend components and hooks. Mocks the API layer (`src/lib/api/`), covers happy path + error states + loading states, and tests user-visible behaviour rather than implementation details.

---

## Agents

Agents are **sub-processes** that skills spawn to do focused work. You never call them directly — `/implement-code` (and by extension `/implement`) dispatches them.

Each agent is scoped to a specific layer and has its own instruction set, keeping its context clean and its output consistent.

---

### `backend-implementer`

**File**: `.claude/agents/backend-implementer.md`

Implements backend tasks from the approved plan. Before writing any code it reads:
- `apps/api/CLAUDE.md` — architecture, conventions, auth patterns
- Existing code in the service — to match established patterns

After each task it:
1. Runs `npm run typecheck --workspace=apps/api`
2. Runs `npm run lint`
3. Runs relevant tests
4. Creates one commit (format: `BOOTCAMP-N: description`)
5. Reports: task number, files changed, commit hash, any issues

Rules it follows: BE-01 through BE-08 from `backend-lang.md`, all security rules, all testing standards.

---

### `frontend-implementer`

**File**: `.claude/agents/frontend-implementer.md`

Implements frontend tasks from the approved plan. Before writing any code it reads:
- `apps/web/CLAUDE.md` — component patterns, state management, API layer
- Existing components and hooks — to match established patterns

After each task it:
1. Runs `npm run typecheck --workspace=apps/web`
2. Runs `npm run lint`
3. Creates one commit

If a task references a Figma design, it uses Figma MCP to fetch the design spec before implementing. All new interactive elements must have `data-testid` attributes (FE-02 is a blocker).

---

### `code-reviewer`

**File**: `.claude/agents/code-reviewer.md`

A senior code reviewer that analyses diffs against the rule files. Used internally by the PR review skills.

It loads rules dynamically based on what files were changed:
- Always: `general-quality.md`, `security.md`, `testing-standards.md`
- For `apps/api/**`: `backend-lang.md`, `backend-migrations.md`, `backend-testing.md`
- For `apps/web/**`: `frontend-lang.md`, `frontend-state.md`
- For infra files: `ops-infra.md`

Findings are categorised by severity:
- **BLOCKER** — must fix before merge (maps to `<!-- severity: blocker -->`)
- **WARNING** — should fix (maps to `suggestion`)
- **NOTE** — optional improvement (maps to `nit`)

---

### `test-writer`

**File**: `.claude/agents/test-writer.md`

Writes tests for recently implemented code. Reads the execution state and git diff to understand what was built, then finds existing test files in the same workspace to follow established patterns.

For backend: integration tests with real DB, mock only external clients, assert response + DB state.
For frontend: component/hook unit tests, mock the API layer, cover loading/error/data states.

---

## Rules

Rules are **auto-loaded coding standards**. When Claude edits a file that matches a rule's `paths` pattern, the rule is automatically added to Claude's context — you don't need to ask for it.

Each rule has individual entries tagged with a severity:
- `<!-- severity: blocker -->` — violation must be fixed before merge
- `<!-- severity: suggestion -->` — should be fixed
- `<!-- severity: nit -->` — optional, minor improvement

---

### `backend-lang.md`

**Activates for**: `apps/api/**/*.ts`

The core backend coding standards for this repo:

| Rule | What it enforces |
|------|-----------------|
| BE-01 | Three-layer architecture — routes → services → repositories, no skipping layers |
| BE-02 | Always throw `AppError` subclasses, never raw `Error`; let errors propagate |
| BE-03 | Every protected route needs `preHandler: [app.requireAuth]`; never decode the cookie manually |
| BE-04 | Validate all input with Zod schemas from `@boot-camp/shared-types` at the top of route handlers |
| BE-05 | Request/response shapes live in `packages/shared-types/`, never duplicated locally |
| BE-06 | Use `request.log` / `app.log` for Pino logging; correct log levels |
| BE-07 | Service methods under 30 lines; repository methods are Drizzle-only with no business logic |
| BE-08 | Commit format: `BOOTCAMP-N: description` |

---

### `frontend-lang.md`

**Activates for**: `apps/web/**/*.ts`, `apps/web/**/*.tsx`

The core frontend coding standards:

| Rule | What it enforces |
|------|-----------------|
| FE-01 | Functional components only; reusable pieces in `src/components/`, page-specific co-located |
| FE-02 | **Every interactive element and key data display must have `data-testid`** — Playwright depends on these |
| FE-03 | Never call `fetch` directly — always use `src/lib/api/*.ts` typed functions |
| FE-04 | Form validation uses the same Zod schemas as the backend, imported from `@boot-camp/shared-types` |
| FE-05 | Every data-fetching component handles loading, error, and empty states |
| FE-06 | Use `@/` path alias for imports from `src/` |
| FE-07 | Commit format: `BOOTCAMP-N: description` |

---

### `security.md`

**Activates for**: `apps/api/**`, `apps/web/**`

Security rules that apply to both frontend and backend:

| Rule | What it enforces |
|------|-----------------|
| SEC-01 | Every new API endpoint requires auth unless explicitly public |
| SEC-02 | Ownership checks — verify the requesting user owns the resource before modifying it |
| SEC-03 | All user input (body, params, query) must be validated before use |
| SEC-04 | DB queries must use Drizzle ORM — no string concatenation with user input |
| SEC-05 | No hardcoded secrets, API keys, or tokens anywhere in source code |
| SEC-06 | User-supplied content rendered in the UI must go through React's default escaping |
| SEC-07 | API responses must not include sensitive fields unnecessarily |
| SEC-08 | CORS must not be widened accidentally |
| SEC-09 | File uploads require type validation, size limits, and safe storage |
| SEC-10 | Expensive/public endpoints (login, search) should have rate limiting |
| SEC-P1 | The Cognito AccessToken in the `session` httpOnly cookie is the **only** accepted auth credential |
| SEC-P2 | Never log session tokens, Cognito tokens, passwords, or any cookie value |
| SEC-P3 | Role checks via `requireRole('admin')` preHandler — not inline `if` statements |
| SEC-P4 | Ownership checks before any mutation — `ForbiddenError` (not `NotFoundError`) when the resource exists but belongs to another user |

---

### `general-quality.md`

**Activates for**: all files

Cross-cutting quality rules that apply to every change:

| Rule | What it enforces |
|------|-----------------|
| GEN-01 | Appropriate error handling on all new code paths |
| GEN-02 | Log significant operations at the right level |
| GEN-03 | Descriptive naming; booleans read as predicates (`isActive`, `hasPermission`) |
| GEN-04 | No dead code, unused imports, or commented-out blocks |
| GEN-05 | No magic numbers or hardcoded strings — extract to constants or env vars |
| GEN-06 | Flag duplication; suggest extracting shared utilities |
| GEN-07 | **If API response/request shape changes, all consumers must be updated** |
| GEN-08 | Handle null/undefined explicitly; no silent undefined access |
| GEN-09 | TODOs must include a ticket ID — no context-free TODO comments |
| GEN-10 | Commit message format must match `BOOTCAMP-N: description` |

---

### `testing-standards.md`

**Activates for**: all files

Testing requirements that apply regardless of layer:

| Rule | What it enforces |
|------|-----------------|
| TEST-01 | New business logic must have tests (service methods, hooks, utilities) |
| TEST-02 | Tests must cover unhappy paths, edge cases, and boundaries — not just happy path |
| TEST-03 | Test names describe scenario + expected outcome, not just the method name |
| TEST-04 | Mock external boundaries only (DB, APIs, filesystem) — not internal classes |
| TEST-05 | Test data via builders/factories — no large inline construction blocks |
| TEST-06 | Tests must have meaningful assertions, not just "no exception thrown" |
| TEST-07 | Integration tests must be isolated — no shared mutable state between tests |
| TEST-08 | New or modified API endpoints need integration tests for contract, status codes, and auth |
| TEST-09 | New non-trivial frontend components need tests for user-visible behaviour |
| TEST-10 | Snapshot tests for stable components only — not large pages that change frequently |

---

### `backend-migrations.md`

**Activates for**: migration files (configured for Drizzle SQL migrations)

| Rule | What it enforces |
|------|-----------------|
| Versioning | Sequential migration numbers; check the latest before creating a new one |
| Immutability | Never modify an applied migration — always create a new one |
| Safety | Test migrations locally before committing |

---

### `backend-testing.md`

**Activates for**: backend test files

Patterns for backend tests in this repo:
- Integration tests connect to the real Docker Postgres database
- Mock only external service clients (e.g., AWS SDK, SMTP)
- Assert both the HTTP response shape AND the resulting database state
- Run only tests for files you changed — never the full suite on every edit

---

### `frontend-state.md`

**Activates for**: state management files (`src/store/**`)

Documents the project's API/state layer conventions: how to structure API service hooks, cache invalidation patterns, and local state slices. Currently a template — gets filled in as exercises add state management patterns.

---

### `ops-infra.md`

**Activates for**: infrastructure and ops files

Covers Helm charts, Terraform, Kubernetes manifests, and Docker. Rules include: Helm lint must pass, secrets must not be hardcoded in manifests, Terraform must not destroy stateful resources without explicit confirmation, Kubernetes deployments need resource limits and health probes.

Not relevant for local development exercises — becomes relevant for exercises touching `infra/cdk/` or deployment configuration.

---

## How It All Fits Together

```
You type:  /implement BOOTCAMP-3
                │
                ▼
     [implement skill]  ←── orchestrates everything
                │
    ┌───────────┼───────────────────────┐
    │           │                       │
    ▼           ▼                       ▼
[requirements] [plan]           [implement-code]
    skill       skill                 skill
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼              ▼
                   [backend-        [frontend-    [test-
                   implementer]     implementer]  writer]
                   agent            agent          agent
                          │
                          ▼
                   Auto-loads rules
                   for files it edits:
                   backend-lang.md
                   security.md
                   general-quality.md
                   testing-standards.md
                          │
                          ▼
                [post-checks skill]
                [update-claude-md skill]
                [create-prs skill]
```

Rules run silently in the background — every time an agent writes a `.ts` file in `apps/api/`, the backend and security rules are in its context. You don't need to ask for a review; the constraints are always active.
