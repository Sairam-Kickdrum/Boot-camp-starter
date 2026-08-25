> **Reading order:** 01-feature-brief.md → 03-architecture-plan.md → this document.

# Scoping Doc: Email Notifications

**Feature:** BOOTCAMP-5
**Tier:** Standard (AI-SDLC Mode 2)
**Architecture Plan:** `docs/boot-camp/exercises/05-email-notifications/03-architecture-plan.md`
**Date:** 2026-06-04

---

## Feature Overview

Send a transactional confirmation email when a booking is created and a cancellation email when a booking is cancelled. Emails are delivered via AWS SES — LocalStack in local dev — with fire-and-forget dispatch, idempotent delivery via a `notifications` table, and up to 3 retry attempts with exponential backoff on transient SES failures.

---

## Split Rationale

The work is split at the infrastructure/integration boundary.

**BOOTCAMP-5-1** builds everything needed to SEND a notification — the SES plugin, `notifications` table schema + migration, `NotificationRepository` (idempotency check), and `NotificationService` (send + retry logic) — independently of any trigger. This ticket can be unit-tested in isolation against a mocked SES client and a test DB without touching any existing service.

**BOOTCAMP-5-2** connects the triggers: it wires `NotificationService` into `BookingService` via constructor injection and validates the full end-to-end flow with Playwright tests that poll the LocalStack SES inbox. It cannot start until BOOTCAMP-5-1 is merged and the `notifications` table is migrated.

This split gives participants a clean checkpoint after building the infrastructure layer before introducing side effects into existing service methods.

---

## Dependency Chain

```
BOOTCAMP-5 (Foundation Skeleton — notifications schema + migration + SES plugin registration)
    → BOOTCAMP-5-1 (Notification Infrastructure: repository + service + unit tests)
        → BOOTCAMP-5-2 (Booking Hooks + E2E Tests)
```

BOOTCAMP-5-1 depends on the skeleton (schema migrated, `app.mailer` registered). BOOTCAMP-5-2 depends on BOOTCAMP-5-1 (the `NotificationService` and `app.mailer` must exist).

---

## Ticket BOOTCAMP-5: Email Notifications (Foundation Skeleton + Feature Parent)

**Type:** Feature Parent + Skeleton
**Branch:** `participant/<your-name>/05-email-notifications`
**PR targets:** `solutions/05-email-notifications`
**Run first:** `/implement BOOTCAMP-5`
**Sub-tickets:** BOOTCAMP-5-1, BOOTCAMP-5-2

**Summary:** Automated confirmation and cancellation emails triggered as a fire-and-forget side effect of the booking lifecycle. Idempotent delivery via a `notifications` delivery log table. LocalStack SES for local dev. No new API endpoints. No UI changes.

**Context:** Email delivery is a non-critical side effect of two existing booking operations (`POST /bookings` and `POST /bookings/:id/cancel`). The API response is not affected by email delivery. Failure to send is logged but does not surface to the client. Participants learn the Fastify plugin pattern, constructor injection, fire-and-forget dispatch, idempotency via DB constraint, and in-process retry with exponential backoff.

### Foundation Skeleton Scope

The skeleton ticket delivers the shared infrastructure that both capability sub-tickets build on: the `notifications` DB schema and the `mailerPlugin` that registers `app.mailer`. It contains no service logic, no repository, and no wiring into `BookingService`.

| What | Where |
|---|---|
| `notifications` table definition | `db/schema/index.ts` |
| Drizzle migration | `db/migrations/` (generated) |
| `mailerPlugin` — registers `app.mailer` (`SESClient`) | `apps/api/src/plugins/mailer.ts` (new) |
| Plugin registration in `index.ts` | `apps/api/src/index.ts` |

**Table columns:** `id` (uuid, PK), `booking_id` (FK → `bookings.id`), `idempotency_key` (text, UNIQUE), `type` (enum: `booking_confirmed`, `booking_cancelled`), `status` (enum: `sent`, `failed`), `sent_at` (timestamp, nullable), `error_message` (text, nullable), `created_at` (timestamp, default now)

### Acceptance Criteria (Skeleton)

- [ ] AC-S1: `notifications` table is present in Postgres after `npm run db:migrate` with all required columns; the `idempotency_key` column has a `UNIQUE` constraint
- [ ] AC-S2: `mailerPlugin` registers `app.mailer` (an `SESClient` instance) using the same `fp` + `app.decorate` pattern as `apps/api/src/plugins/db.ts`; plugin is registered in `index.ts`
- [ ] AC-S3: `mailerPlugin` reads `AWS_REGION`, `AWS_ACCESS_KEY_ID`, and `AWS_SECRET_ACCESS_KEY` from env at registration time and throws with a descriptive message if any are missing
- [ ] AC-S4: App compiles and starts cleanly; `npm run db:migrate` runs without errors; no regressions on existing routes and tests
- [ ] AC-S5: PR opened into `solutions/05-email-notifications`

### After the skeleton PR merges

Create the BOOTCAMP-5-1 branch from the skeleton branch and begin building the notification repository and service. BOOTCAMP-5-2 starts after 5-1 merges.

### Reference Documents

- [01-feature-brief.md](./01-feature-brief.md) — Feature context and user stories
- [03-architecture-plan.md](./03-architecture-plan.md) — Email service and notification design

---

## Ticket BOOTCAMP-5-1: Email Notifications — Notification Infrastructure

**Type:** Capability
**Depends on:** BOOTCAMP-5 skeleton (`notifications` table migrated, `app.mailer` registered in `index.ts`)
**Parallel with:** None (BOOTCAMP-5-2 depends on this)
**Estimate:** 1–1.5 days

### Summary

Build the notification repository and service on top of the skeleton's infrastructure: `NotificationRepository` (idempotency check + delivery log updates) and `NotificationService` (send with 3-attempt exponential backoff retry). The `notifications` schema, migration, and `mailerPlugin` are provided by the skeleton. Does NOT yet wire notifications into `BookingService` — that is BOOTCAMP-5-2.

### Context — Where This Lives

- `apps/api/src/repositories/notification-repository.ts` — **new**
- `apps/api/src/services/notification-service.ts` — **new**
- `apps/api/src/plugins/mailer.ts` — **exists from skeleton** (provides `app.mailer`)
- `db/schema/index.ts` — **exists from skeleton** (`notifications` table already defined)
- `db/migrations/` — **exists from skeleton** (migration already applied)

### What the Participant Builds

After this ticket, `notificationService.sendBookingConfirmation(booking, email)` can be called directly — in a unit test or a manual script — and will:
1. Check the `notifications` table for an existing idempotency key
2. Send a plain-text email via SES (LocalStack in dev)
3. Retry up to 3 times with 1 s / 2 s / 4 s backoff on transient failure
4. Record `status = 'sent'` or `status = 'failed'` in the `notifications` table

`BookingService` is not modified by this ticket.

### Acceptance Criteria

- [ ] AC-1: `NotificationService.sendBookingConfirmation()` sends a plain-text email via `app.mailer` (SES) to the provided address
- [ ] AC-2: `NotificationService.sendBookingCancellation()` sends a plain-text cancellation email
- [ ] AC-3: If an SES call fails with a transient error, the service retries up to 3 times with delays of 1 s, 2 s, 4 s before giving up
- [ ] AC-4: Calling `send` with the same idempotency key twice does NOT trigger a second SES call — `NotificationRepository` detects the duplicate and returns early
- [ ] AC-5: After a successful send, `notifications.status = 'sent'` and `sent_at` is populated; after 3 exhausted retries, `status = 'failed'`
- [ ] AC-6: Unit tests cover: successful send (happy path), duplicate idempotency key (skip send), all 3 retries exhausted → `status = 'failed'`

### Existing System Behavior

Before this ticket (skeleton already provides):
- `notifications` table exists in Postgres with all required columns, enums, and `UNIQUE` constraint on `idempotency_key`
- `mailerPlugin` is registered; `app.mailer` (`SESClient`) is available on the Fastify instance

Still missing after skeleton:
- No `NotificationRepository` exists
- No `NotificationService` exists
- `BookingService` has no notification calls

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| `NotificationRepository` delivery log | `notifications` schema + migration (delivered by skeleton) |
| `NotificationService` with idempotency + retry | `mailerPlugin` registration (delivered by skeleton) |
| Unit tests for `NotificationService` | Email queue or worker process |
| | HTML email templates |
| | Notifications for date-change events (Exercise 02) |
| | Bounce / complaint webhook handling |
| | Wiring into `BookingService` (BOOTCAMP-5-2) |
| | Any frontend changes |

### Design Reference

- **Plugin pattern:** `apps/api/src/plugins/db.ts` — copy the `fp(async (app) => { ... app.decorate(...) })` skeleton exactly; declare the `FastifyInstance` augmentation with `mailer: SESClient` in the same file
- **Env var reading at startup:** `apps/api/src/plugins/auth.ts` — read `process.env["KEY"]` at plugin registration time; throw with a descriptive message if a required var is missing
- **Repository pattern:** `apps/api/src/repositories/booking-repository.ts` — each method contains only Drizzle query code; no business logic

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/05-email-notifications/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/05-email-notifications/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Ticket BOOTCAMP-5-2: Email Notifications — Booking Hooks & Tests

**Type:** Capability
**Depends on:** BOOTCAMP-5-1 (merged; `notifications` table migrated; `app.mailer` and `NotificationService` available)
**Parallel with:** None
**Estimate:** 1–1.5 days

### Summary

Wire `NotificationService` into `BookingService` via constructor injection. Fire a confirmation email (fire-and-forget) after `bookRoom()` succeeds and a cancellation email (fire-and-forget) after `cancelBooking()` succeeds. Write Playwright tests that poll the LocalStack SES inbox to verify delivery end-to-end.

### Context — Where This Lives

- `apps/api/src/services/booking-service.ts` — **extend** (add `NotificationService` constructor param; fire hooks after mutations)
- `apps/api/src/routes/bookings.ts` — **extend** (`buildService()` instantiates and injects `NotificationService`)
- `e2e/exercises/05-email-notifications.spec.ts` — **new** Playwright test

### What the Participant Builds

After booking a room or cancelling a booking, a plain-text email arrives in the LocalStack SES inbox. The Playwright test confirms this by polling `http://localhost:4566/_aws/ses` and asserting on the `to`, `subject`, and body of the received message. Email sending failure does not cause the booking API to return an error, but IS logged.

### Acceptance Criteria

- [ ] AC-1: `NotificationService` is injected into `BookingService` via constructor — not instantiated inside the service
- [ ] AC-2: After a successful `POST /bookings`, a confirmation email is dispatched fire-and-forget; `notifications.status = 'sent'` is recorded
- [ ] AC-3: After a successful `POST /bookings/:id/cancel`, a cancellation email is dispatched fire-and-forget; `notifications.status = 'sent'` is recorded
- [ ] AC-4: Email sending failure does NOT cause the booking API to return an error — the 201 / 200 response is unaffected
- [ ] AC-5: Email sending failure IS logged as an error (not silently swallowed)
- [ ] AC-6: Playwright test — book a room, poll LocalStack SES inbox, assert confirmation email arrives within 5 seconds
- [ ] AC-7: Playwright test — cancel that booking, poll LocalStack SES inbox, assert cancellation email arrives within 5 seconds
- [ ] AC-8: Double-cancelling a booking does NOT send a second cancellation email (idempotency enforced by BOOTCAMP-5-1)

### Existing System Behavior

- `BookingService.bookRoom()` — creates a booking and returns the DB row; confirmed at `apps/api/src/services/booking-service.ts:20`
- `BookingService.cancelBooking()` — cancels a booking and returns the updated row; added by Exercise 01
- `buildService()` — single instantiation point for `BookingService`; confirmed at `apps/api/src/routes/bookings.ts:52–56`
- LocalStack SES inbox: `GET http://localhost:4566/_aws/ses` returns all sent messages as JSON; usable from Playwright via `request.get()`

Neither `bookRoom()` nor `cancelBooking()` currently triggers any email or notification.

### Scope Boundaries

| In scope | Out of scope |
|---|---|
| Wire `NotificationService` into `BookingService` via constructor injection | New API endpoints |
| Fire-and-forget hook after `bookRoom()` | Frontend notification UI |
| Fire-and-forget hook after `cancelBooking()` | Email notifications for date-change events (Exercise 02) |
| Playwright e2e test polling LocalStack SES | Email notifications for admin actions (Exercise 03) |
| Error logging for failed sends | HTML email templates |
| | Unsubscribe or bounce handling |

### Design Reference

- **Fire-and-forget pattern:** `void asyncOperation().catch(err => log.error(err))` — the `void` keyword discards the promise; `.catch()` prevents an unhandled rejection. Do NOT `await` the notification call.
- **Constructor injection:** `apps/api/src/services/booking-service.ts:7–10` — add `NotificationService` as a third `private readonly` parameter
- **`buildService()` factory:** `apps/api/src/routes/bookings.ts:52–56` — instantiate `NotificationRepository` and `NotificationService` here, then pass to `BookingService`
- **LocalStack SES inbox:** `apiRequestContext.get('http://localhost:4566/_aws/ses')` in Playwright retrieves all sent messages; assert on `to`, `subject`, and body fields
- **Playwright polling:** because email delivery is async, use `expect.poll()` with a timeout rather than a fixed `sleep` after each booking action

### Open Questions

None.

### Reference Documents

Read these files before generating the implementation plan:

- `docs/boot-camp/exercises/05-email-notifications/01-feature-brief.md`
  Explains why the feature exists, the user problem it solves, and the intended UX. Read this
  to understand the design intent behind each acceptance criterion and avoid over-engineering
  or misinterpreting edge cases.

- `docs/boot-camp/exercises/05-email-notifications/03-architecture-plan.md`
  Documents the specific codebase patterns, service/repository extension points, and DB schema
  decisions chosen for this exercise. Read this to align the implementation plan with existing
  layers and avoid proposing alternative patterns the scaffold deliberately does not use.

---

## Estimated Total Effort

| Ticket | Estimate | Notes |
|---|---|---|
| BOOTCAMP-5: Foundation Skeleton | 0.25–0.5 days | `notifications` schema + migration + `mailerPlugin` registration |
| BOOTCAMP-5-1: Notification Infrastructure | 1–1.5 days | Repository + service + idempotency + retry + unit tests (schema/plugin from skeleton) |
| BOOTCAMP-5-2: Booking Hooks & Tests | 1–1.5 days | Wiring + Playwright e2e tests |
| **Total** | **~2.25–3.5 days** | Skeleton first; 5-1 and 5-2 sequential |

---

## Linear-Ready Trim Guidance

When creating Linear tickets from this scoping doc:

**Include in Linear:**
- Summary, Context, Acceptance Criteria, Scope Boundaries, Estimate, Depends on.

**Do NOT include in Linear** (stays in this doc and the architecture plan):
- File paths (`apps/api/src/plugins/mailer.ts`, etc.)
- Column names (`idempotency_key`, `notificationStatusEnum`)
- Method signatures (`createIfNotExists`, `markSent`)
- Retry delay formula and backoff implementation
- Import patterns and code snippets
- `buildService()` line numbers
