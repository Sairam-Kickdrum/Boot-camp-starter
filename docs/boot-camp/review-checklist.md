# Review Checklist

Use this before submitting your PR. Both human mentors and the automated `/pr-review-backend` and `/pr-review-frontend` skills check against these criteria.

Severity guide:
- **Blocker** — the PR will not be approved until this is fixed.
- **Suggestion** — should be fixed; mentor will discuss if not.
- **Nit** — minor style; fix it if you have time.

---

## Architecture

| Check | Severity |
|-------|----------|
| Route handlers only parse + call service + respond. No business logic in routes. | Blocker |
| Business logic is in a service method, not inline in the route | Blocker |
| Database queries are in a repository method, not in a service or route | Blocker |
| New request/response shapes are Zod schemas in `packages/shared-types` | Blocker |
| Frontend uses `lib/api/*.ts` functions — not `fetch` directly | Blocker |

## Authentication & Authorization

| Check | Severity |
|-------|----------|
| Every protected route has `preHandler: [app.requireAuth]` | Blocker |
| Resources that belong to a user are checked: `resource.userId === request.sessionUser.id` | Blocker |
| Admin-only operations use a role check (not just auth check) | Blocker |
| No auth tokens logged anywhere | Blocker |

## Validation & Error handling

| Check | Severity |
|-------|----------|
| Request body and query params validated with `Schema.parse()` at top of handler | Blocker |
| Errors thrown as `AppError` subclasses (`NotFoundError`, `ConflictError`, etc.) | Blocker |
| 404 vs 403 used correctly: 404 = "doesn't exist", 403 = "exists but not yours" | Suggestion |
| No raw `throw new Error(...)` in services or repositories | Blocker |

## Testing

| Check | Severity |
|-------|----------|
| New service method has a Vitest unit test covering the happy path | Suggestion |
| Unhappy paths tested (not-found, conflict, unauthorized) | Suggestion |
| Playwright E2E test covers the main user flow for the new feature | Suggestion |
| Tests clean up after themselves (no shared mutable state between test files) | Suggestion |

## Code quality

| Check | Severity |
|-------|----------|
| No `any` types — use inferred Drizzle/Zod types | Suggestion |
| Service methods are under 30 lines | Suggestion |
| All interactive UI elements have `data-testid` | Blocker |
| Loading + error + empty states handled in data-fetching components | Suggestion |
| No hardcoded secrets, passwords, or tokens | Blocker |
| No `console.log` in production code paths | Nit |

## Before submitting

Run these locally and make sure they pass:
```bash
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

If any of these fail, fix them before opening the PR — CI will block merge if they don't pass.
