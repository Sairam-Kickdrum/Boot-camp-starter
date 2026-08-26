---
name: post-checks
description: Run post-implementation verification — tests, code quality, and build checks across affected repositories.
disable-model-invocation: true
---

# Post-Implementation Checks

Run targeted integration tests and verify the implementation across all affected repositories.

## Steps

### 1. Verify Completeness
Read `execution-state.md`. Check all tasks are complete. If any are incomplete or blocked, list them and ask the user how to proceed.

### 2. Verify New Tests Exist
Read the Testing Strategy from `implementation-plan.md`. Verify each planned test file was created. Note any missing tests.

### 3. Read Verification Commands
For each affected repository, read its CLAUDE.md for the testing and code quality commands.

### 4. Run Backend Checks
Backend is `apps/api` (Fastify + TypeScript). Run from the repo root — Node 24 is required
(`nvm use 24`) due to a Fastify 5 / test-runner incompatibility (see root `CLAUDE.md`):
```bash
npm run format:check                          # Prettier, whole repo (fast, safe to run in full)
npm run typecheck --workspace=apps/api         # tsc --noEmit
npm test --workspace=apps/api                  # vitest run
```

### 5. Run Frontend Checks
Frontend is `apps/web` (React + Vite + TypeScript). Run from the repo root — Node 24 required
here too:
```bash
npx eslint apps/web --ext .ts,.tsx --max-warnings 0   # lint, scoped to apps/web
npm run typecheck --workspace=apps/web                # tsc --noEmit
npm test --workspace=apps/web                         # vitest run
npm run build --workspace=apps/web                    # tsc && vite build
```

If E2E coverage is relevant to the change, also run Playwright's golden-path suite:
```bash
npm run test:e2e                # runs e2e/reference/booking-flow.spec.ts and any other specs
```
Playwright tests must clean up any DB state (bookings, rooms, users) they create — see root
`CLAUDE.md`'s Testing section. Run the suite twice in a row when in doubt about test-isolation bugs.

### 6. Run Ops Validation (if applicable)
Validate any modified infrastructure files (Helm charts, Terraform, YAML).

### 7. Generate Verification Summary
Cover: services/apps tested, test results, code quality results, build results, warnings.

### 8. Update Execution State
- All pass: set status to `CHECKS_COMPLETE`
- Any fail: set status to `CHECKS_FAILED` and log failures

## Rules
- Only test affected services/apps — not the full suite
- Report failures clearly with file paths, test names, error messages
- Do NOT modify code in this step — only check and report
- If checks fail, inform the user and wait for instructions
