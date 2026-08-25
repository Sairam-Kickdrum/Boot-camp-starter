# Architecture Overview

This document explains how the boot camp starter application is structured. Read this before starting any exercise — it will save you hours of confusion.

## The application in one sentence

A room-booking app where users log in, browse available rooms, and make bookings.

## The three layers

```
Browser
  │
  ▼
apps/web  (React + Vite, port 5173)
  │  HTTP requests via /api proxy
  ▼
apps/api  (Fastify, port 3000)
  │  Drizzle ORM
  ▼
Postgres  (Docker, port 5432)

Auth: AWS Cognito → Cognito AccessToken → httpOnly "session" cookie
LocalStack (port 4566): S3 + SES only (exercises 3 and 7)
```

### Frontend (`apps/web/`)

The React app running in the browser. Key folders:

| Folder | What lives here |
|--------|----------------|
| `src/routes/` | Page components — one file per route |
| `src/components/` | Reusable UI pieces (Nav, etc.) |
| `src/lib/api/` | Typed fetch functions — **always use these, never call fetch directly** |
| `src/lib/auth/` | Auth context (`AuthProvider`, `useAuth`) |

The frontend proxies `/api/*` to `http://localhost:3000` via Vite. So a call to `/api/rooms` hits `apps/api` at `/rooms`.

### Backend (`apps/api/`)

The Fastify server. Strict three-layer structure:

| Folder | What lives here | Rule |
|--------|----------------|------|
| `src/routes/` | HTTP handlers | Parse request, call service, send response — nothing else |
| `src/services/` | Business logic | The "what should happen?" layer |
| `src/repositories/` | Database queries | Drizzle code only — no business logic |
| `src/plugins/` | Fastify plugins | `db` (injects `app.db`), `auth` (injects `app.requireAuth`) |
| `src/errors/` | Error types | `NotFoundError`, `ConflictError`, etc. |

**Never** import a repository directly from a route handler. Always go through a service.

### Shared types (`packages/shared-types/`)

Zod schemas that define the data shapes that cross the API boundary. Both `apps/api` (for validation) and `apps/web` (for typed responses) import from here.

When you add an endpoint, you add its request/response schema to `shared-types` first. This ensures the frontend and backend always agree.

### Database (`db/`)

- `db/schema/index.ts` — Drizzle table definitions. The single source of truth for the data model.
- `db/migrations/` — Drizzle-generated SQL migrations. Never edit these by hand.
- `db/seed/index.ts` — Creates 5 rooms + 2 test users on first run.

## The data model

```
users
  id (uuid PK)
  cognito_sub (set by seed-cognito.sh — links to Cognito User Pool)
  email
  display_name
  role: 'user' | 'admin'
  password_hash (null — not used; Cognito is the auth provider)

rooms
  id (uuid PK)
  name, description
  price_per_night_cents
  capacity
  image_url (null by default — used by the admin exercise)

bookings
  id (uuid PK)
  user_id → users
  room_id → rooms
  check_in, check_out (dates)
  status: 'confirmed' | 'cancelled'
```

## The booking flow (reference feature)

```
1. User visits /login → submits email + password
2. API calls AWS Cognito (InitiateAuth) → Cognito returns an AccessToken
   → stored as httpOnly cookie named "session"
3. User visits /rooms → frontend fetches GET /rooms
4. User picks a room → navigates to /rooms/:id/book
5. User picks dates → frontend POSTs to /bookings
6. API validates: dates valid? room available?
7. API creates booking record → returns 201
8. Frontend shows confirmation → user can visit /bookings to see their booking
```

## How to add a new feature (the exercise pattern)

Every exercise follows the same pattern:

1. **Add a Zod schema** to `packages/shared-types/src/` for any new request/response shape.
2. **Add a Drizzle migration** if you need a new table or column (`npm run db:generate`).
3. **Add a repository method** for any new DB query.
4. **Add a service method** for the business logic (calls the repository).
5. **Add a route handler** (calls the service, validates the request body).
6. **Add frontend API function** in `src/lib/api/`.
7. **Update the UI** — new page, component, or form.
8. **Add a Playwright test** for the new flow.
9. **Add Vitest unit tests** for the service method.

## Authentication in detail

The app uses **AWS Cognito User Pools** for authentication. Every cohort participant needs an AWS account with a Cognito User Pool set up (see `docs/boot-camp/cognito-setup.md`).

**Login flow** (`POST /auth/login`):
1. The API calls Cognito `InitiateAuth` (USER_PASSWORD_AUTH) with the submitted email + password
2. Cognito verifies the credentials and returns a signed AccessToken (JWT)
3. The API stores the AccessToken in an httpOnly cookie named `session` (1-hour TTL)
4. The frontend never sees the token — only the cookie

**Per-request auth** (`requireAuth` preHandler):
1. Reads the `session` cookie
2. `jose` verifies the token signature against Cognito's public JWKS endpoint:
   `https://cognito-idp.{region}.amazonaws.com/{poolId}/.well-known/jwks.json`
3. Looks up the Postgres user by `cognito_sub` from the token
4. Attaches `request.sessionUser: { id, email, role }` for use in route handlers

Every exercise that adds a protected route must declare `preHandler: [app.requireAuth]`.

## Local dev environment

| Service | Port | How to access |
|---------|------|---------------|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| API (Fastify) | 3000 | http://localhost:3000 |
| Postgres | 5432 | `psql -U bootcamp -d bootcamp` |
| LocalStack | 4566 | AWS CLI with `--endpoint-url http://localhost:4566` |
