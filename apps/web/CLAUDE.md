# apps/web — React Frontend

## Structure
- `src/routes/` — page components (`LoginPage`, `RoomsPage`, `BookingPage`, `BookingsPage`)
- `src/components/` — reusable UI components (`Nav`)
- `src/lib/api/` — typed fetch wrappers per resource (`auth.ts`, `rooms.ts`, `bookings.ts`)
- `src/lib/auth/` — `AuthProvider` + `useAuth` hook (session state)

## Key invariants
- Never call `fetch` directly — use `src/lib/api/*.ts` functions
- All API types come from `@boot-camp/shared-types`
- Every interactive element has a `data-testid` (required by Playwright)
- Auth state lives in `AuthProvider` — don't duplicate user state locally in pages

## Dev server proxy
Vite proxies `/api/*` → `http://localhost:3000` — so frontend calls go to `/api/rooms`, not `http://localhost:3000/rooms`.

## Run
```bash
npm run dev --workspace=apps/web
npm run typecheck --workspace=apps/web
npm test --workspace=apps/web
```
