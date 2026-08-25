> **For participants:** This plan describes the target architecture. Your job is to implement it following the existing patterns in the codebase.

# Architecture Plan: Email Notifications

**Status:** Final
**Feature:** BOOTCAMP-5
**Tier:** Standard (AI-SDLC Mode 2)
**Author:** Boot Camp Facilitator
**Date:** 2026-06-04
**Parent feature branch:** `solutions/05-email-notifications` (reference); participants use `participant/<name>/05-email-notifications`

---

## Approach Summary

Add a fire-and-forget notification side effect to the two existing booking mutations: `POST /bookings` (create) and `POST /bookings/:id/cancel` (cancel).

A new Fastify plugin (`apps/api/src/plugins/mailer.ts`) wraps an SES client and decorates `app.mailer` using the same `fp` + `app.decorate` pattern as `plugins/db.ts`. A new `notifications` table + migration provides the idempotency and delivery log. A new `NotificationRepository` owns all Drizzle queries on that table. A new `NotificationService` handles the send lifecycle: idempotency check, SES send, exponential backoff retry, delivery log update. `BookingService` receives `NotificationService` via constructor injection and fires notifications after each successful DB mutation using `void ... .catch(...)`. No new endpoints, no frontend changes.

---

## Assumptions

| Assumption | What depends on it | Evidence |
|---|---|---|
| `plugins/db.ts` uses `fp(async (app) => { app.decorate(...) })` pattern | `mailerPlugin` follows the exact same skeleton | `apps/api/src/plugins/db.ts` lines 1–23 |
| Plugin registration order in `index.ts`: `db` → `auth` → routes | `mailerPlugin` inserts after `dbPlugin`, before routes | `apps/api/src/index.ts` lines 41–44 |
| `BookingService` constructor uses injected repos via `private readonly` params | `NotificationService` is added as a third constructor param using the same pattern | `apps/api/src/services/booking-service.ts` lines 5–10 |
| `buildService()` in `routes/bookings.ts` is the single instantiation site for `BookingService` | Only `buildService()` needs to be updated to inject `NotificationService` | `apps/api/src/routes/bookings.ts` lines 52–56 |
| LocalStack runs at `http://localhost:4566` with SES enabled | `mailerPlugin` points `AWS_ENDPOINT_URL` at LocalStack; no new docker-compose changes needed | `docker-compose.yml` — `SERVICES: s3,ses`, port `4566:4566` |
| `bookings.userId` links to `users.id`; `users.email` holds the recipient address | `NotificationService` can look up the user email for the `to` field | `db/schema/index.ts` — `users` table with `email` column; `bookings` table with `userId` FK |

All assumptions confirmed against the codebase — see Codebase Grounding Report below.

---

## Alternatives Considered

### 1. Queue-based async delivery (SQS / Bull / BullMQ)

Introduce a job queue: the booking mutation enqueues a job; a worker process dequeues and sends. Provides durable retry, backpressure, and job state visibility.

**Rejected.** Adds a second process (worker), a new infrastructure dependency (Redis or SQS in LocalStack), and significant local dev complexity. The teaching objectives — fire-and-forget, idempotency, retry, Fastify plugin pattern — are all achievable with in-process retry. Queue-based delivery is a v2 concern once the app scales beyond a single process.

### 2. Blocking send (await in the route handler or BookingService)

`await notificationService.sendBookingConfirmation(booking)` before returning the booking to the client. Simpler to reason about sequentially.

**Rejected.** Couples email delivery latency directly to API response time. If SES is slow (common on LocalStack cold start) the booking creation endpoint appears slow to the client. If SES throws, the booking — which already succeeded in the DB — would incorrectly return an error to the client. Fire-and-forget is the correct pattern for non-critical side effects that must not affect the primary operation.

---

## Services Affected

| Service / File | Change Type | Description |
|---|---|---|
| `db/schema/index.ts` | Extend | Add `notificationStatusEnum` and `notifications` table |
| `db/migrations/NNNN_add_notifications.sql` | New | Drizzle-generated migration for the `notifications` table |
| `db/migrations/NNNN_add_notifications.meta.json` | New | Drizzle migration metadata file |
| `apps/api/src/plugins/mailer.ts` | New | Fastify plugin — creates `SESClient`, decorates `app.mailer` using `fp` + `app.decorate` |
| `apps/api/src/repositories/notification-repository.ts` | New | `createIfNotExists`, `markSent`, `markFailed` — Drizzle queries on `notifications` table |
| `apps/api/src/services/notification-service.ts` | New | `sendBookingConfirmation()`, `sendBookingCancellation()`, internal retry logic |
| `apps/api/src/services/booking-service.ts` | Extend | Add `NotificationService` constructor param; fire fire-and-forget hooks after each DB mutation |
| `apps/api/src/routes/bookings.ts` | Extend | Update `buildService()` to instantiate and inject `NotificationService` |
| `apps/api/src/index.ts` | Extend | Register `mailerPlugin` after `dbPlugin`, before routes |
| `packages/shared-types/src/index.ts` | No change | Notification types are internal to the API; not shared with the frontend |

---

## Cross-Service Data Flows

### Booking creation with confirmation email

```
Client → POST /api/bookings
  → bookingRoutes handler (routes/bookings.ts)
  → BookingService.bookRoom(userId, request)
    → BookingRepository.create(...)            [DB write — returns booking row]
    void NotificationService
          .sendBookingConfirmation(booking)
          .catch(err => log.error(err))        [fire-and-forget — runs async]
  ← route returns 201 Booking to client

  [Background, non-blocking:]
  NotificationService.sendBookingConfirmation(booking)
    → NotificationRepository.createIfNotExists(idempotencyKey)
        → INSERT INTO notifications ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *
        → if conflict (duplicate): return early — no SES call made
    → SES.SendEmailCommand({ to, from, subject, body })
        → on transient error: retry up to 3× with 1s / 2s / 4s backoff
    → NotificationRepository.markSent(id)      [UPDATE status='sent', sent_at=now()]
        → on final failure: NotificationRepository.markFailed(id)
                            log.error(...)
```

### Booking cancellation with cancellation email

```
Client → POST /api/bookings/:id/cancel
  → bookingRoutes handler (routes/bookings.ts)
  → BookingService.cancelBooking(bookingId, userId)
    → BookingRepository.cancel(bookingId)      [DB write — returns updated booking row]
    void NotificationService
          .sendBookingCancellation(booking)
          .catch(err => log.error(err))        [fire-and-forget]
  ← route returns 200 Booking to client

  [Background — identical retry/idempotency flow as above]
```

---

## Component Design

### `apps/api/src/plugins/mailer.ts`

Follows the exact pattern of `plugins/db.ts`: uses `fastify-plugin` (`fp()`), reads env vars at registration time, creates the SES client, calls `app.decorate('mailer', sesClient)`.

```ts
// Shape — participants implement the body
declare module "fastify" {
  interface FastifyInstance {
    mailer: SESClient;
  }
}

export const mailerPlugin = fp(async (app) => {
  const client = new SESClient({
    region: process.env["AWS_REGION"] ?? "us-east-1",
    endpoint: process.env["AWS_ENDPOINT_URL"],   // undefined in prod; set for LocalStack
  });
  app.decorate("mailer", client);
  app.log.info("Mailer (SES) client registered");
});
```

**Environment variables required:**
- `AWS_REGION` — already in `.env` (default `us-east-1`)
- `AWS_ENDPOINT_URL` — set to `http://localhost:4566` in local `.env` for LocalStack
- `SES_FROM_EMAIL` — sender address; must be verified in LocalStack before first send

### `apps/api/src/repositories/notification-repository.ts`

Owns all Drizzle queries for the `notifications` table. Contains no business logic.

Key methods:
- `createIfNotExists(data)` — `INSERT ... ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`; returns the inserted row or `null` if it was a duplicate
- `markSent(id)` — `UPDATE notifications SET status='sent', sent_at=now() WHERE id=...`
- `markFailed(id)` — `UPDATE notifications SET status='failed' WHERE id=...`

### `apps/api/src/services/notification-service.ts`

Contains all sending logic. Receives `SESClient` and `NotificationRepository` in the constructor.

```ts
class NotificationService {
  constructor(
    private readonly mailer: SESClient,
    private readonly notificationRepo: NotificationRepository,
  ) {}

  async sendBookingConfirmation(booking: Booking): Promise<void> { ... }
  async sendBookingCancellation(booking: Booking): Promise<void> { ... }
  private async send(notification: NotificationRow, to: string, subject: string, body: string): Promise<void> { ... }
  private async sendWithRetry(command: SendEmailCommand, attempt: number): Promise<void> { ... }
}
```

**Retry pattern** (`sendWithRetry`):
- Maximum 3 attempts (attempt indices 0, 1, 2)
- Delay before attempt N (N > 0): `2^(N-1)` seconds → 1 s, 2 s, 4 s
- Only retries on transient errors (e.g., `ServiceUnavailable`, network errors); re-throws immediately on permanent errors (e.g., `MessageRejected`, `InvalidParameterValue`)
- Implemented as a recursive async function — no external retry library needed

### `apps/api/src/services/booking-service.ts` (modification)

Add `NotificationService` as a third constructor parameter. Fire notifications after each successful DB mutation using the fire-and-forget pattern:

```ts
// After bookingRepo.create(...) in bookRoom():
void this.notificationService.sendBookingConfirmation(booking).catch(err => {
  log.error(err, "Failed to send booking confirmation notification");
});

// After bookingRepo.cancel(...) in cancelBooking():
void this.notificationService.sendBookingCancellation(booking).catch(err => {
  log.error(err, "Failed to send booking cancellation notification");
});
```

### `apps/api/src/routes/bookings.ts` (modification)

Update `buildService()` to instantiate and inject `NotificationService`:

```ts
function buildService(app: FastifyInstance) {
  const bookingRepo = new BookingRepository(app.db);
  const roomRepo = new RoomRepository(app.db);
  const notificationRepo = new NotificationRepository(app.db);
  const notificationService = new NotificationService(app.mailer, notificationRepo);
  return new BookingService(bookingRepo, roomRepo, notificationService);
}
```

---

## Frontend Approach

None. This exercise has no frontend changes. Verification is entirely via Playwright polling the LocalStack SES inbox at `http://localhost:4566/_aws/ses`.

---

## Infrastructure Changes

### New `notifications` table (schema + migration)

Add to `db/schema/index.ts`:

```ts
export const notificationStatusEnum = pgEnum("notification_status", ["pending", "sent", "failed"]);

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  eventType: text("event_type").notNull(),          // 'booking_confirmed' | 'booking_cancelled'
  idempotencyKey: text("idempotency_key").notNull().unique(),
  status: notificationStatusEnum("status").notNull().default("pending"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
```

Generate and apply:
```bash
npm run db:generate   # creates new file in db/migrations/
npm run db:migrate    # applies to local Postgres
```

### LocalStack SES setup

LocalStack SES is already enabled in `docker-compose.yml` (`SERVICES: s3,ses`). Before the first send, the `SES_FROM_EMAIL` address must be verified:

```bash
aws ses verify-email-identity \
  --email-address "$SES_FROM_EMAIL" \
  --endpoint-url http://localhost:4566 \
  --region us-east-1
```

This is idempotent — safe to run on every bootstrap. The pattern mirrors `scripts/seed-cognito.sh`.

---

## Reuse Opportunities

| Pattern | Where it lives | How it applies here |
|---|---|---|
| `fp()` + `app.decorate()` plugin skeleton | `apps/api/src/plugins/db.ts` lines 1–23 | Copy exactly for `mailerPlugin` |
| Env var reading at plugin registration time | `apps/api/src/plugins/auth.ts` | Read `SES_FROM_EMAIL` at startup; throw if missing |
| Constructor injection of repositories | `apps/api/src/services/booking-service.ts` lines 5–10 | Add `NotificationService` as third param |
| `buildService()` factory | `apps/api/src/routes/bookings.ts` lines 52–56 | Add `NotificationRepository` + `NotificationService` instantiation |

---

## Codebase Grounding Report

| Claim | Result | Evidence |
|---|---|---|
| `plugins/db.ts` uses `fp()` + `app.decorate()` pattern | Confirmed | `apps/api/src/plugins/db.ts:12,19` — `export const dbPlugin = fp(async (app) => { ... app.decorate("db", db) })` |
| `plugins/auth.ts` uses `fp()` + `app.decorate()` pattern | Confirmed | `apps/api/src/plugins/auth.ts:30,31` — same structure |
| Plugin registration order in `index.ts` | Confirmed | `apps/api/src/index.ts:41–44` — `dbPlugin` then `authPlugin` then routes; `mailerPlugin` registers after `dbPlugin` before routes |
| `BookingService` constructor uses injected repos | Confirmed | `apps/api/src/services/booking-service.ts:7–10` — `constructor(private readonly bookingRepo, private readonly roomRepo)` |
| `buildService()` in `routes/bookings.ts` is the single instantiation site | Confirmed | `apps/api/src/routes/bookings.ts:52–56` — single `buildService()` function, no other call sites |
| LocalStack runs at `http://localhost:4566` with SES enabled | Confirmed | `docker-compose.yml` — `SERVICES: s3,ses`, port `4566:4566` |
| `bookings.id` is the FK target for `notifications.booking_id` | Confirmed | `db/schema/index.ts:40` — `id: uuid("id").primaryKey().defaultRandom()` on `bookings` table |
| No existing `notifications` table in schema | Confirmed | `db/schema/index.ts:1–59` — only `users`, `rooms`, `bookings` tables defined |
| `BookingService.bookRoom()` returns the created booking after DB write | Confirmed | `apps/api/src/services/booking-service.ts:20–42` — `bookRoom()` returns the created booking row; notification hook fires after `this.bookingRepo.create(...)` |

CG-11 (legacy service check): No legacy service references. This feature introduces new files and extends `BookingService` / `routes/bookings.ts` only.

---

## Open Questions

None.

---

## Validation

- [x] All sections complete
- [x] CG-11 clear — no legacy services
- [x] All assumptions confirmed against codebase
- [x] Alternatives documented with rationale
- [x] Reuse opportunities identified with file:line references
- [x] Component design grounded in codebase patterns
- [x] Both fire-and-forget call sites identified (bookRoom + cancelBooking)
- [x] Retry pattern specified (3 attempts, 1 s / 2 s / 4 s)
- [x] Idempotency mechanism specified (UNIQUE constraint + ON CONFLICT DO NOTHING)
- [x] Frontend approach explicitly stated (none)
