# superpowers:writing-plans Skill

This skill generates comprehensive implementation plans with explicit task Interfaces, bite-sized checkboxes, and TDD enforcement.

## When to use

When `/implement` reaches the PLANNING phase after clarifications are resolved:

```bash
/implement BOOTCAMP-N
# ... reaches PLANNING phase
# Automatically invokes superpowers:writing-plans
```

## What it does

Generates detailed implementation plans with:
1. **Task Interfaces** — Explicit Consumes/Produces for each task
2. **Checkboxes** — Step-by-step tracking (- [ ] syntax)
3. **TDD Structure** — Stubs → Tests Red → Logic Green
4. **Cross-Repo Contracts** — Clear API/DTO boundaries

## Output format

Plans are saved to:
- **Canonical**: `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- **Execution folder**: `docs/execution/<TICKET>-*/implementation-plan.md` (for continuity)

## Example plan structure

```
### Task 1: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Interfaces:**
- Consumes: [what this task uses from earlier tasks]
- Produces: [what later tasks rely on]

- [ ] Step 1: [Action]
- [ ] Step 2: [Action]
- [ ] Step 3: Commit
```

## Expected outcomes

- **Task count**: 8–15 per feature (vs previous 2–3)
- **Task clarity**: Explicit Consumes/Produces prevent surprises
- **Progress tracking**: Checkboxes show which steps are done
- **Test-first discipline**: TDD structure enforced from the start
