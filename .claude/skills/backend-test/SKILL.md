---
name: backend-test
description: Write backend tests using a two-tier strategy — service tests for business logic, integration tests for API/DB contracts.
---

# Write Backend Tests

Write tests for `apps/api` using a two-tier strategy that follows the test pyramid.

> Stack: Fastify 5 + TypeScript + Vitest + Drizzle ORM + Postgres. Tests live colocated with the
> code they test, as `*.test.ts` siblings (e.g. `src/services/booking-service.test.ts`) — there is
> no separate `test/` tree.

## Two-Tier Strategy

### Tier 1 — Service Tests (fast, numerous)

Test business logic in isolation. Mock the repository layer with `vi.fn()` — no real DB, no
Fastify instance. Cover all acceptance criteria scenarios, business rule branches, validation, and
error handling.

**When to write:** Every AC scenario, every business logic branch, every validation rule, every
error case.

```typescript
// apps/api/src/services/booking-service.test.ts (real pattern from this repo)
import { describe, it, expect, vi, beforeEach } from "vitest";
import { BookingService } from "./booking-service.js";
import { NotFoundError, ConflictError } from "../errors/app-error.js";
import type { BookingRepository } from "../repositories/booking-repository.js";
import type { RoomRepository } from "../repositories/room-repository.js";

describe("BookingService", () => {
  let service: BookingService;
  let bookingRepo: BookingRepository;
  let roomRepo: RoomRepository;

  beforeEach(() => {
    bookingRepo = {
      listForUser: vi.fn(),
      findById: vi.fn(),
      hasConflict: vi.fn(),
      create: vi.fn(),
    } as unknown as BookingRepository;
    roomRepo = { findById: vi.fn() } as unknown as RoomRepository;
    service = new BookingService(bookingRepo, roomRepo);
  });

  it("throws ConflictError when the room is already booked for the dates", async () => {
    vi.mocked(bookingRepo.hasConflict).mockResolvedValue(true);
    await expect(
      service.bookRoom("user-1", { roomId: "room-1", checkIn: "2026-06-01", checkOut: "2026-06-03" }),
    ).rejects.toThrow(ConflictError);
  });
});
```

**Patterns:**
- Cast a plain object of `vi.fn()`s to the repository's type — no mocking library beyond Vitest's
  own `vi`
- Construct the service directly with its mocked dependencies (no DI container)
- Assert both the return value/thrown error and side effects (`expect(bookingRepo.create).toHaveBeenCalledWith(...)`)
- Naming: `describe("ServiceName")` → `it("does X when Y")`, plain sentences, not `shouldX_whenY`

### Tier 2 — Integration Tests (slower, contract-focused)

Test that routes, services, repositories and the real Postgres DB wire together correctly. Use
Fastify's `app.inject()` against a built app instance — no HTTP server needs to actually listen.
Verify API contracts (routes, status codes, request/response shapes, auth) and DB contracts (entity
persistence, queries, constraints).

**When to write:** At least one happy-path + one error-path per endpoint, more as needed based on
ticket ACs and error cases.

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { buildApp } from "../app.js"; // adjust to this repo's actual app-builder, if/when one exists
import { db } from "../plugins/db.js";
import { bookings } from "../../../../db/schema/index.js";

describe("GET /bookings/:id", () => {
  it("returns 403 when the booking belongs to a different user", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/bookings/some-other-users-booking-id",
      cookies: { session: validSessionCookieForUserA },
    });
    expect(res.statusCode).toBe(403);
  });
});
```

**Setup:**
- Real Postgres via `docker-compose.yml` (`npm run db:reset` / `scripts/db-reset.sh` to get a clean,
  migrated database) — no in-memory or mocked DB for this tier
- Build a real Fastify instance (register the same plugins/routes as `src/index.ts`) and use
  `app.inject()` — do not start a listening server
- A valid `session` cookie is a real (or test-pool) Cognito AccessToken; there is no auth bypass
  flag — see `apps/api/src/plugins/auth.ts`
- Data setup via the real repositories/Drizzle client against the test database

**Patterns:**
- **Data setup**: Insert via real repositories/Drizzle, not mocks
- **External-service mocking**: Only Cognito/SES/S3 calls are mocked or pointed at LocalStack —
  everything internal (routes → services → repositories → Postgres) runs for real
- **Assertions**: Assert HTTP status + response body + DB state via a real read
- **Cleanup**: Each test cleans up the rows it created (bookings, rooms, users) so it doesn't
  pollute other specs — see `CLAUDE.md`'s testing-isolation rule

## Steps

1. Read `apps/api/CLAUDE.md` and the existing `*.test.ts` files next to the code you're testing
2. Identify acceptance criteria and endpoints to test
3. **Write Tier 1 service tests first** — cover all AC scenarios and logic branches
4. **Write Tier 2 integration tests** — cover API and DB contracts (401/403/404 as well as the
   happy path — see `docs/boot-camp/review-checklist.md`'s Authentication & Authorization table)
5. Run tests using this repo's actual commands (below)

## Running

**Requires Node 24** (`nvm use 24`) — Vitest under Fastify 5 does not work reliably on Node 18.

```bash
# Whole backend workspace
npm test --workspace=apps/api

# Single file, watch mode
npm run test:watch --workspace=apps/api -- src/services/booking-service.test.ts

# Single file, one-shot (from apps/api)
cd apps/api && npx vitest run src/services/booking-service.test.ts
```
