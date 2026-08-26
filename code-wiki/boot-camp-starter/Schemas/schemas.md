# Database Schema

Canonical, whole-codebase database schema. **Source of truth**: `db/schema/index.ts` (Drizzle
table definitions). Where a migration and `db/schema/index.ts` disagree, the migration wins —
no such disagreement was found in this scan. Postgres 16, via `drizzle-orm`.

Migrations: `db/migrations/0000_far_warhawk.sql` (initial schema), `db/migrations/0001_third_talos.sql`
(adds `bookings_user_id_idx`).

---

## users {#users}

Owning feature: [Feat-0001-auth-api](../Features/Feat-0001-auth-api/Index.md)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` | Primary key |
| `cognito_sub` | `text` | nullable | — | Cognito user pool `sub` claim; `NULL` until first login links it |
| `email` | `text` | not null | — | |
| `display_name` | `text` | nullable | — | |
| `role` | `role` enum (`"user"` \| `"admin"`) | not null | `'user'` | Derived from the Cognito `cognito:groups` claim on first login — see `Feat-0001-auth-api` |
| `password_hash` | `text` | nullable | — | **Dead column** — defined in the schema and migration but never read or written anywhere in `apps/api/src` (grep confirms zero references outside `db/`). All auth goes through Cognito. Kept for backward compatibility or a pre-Cognito migration path; treat writes to it as almost certainly a mistake unless verified otherwise |
| `created_at` | `timestamptz` | not null | `now()` | |

**Constraints:**
- `PRIMARY KEY (id)`
- `UNIQUE (cognito_sub)` — introduced in `0000_far_warhawk.sql`
- `UNIQUE (email)` — introduced in `0000_far_warhawk.sql`

**Foreign keys referencing this table:**
- `bookings.user_id → users.id` (`ON DELETE NO ACTION`, `ON UPDATE NO ACTION`) — no cascade; see the FK note below

---

## rooms {#rooms}

Owning feature: [Feat-0003-rooms-api](../Features/Feat-0003-rooms-api/Index.md)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` | Primary key |
| `name` | `text` | not null | — | |
| `description` | `text` | nullable | — | |
| `price_per_night_cents` | `integer` | not null | — | Must be positive — enforced only in the Zod schema (`packages/shared-types`), **not** a DB `CHECK` constraint. A direct SQL insert could bypass it |
| `capacity` | `integer` | not null | — | Must be positive — same caveat as above, Zod-only |
| `image_url` | `text` | nullable | — | Validated as a URL only at the Zod layer |
| `created_at` | `timestamptz` | not null | `now()` | |

**Constraints:**
- `PRIMARY KEY (id)`
- No `CHECK` constraints (open gap — see `price_per_night_cents`/`capacity` notes above)

**Foreign keys referencing this table:**
- `bookings.room_id → rooms.id` (`ON DELETE NO ACTION`, `ON UPDATE NO ACTION`) — no cascade; see the FK note below

**Rooms are immutable through the API** — no create/update/delete route exists for `rooms`; only seeded (`db/seed/`) and read.

---

## bookings {#bookings}

Owning feature: [Feat-0002-bookings-api](../Features/Feat-0002-bookings-api/Index.md)

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | `uuid` | not null | `gen_random_uuid()` | Primary key |
| `user_id` | `uuid` | not null | — | FK → `users.id` |
| `room_id` | `uuid` | not null | — | FK → `rooms.id` |
| `check_in` | `date` | not null | — | |
| `check_out` | `date` | not null | — | Must be after `check_in` — enforced by DB `CHECK` **and** by the Zod schema (defense in depth) |
| `status` | `booking_status` enum (`"confirmed"` \| `"cancelled"`) | not null | `'confirmed'` | No route currently transitions a booking to `"cancelled"` — the enum value exists but is unreachable via the API today (see `Feat-0002-bookings-api`) |
| `created_at` | `timestamptz` | not null | `now()` | |
| `cancelled_at` | `timestamptz` | nullable | — | Set only if/when a cancel path is added — currently always `NULL` |

**Constraints:**
- `PRIMARY KEY (id)`
- `CHECK chk_dates (check_out > check_in)` — introduced in `0000_far_warhawk.sql`
- `FOREIGN KEY (user_id) REFERENCES users(id)` — `ON DELETE NO ACTION`, `ON UPDATE NO ACTION` — introduced in `0000_far_warhawk.sql`
- `FOREIGN KEY (room_id) REFERENCES rooms(id)` — `ON DELETE NO ACTION`, `ON UPDATE NO ACTION` — introduced in `0000_far_warhawk.sql`

**Indexes:**
- `bookings_room_dates_idx (room_id, check_in, check_out)` — introduced in `0000_far_warhawk.sql`; backs the overlap-availability query in `Feat-0003-rooms-api`
- `bookings_user_id_idx (user_id)` — introduced in `0001_third_talos.sql`; backs the per-user listing query in `Feat-0002-bookings-api`

**No DB-level uniqueness prevents two confirmed bookings from overlapping on the same room.**
Overlap prevention is application-level only (`hasConflict` check in `booking-service.ts`) — see
the acknowledged race-condition gap in `Feat-0002-bookings-api`.

---

## Cross-Feature Foreign Keys

These are the FKs that cross a feature-ownership boundary — the highest-risk coupling in the
schema, since a change to either side's `id` column shape affects the other without either
feature importing the other's code:

| FK | From feature | To feature |
|---|---|---|
| `bookings.user_id → users.id` | [Feat-0002-bookings-api](../Features/Feat-0002-bookings-api/Index.md) | [Feat-0001-auth-api](../Features/Feat-0001-auth-api/Index.md) |
| `bookings.room_id → rooms.id` | [Feat-0002-bookings-api](../Features/Feat-0002-bookings-api/Index.md) | [Feat-0003-rooms-api](../Features/Feat-0003-rooms-api/Index.md) |

**Neither FK has an `ON DELETE` cascade or restrict behavior configured** (both are `NO ACTION`,
Postgres's default). Per the root `CLAUDE.md`'s "Foreign-key handling" convention, deleting a
`room` or `user` that still has bookings should either cascade-delete the bookings or return a
`409 Conflict` — **today, neither route exists to delete a room or a user at all**, so this gap
is latent rather than currently reachable. Flag it if either delete route is ever added.

## Definition Drift

None found — `db/schema/index.ts` matches the migration SQL exactly for all three tables.

## Open Questions

- *Open question: is `users.password_hash` a remnant of a pre-Cognito auth path, or dead code
  that should be dropped in a future migration? No code path reads or writes it.*
- *Open question: should `rooms.price_per_night_cents` and `rooms.capacity` gain DB-level
  `CHECK (... > 0)` constraints to match the Zod-level validation, given the root CLAUDE.md's
  general preference for enforcing invariants at the DB layer where possible?*
