# Schemas — boot-camp-starter

Canonical, whole-codebase database schema. Full column lists, constraints, and cross-feature
foreign keys are written once here — feature pages link into this file instead of restating
columns. Source: Drizzle migrations under `db/migrations/*.sql` (read in order) and the ORM
definitions in `db/schema/index.ts`. No drift found between the migrations and the ORM definitions.

## `users`

Owner: **Feat-0001 (auth, backend)**

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | not null | — | Primary key |
| `cognito_sub` | text | null | — | Unique. Linked on first login |
| `email` | text | not null | — | Unique |
| `display_name` | text | null | — | |
| `role` | enum (`user`, `admin`) | not null | `'user'` | |
| `password_hash` | text | null | — | Unused — auth is entirely Cognito-delegated (see Feat-0001) |
| `created_at` | timestamptz | not null | `now()` | |

- **Primary key**: `id`
- **Unique**: `users_cognito_sub_unique` (`cognito_sub`) — introduced in `0000_far_warhawk.sql`
- **Unique**: `users_email_unique` (`email`) — introduced in `0000_far_warhawk.sql`
- **Foreign keys referencing this table**: `bookings.user_id → users.id`

## `rooms`

Owner: **Feat-0003 (rooms, backend)**

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | not null | — | Primary key |
| `name` | text | not null | — | |
| `description` | text | null | — | |
| `price_per_night_cents` | integer | not null | — | No DB-level `CHECK > 0`; positivity is Zod-only (see Feat-0003 Gaps) |
| `capacity` | integer | not null | — | Same DB-level gap as above |
| `image_url` | text | null | — | No reachability/content-type check |
| `created_at` | timestamptz | not null | `now()` | |

- **Primary key**: `id`
- **Foreign keys referencing this table**: `bookings.room_id → rooms.id` (`ON DELETE NO ACTION` — deleting a room with bookings fails at the DB level; the app does not yet translate this into a 409, see Feat-0003)

## `bookings`

Owner: **Feat-0002 (bookings, backend)**

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | uuid | not null | — | Primary key |
| `user_id` | uuid | not null | — | FK → `users.id` |
| `room_id` | uuid | not null | — | FK → `rooms.id` |
| `check_in` | date | not null | — | |
| `check_out` | date | not null | — | |
| `status` | enum (`confirmed`, `cancelled`) | not null | `'confirmed'` | No route sets `cancelled` yet — see Feat-0002 Gaps |
| `created_at` | timestamptz | not null | `now()` | |
| `cancelled_at` | timestamptz | null | — | Populated by no current code path |

- **Primary key**: `id`
- **Check**: `chk_dates` — `check_out > check_in` — introduced in `0000_far_warhawk.sql` (mirrored at the application layer by `CreateBookingRequestSchema`'s Zod `.refine()` in `packages/shared-types/src/booking-schemas.ts`)
- **Indexes**: `bookings_room_dates_idx` (`room_id`, `check_in`, `check_out`) — introduced in `0000_far_warhawk.sql`; `bookings_user_id_idx` (`user_id`) — introduced in `0001_third_talos.sql`
- **Foreign keys**: `user_id → users.id` (`ON DELETE NO ACTION`), `room_id → rooms.id` (`ON DELETE NO ACTION`)
- **No unique constraint on (`room_id`, `check_in`, `check_out`)** — see Cross-Feature Foreign Keys note below; this is the DB-level gap behind the booking race condition.

## Cross-Feature Foreign Keys

| FK | Owner → Owner | Note |
|---|---|---|
| `bookings.user_id → users.id` | Feat-0002 (bookings) → Feat-0001 (auth) | Deleting a user with bookings currently fails at the DB level (`ON DELETE NO ACTION`); no application-level cascade or 409 translation exists yet |
| `bookings.room_id → rooms.id` | Feat-0002 (bookings) → Feat-0003 (rooms) | Same `ON DELETE NO ACTION` gap — deleting a room with bookings fails at the DB level with no friendly error |

## Known Gap: No Unique Constraint Preventing Double-Booking

`bookings` has no DB-level constraint (unique index, exclusion constraint) preventing two
overlapping `confirmed` rows for the same `room_id`. The only protection is an application-level
check-then-insert in `BookingService.bookRoom` (`apps/api/src/services/booking-service.ts:27-34`),
which is not atomic — two concurrent requests can both pass the conflict check and insert
overlapping bookings. The repository code has a comment acknowledging this and naming two possible
fixes (a `EXCLUDE USING gist` constraint, or `SELECT ... FOR UPDATE`), neither implemented. See
Feat-0002 and Feat-0003's Known Error Scenarios / Dangerous Changes sections.
