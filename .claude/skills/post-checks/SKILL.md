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
This is a single repo (`apps/api` is the only backend workspace) — run its checks with `--workspace=apps/api`
so an unrelated `apps/web` failure doesn't block a backend-only change:
```bash
nvm use 24   # Fastify 5 + Vitest needs Node 24, not the repo default of 20
npm run typecheck --workspace=apps/api
npm run lint -- apps/api          # eslint . --ext .ts,.tsx --max-warnings 0, scoped to the changed workspace
npm run format:check
npm test --workspace=apps/api     # vitest run --passWithNoTests
```

### 5. Run Frontend Checks
```bash
nvm use 24
npm run typecheck --workspace=apps/web
npm run lint -- apps/web
npm run format:check
npm test --workspace=apps/web     # vitest run --passWithNoTests
npm run build --workspace=apps/web
```

### 6. Run E2E and Infra Checks (if applicable)
If the ticket touched the booking flow, also run the Playwright suite:
```bash
npm run test:e2e
```
If the ticket touched `infra/cdk/**`, verify the stack still synths (synth-only in v1 — no deploy):
```bash
npm run cdk:synth
```

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
