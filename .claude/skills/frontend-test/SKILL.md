---
name: frontend-test
description: Write unit tests for frontend components and hooks. Use when implementing tests or adding coverage.
---

# Write Frontend Unit Tests

Write unit tests for `apps/web` components and hooks.

> Stack: React 18 + Vite 8 + TypeScript + Vitest. `apps/web/package.json` does not yet depend on
> `@testing-library/react` or a DOM environment (`jsdom`/`happy-dom`) — no component tests exist in
> this app yet. The first test that renders a component must add both as devDependencies to
> `apps/web/package.json` and set `test.environment: "jsdom"` in `apps/web/vite.config.ts`'s
> Vitest config block (Vitest reads its config from `vite.config.ts` here — there is no separate
> `vitest.config.ts` for this workspace, unlike `apps/api`).

## Setup

Tests are colocated with the code they test, as `*.test.ts`/`*.test.tsx` siblings — same convention
as `apps/api` (e.g. `src/services/booking-service.test.ts` there).

```typescript
// React + Vitest + Testing Library — add @testing-library/react once the first component test is written
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi } from "vitest";
```

## Steps

1. Read `apps/web/CLAUDE.md` and any existing test files in `apps/web/src` for patterns
2. Identify components/hooks to test
3. Create the test file colocated with the component/hook (`Component.test.tsx`, `useHook.test.ts`)
4. Mock `src/lib/api/*.ts` functions (the typed fetch wrappers) — never mock `fetch` directly, and
   never let a unit test hit the real API
5. Render with the providers the component actually needs — most pages need `AuthProvider`
   (`src/lib/auth/context.tsx`) and a router (`MemoryRouter` from `react-router-dom`)
6. Assert using Testing Library queries, targeting the `data-testid` every interactive element in
   this app already carries (see `apps/web/CLAUDE.md`)
7. Run with `npm test --workspace=apps/web`

## Patterns

### Component Test
```typescript
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import * as roomsApi from "../lib/api/rooms.js";
import { RoomsPage } from "./RoomsPage.js";

describe("RoomsPage", () => {
  beforeEach(() => {
    vi.spyOn(roomsApi, "listRooms").mockResolvedValue({ rooms: [] });
  });

  it("renders the empty state when no rooms are available", async () => {
    render(<RoomsPage />, { wrapper: MemoryRouter });
    expect(await screen.findByTestId("no-rooms-message")).toBeInTheDocument();
  });
});
```

### Hook Test
```typescript
import { renderHook, waitFor } from "@testing-library/react";
import { useAuth, AuthProvider } from "./context.js";

describe("useAuth", () => {
  it("throws when used outside AuthProvider", () => {
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used inside AuthProvider");
  });
});
```

## Key Conventions
- Target elements via `data-testid` (matches this app's Playwright convention — see
  `apps/web/CLAUDE.md`) or accessible roles, never CSS selectors
- Mock `src/lib/api/*.ts` functions, not the underlying `fetch`
- Test behavior (what renders, what happens on click/submit), not implementation details
- Cover: happy path, loading state, error state, and the interaction itself

## Running

```bash
npm test --workspace=apps/web           # one-shot (vitest run --passWithNoTests)
npm run test:watch --workspace=apps/web # watch mode
```

Requires **Node 24** (`nvm use 24`) — see the root `CLAUDE.md`'s Node-version note.
