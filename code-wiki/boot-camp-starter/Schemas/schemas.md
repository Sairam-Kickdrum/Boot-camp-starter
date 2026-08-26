# Database Schema

Postgres 16, managed by Drizzle ORM. Single source of truth: `db/schema/index.ts` (repo root —
not inside `apps/api`). Migrations: `db/migrations/0000_far_warhawk.sql`,
`db/migrations/0001_third_talos.sql`.

All three tables below are owned by **Feat-0001 (apps-api)** — this codebase has one backend
service, so there are no cross-`Feat-NNNN` foreign keys today. The sub-domain each table belongs
to (auth / room / booking) is noted for readability, not because it maps to a separate feature
page.

## users {#users}

Sub-domain: auth.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` |
| `cognito_sub` | text | null | — |
| `email` | text | not null | — |
| `display_name` | text | null | — |
| `role` | enum `role` (`user`, `admin`) | not null | `'user'` |
| `password_hash` | text | null | — |
| `created_at` | timestamptz | not null | `now()` |

- **Primary key**: `id`
- **Unique**: `users_cognito_sub_unique` (`cognito_sub`) — introduced `0000_far_warhawk.sql`
- **Unique**: `users_email_unique` (`email`) — introduced `0000_far_warhawk.sql`
- **Foreign keys**: none

`password_hash` is defined but never read or written by the API — all authentication goes
through Cognito (see Feat-0001). `cognito_sub` starts `null` and is backfilled on first login
(cohort-seeded users) or set at auto-provisioning time (new cohort participants).

## rooms {#rooms}

Sub-domain: room.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` |
| `name` | text | not null | — |
| `description` | text | null | — |
| `price_per_night_cents` | integer | not null | — |
| `capacity` | integer | not null | — |
| `image_url` | text | null | — |
| `created_at` | timestamptz | not null | `now()` |

- **Primary key**: `id`
- **Unique**: none
- **Foreign keys**: none

No API route writes to `rooms` — rows are only created via `db/seed/index.ts`. The room feature
is read-only from the application's perspective.

## bookings {#bookings}

Sub-domain: booking.

| Column | Type | Null | Default |
|---|---|---|---|
| `id` | uuid | not null | `gen_random_uuid()` |
| `user_id` | uuid | not null | — |
| `room_id` | uuid | not null | — |
| `check_in` | date | not null | — |
| `check_out` | date | not null | — |
| `status` | enum `booking_status` (`confirmed`, `cancelled`) | not null | `'confirmed'` |
| `created_at` | timestamptz | not null | `now()` |
| `cancelled_at` | timestamptz | null | — |

- **Primary key**: `id`
- **Check**: `chk_dates` — `check_out > check_in` — introduced `0000_far_warhawk.sql`. Mirrored
  at the application layer by `CreateBookingRequestSchema`'s Zod `.refine()` in
  `packages/shared-types/src/booking-schemas.ts` (Feat-0003) — the DB constraint is the ultimate
  authority; the Zod check exists only to fail fast before a round-trip.
- **Foreign keys**:
  - `user_id → users.id` (`ON DELETE NO ACTION, ON UPDATE NO ACTION`)
  - `room_id → rooms.id` (`ON DELETE NO ACTION, ON UPDATE NO ACTION`)
- **Indexes**: `bookings_room_dates_idx` (`room_id, check_in, check_out`) — introduced
  `0000_far_warhawk.sql`; `bookings_user_id_idx` (`user_id`) — introduced `0001_third_talos.sql`

**No cascade behavior**: both foreign keys are `NO ACTION`. Deleting a `room` or `user` that has
any `bookings` row will fail with a constraint violation at the database level — there is no
API-layer handling for this today (no room/user delete endpoint exists yet). See Feat-0001's
Dangerous Changes table.

## Cross-Feature Foreign Keys

None — `users`, `rooms`, and `bookings` are all owned by the single backend service, Feat-0001.

## Definition Drift

- `bookings.user_id` and `bookings.room_id` foreign keys: the migration
  (`0000_far_warhawk.sql`) specifies `ON DELETE NO ACTION ON UPDATE NO ACTION` explicitly; the
  Drizzle schema definition (`db/schema/index.ts`) does not specify these actions explicitly.
  The migration is authoritative — regenerating a migration from the current Drizzle schema
  could silently change this behavior if Drizzle's default ever changes. Worth pinning explicitly
  in `db/schema/index.ts` to remove the ambiguity.

## Gaps

- *Open question: is there a plan to reintroduce a unique constraint or exclusion constraint on
  `bookings` to close the race condition described in Feat-0001 (two concurrent requests can both
  pass the overlap check before either inserts)? A code comment in
  `apps/api/src/services/booking-service.ts` references catching a future unique-constraint
  violation, but no such constraint exists in either migration today.*
