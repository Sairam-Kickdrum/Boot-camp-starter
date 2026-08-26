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
For each affected app (`apps/api`, `apps/web`), read its CLAUDE.md (if present) for any app-specific testing and code quality notes, in addition to the commands below.

### 4. Run Backend Checks
Run tests and code quality checks for `apps/api` ONLY (requires **Node 24** — `nvm use 24` first):
```bash
nvm use 24
npm run typecheck --workspace=apps/api
npm run test --workspace=apps/api
```
Static analysis and formatting are repo-wide (see step 6) — do not run `npm run lint`/`npm run format:check` from this step; note affected backend files for the repo-wide pass instead.

### 5. Run Frontend Checks
Run checks for `apps/web` ONLY (requires **Node 24** — `nvm use 24` first):
```bash
nvm use 24
npm run typecheck --workspace=apps/web
npm run test --workspace=apps/web
npm run build --workspace=apps/web
```
Static analysis and formatting are repo-wide (see step 6) — do not run `npm run lint`/`npm run format:check` from this step; note affected frontend files for the repo-wide pass instead.

### 6. Run Repo-Wide Lint / Format (affected files only)
`eslint`/`prettier` are configured at the repo root, not per-workspace. Run them scoped to the files actually changed — never the full-project command:
```bash
npx eslint <changed-file-1> <changed-file-2> ...
npx prettier --check <changed-file-1> <changed-file-2> ...
```

### 7. Run Ops Validation (if applicable)
Validate any modified infrastructure files under `infra/cdk` (`npm run cdk:synth`) or `docker-compose.yml`.

### 8. Generate Verification Summary
Cover: services/apps tested, test results, code quality results, build results, warnings.

### 9. Update Execution State
- All pass: set status to `CHECKS_COMPLETE`
- Any fail: set status to `CHECKS_FAILED` and log failures

## Rules
- Only test affected services/apps — not the full suite
- Report failures clearly with file paths, test names, error messages
- Do NOT modify code in this step — only check and report
- If checks fail, inform the user and wait for instructions
