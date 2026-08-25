# Systematic Debugging Wrapper Skill

This skill wraps `superpowers:systematic-debugging` with Boot Camp context.

## When to use

When POST_CHECKS or IMPLEMENTATION fails and user wants structured debugging:

```bash
/systematic-debugging "error message here"
```

## What it does

Guides user through 4-phase debugging:
1. Root cause investigation (trace error to source)
2. Confirmation (verify hypothesis with evidence)
3. Prevention (identify how to catch this sooner)
4. Fix & verification (apply fix + test 2×)

## Example bugs it helps debug

- Service uses old DTO (type mismatch)
- Test doesn't clean up state (flaky test)
- API contract drift (field name mismatch)
- Missing imports (type not found)

## How to resume after debugging

After user applies P4's recommended fix:

```bash
/implement TICKET
```

This resumes the workflow from the phase that failed.
