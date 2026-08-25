> **Start here.** Read this document fully before opening any other file in this exercise.

# Feature Brief: Email Notifications

**Tier:** Standard (AI-SDLC Mode 2)
**Module:** Boot Camp Starter — Room Booking App
**Author (PM):** Boot Camp Facilitator
**Date:** 2026-06-04
**Linear Ticket:** BOOTCAMP-5
**Prototype:** Scaffold running at `http://localhost:5173/bookings`

---

## What

The system sends a transactional email when a booking is created or cancelled. A confirmation email is sent automatically after a successful `POST /bookings`. A cancellation email is sent automatically after a successful `POST /bookings/:id/cancel`. Both emails are fire-and-forget — the API response is not delayed by email delivery. Sending is idempotent: a `notifications` table with a `UNIQUE` constraint on an idempotency key prevents duplicate sends even if the same booking event fires twice.

---

## Who

**Primary:** Any authenticated user who creates or cancels a booking. The email is sent to that user's registered email address.

There is no new user-facing UI. The notification is a backend side effect — users receive emails but there is no inbox, notification bell, or delivery status panel in the app.

---

## Where

**Backend only.** The email is triggered as a side effect inside `BookingService` after a successful DB mutation. There is no new route, no new frontend screen, and no new API endpoint. The booking response is returned to the client before email delivery completes.

---

## Approach

A new Fastify plugin (`apps/api/src/plugins/mailer.ts`) wraps an SES client and decorates `app.mailer`, following the same `fp` + `app.decorate` pattern as `plugins/db.ts` and `plugins/auth.ts`.

A new `notifications` table acts as a delivery log. Before each send, the service inserts a record keyed on `${bookingId}:${eventType}`. If that key already exists, the send is skipped (idempotency). After a successful SES send the record is updated to `status = 'sent'`. Transient failures are retried up to three times with exponential backoff (1 s, 2 s, 4 s). A final failure sets `status = 'failed'` and logs the error, but does not throw — the booking operation has already completed successfully.

`BookingService` receives `NotificationService` via constructor injection. The notification fires with `void this.notificationService.send(...).catch(err => log.error(err))` after each successful DB mutation — this is the fire-and-forget pattern.

AWS SES is the email transport. In local dev, LocalStack emulates SES at `http://localhost:4566`. No real AWS account or real email delivery is needed for local development or e2e tests.

---

## What's New

- **New plugin?** Yes — `apps/api/src/plugins/mailer.ts` creates an `SESClient` and registers it as `app.mailer`.
- **New service?** Yes — `apps/api/src/services/notification-service.ts` implements `sendBookingConfirmation()` and `sendBookingCancellation()` with idempotency and retry.
- **New repository?** Yes — `apps/api/src/repositories/notification-repository.ts` wraps the `notifications` table for idempotency checks and delivery log updates.
- **New DB table + migration?** Yes — `notifications` table added to `db/schema/index.ts`; a Drizzle migration must be generated and applied.
- **Extends existing service?** Yes — `BookingService` gains a `NotificationService` dependency and fires notifications after `bookRoom()` and `cancelBooking()`.
- **New endpoints?** No.
- **Frontend changes?** No.
- **New infrastructure?** No — LocalStack is already running with SES enabled in `docker-compose.yml`. One new env var: `SES_FROM_EMAIL`.

---

## Prototype Reference

Run the scaffold locally:
```
http://localhost:5173/bookings
```

Create a booking or cancel an existing one. After this exercise, the participant's LocalStack SES inbox should contain the corresponding email.

To confirm SES is available before implementing:
```bash
aws --endpoint-url=http://localhost:4566 sesv2 list-email-identities --region us-east-1
```

The scaffold itself is the prototype — no separate prototype app exists for this exercise.

---

## Interaction Model

- **Interaction pattern:** Fire-and-forget side effect. No user interaction triggers the notification directly; it is a consequence of an existing user action (book or cancel).
- **State location:** Server-persisted — `notifications` table in Postgres; emails delivered via SES (LocalStack in dev).
- **Sync vs async:** Async — the API response does not wait for email delivery. The notification runs in the background after the DB mutation commits.
- **Conversation memory:** Not applicable.

---

## Confirmed Prototype Decisions

These behaviors are confirmed requirements, grounded in the existing scaffold:

- **Fire-and-forget pattern:** `void notificationService.send(...).catch(err => app.log.error(err))` — the booking API response does NOT block on email delivery. A slow or failing SES call does not affect the 2xx response the client receives.
- **Idempotency key format:** `${bookingId}:${eventType}` stored in `notifications.idempotency_key` with a `UNIQUE` constraint. A duplicate insert attempt is detected before the SES call is made, preventing double-sends even if the same booking event fires twice.
- **Retry policy:** 3 attempts total with delays of 1 s, 2 s, 4 s. Only transient infrastructure errors (network, SES throttling) are retried. A `status = 'failed'` row is written and an `app.log.error` is emitted on final failure — the booking itself is unaffected.
- **LocalStack SES for local dev:** `AWS_ENDPOINT_URL=http://localhost:4566` overrides the SES endpoint. LocalStack SES is already declared in `docker-compose.yml` under `SERVICES: s3,ses`. No real AWS account is required.
- **Plain text emails only:** HTML templates are out of scope for v1. Emails contain booking ID, room name, dates, and a confirmation or cancellation message in plain text.
- **No email for date-change events:** Exercise 02 modifies booking dates; email notification for that event is explicitly excluded from this exercise. Only `booking_created` and `booking_cancelled` events trigger emails.

---

## Excluded Prototype Features

- **HTML email templates** — plain text only for v1.
- **Email notifications for date-change events** — Exercise 02 modifies booking dates; notification for that event is deferred.
- **Unsubscribe mechanism** — no opt-out or preference center in v1.
- **Bounce and complaint handling** — SES bounce/complaint webhooks are out of scope.
- **Email verification on user signup** — Cognito handles this separately; not part of this exercise.
- **SQS/SNS queue-based delivery** — the retry + fire-and-forget pattern achieves the same learning outcome without additional infrastructure.

---

## Open Questions

None — all decisions are grounded in the scaffold and confirmed above.

---

## Success Metric

A Playwright test in `e2e/exercises/05-email-notifications.spec.ts` books a room, polls the LocalStack SES inbox, and finds the confirmation email within 5 seconds. The same test cancels the booking and finds the cancellation email. Both assertions pass on the participant's branch without modification.
