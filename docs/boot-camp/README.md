# Boot Camp — Participant Guide

Welcome. This guide explains how the boot camp works and how to start an exercise.

## The goal

By the end of this boot camp you'll know how to use Claude Code to build a feature end-to-end: from a ticket, through planning and implementation, to a pull request that passes automated review.

## How exercises work

1. **Choose an exercise** from the list below.
2. **Create your branch** from the scaffold tag:
   ```bash
   git checkout claude-harness-v1.0.1
   git checkout -b participant/<your-name>/NN-exercise-name
   ```
3. **Read the feature brief** in `docs/boot-camp/exercises/NN-<name>/feature-brief.md`.
4. **Run `/implement BOOTCAMP-N`** — Claude will walk you through requirements, planning, and implementation.
5. **Submit a PR** against `solutions/NN-<name>` (not `main`).
6. **Commit all the files created in the executions folder and the insights file** generated during the session.

## The exercises

| # | Name | What you'll build | Difficulty |
|---|------|-------------------|------------|
| 1 | cancel-booking | Let users cancel a confirmed booking | Medium |
| 2 | modify-booking-dates | Edit dates on a confirmed booking | Medium |
| 3 | admin-pages | Admin dashboard for rooms, users, and bookings | Hard |
| 4 | activity-log | Timeline of all changes to a booking | Medium |
| 5 | email-notifications | Confirmation emails on book/cancel | Hard |
| 6 | room-reviews | Ratings + reviews after a stay | Advanced |
| 7 | room-favorites | Save rooms for later / wishlist | Medium |

## Before you start

- Read [`architecture.md`](./architecture.md) — understand the project structure first.
- Read [`participant-workflow.md`](./participant-workflow.md) — detailed walkthrough of `/implement` → E2E tests → PR.
- Read [`review-checklist.md`](./review-checklist.md) — know what reviewers will check.

## Useful commands

```bash
npm run dev                   # Start the full app
npm run test                  # Unit tests
npm run test:e2e              # Browser tests (Playwright)
./scripts/db-reset.sh         # Reset DB to a clean state
```
