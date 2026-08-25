# apps/api — Fastify Backend

## Entry point
`src/index.ts` — registers plugins and routes, starts the server on port 3000.

## Layer map
- `src/routes/` — one file per resource (`auth.ts`, `rooms.ts`, `bookings.ts`, `me.ts`)
- `src/services/` — business logic (`booking-service.ts`)
- `src/repositories/` — Drizzle queries (`booking-repository.ts`, `room-repository.ts`)
- `src/plugins/` — Fastify plugins (`db.ts` injects `app.db`, `auth.ts` injects `app.requireAuth`)
- `src/errors/` — `AppError` hierarchy (`app-error.ts`)

## Auth

`src/plugins/auth.ts` verifies the Cognito AccessToken stored in the `session` httpOnly cookie using `jose` (JWKS from `https://cognito-idp.{region}.amazonaws.com/{poolId}/.well-known/jwks.json`). It looks up the Postgres user by `cognito_sub` and attaches `request.sessionUser: { id, email, role }`.

Requires `COGNITO_USER_POOL_ID` and `AWS_REGION` in `.env`. See `docs/boot-camp/cognito-setup.md` for first-time setup.

Every protected route must include `preHandler: [app.requireAuth]`.

## Key invariants
- `routes/*` never import from `repositories/*` directly
- `repositories/*` never import from `services/*`
- `db/schema/` is the single source of truth — never hand-write SQL DDL
- Never accept auth credentials outside the `session` cookie (no `Authorization` header)

## Run
```bash
npm run dev --workspace=apps/api   # tsx watch
npm run typecheck --workspace=apps/api
npm test --workspace=apps/api
```
