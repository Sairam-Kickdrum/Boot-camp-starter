---
name: frontend-test
description: Write unit tests for frontend components and hooks. Use when implementing tests or adding coverage.
---

# Write Frontend Unit Tests

Write unit tests for `apps/web` (React + Vite + TypeScript) components and hooks.

> This repo uses React + Vitest + Testing Library — no RTK Query or other data-fetching layer; `apps/web/src/lib/api/*` are plain `fetch` wrappers and `apps/web/src/lib/auth/context.tsx` is a React Context provider. The **patterns** below (rendering with providers, asserting via Testing Library queries, covering happy/error/loading states) still apply — mock the `lib/api` fetch wrappers and the auth context instead of a data hook.

## Setup

Tests are colocated with source as `*.test.tsx`/`*.test.ts` siblings (matching the backend convention in `apps/api`), run by Vitest.

```typescript
// React + Vitest + Testing Library
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
```

## Steps

1. Read existing test files in the same app for patterns
2. Identify components/hooks to test
3. Create the test file as a `*.test.tsx`/`*.test.ts` sibling of the file under test
4. Mock the `apps/web/src/lib/api/*` fetch wrappers (and `AuthProvider`/`useAuth` from `apps/web/src/lib/auth/context.tsx`) as needed — these are the data/auth boundaries, not internal component state
5. Render with required providers (`AuthProvider`, `react-router-dom`'s router) — see `apps/web/src/App.tsx` for how they compose
6. Assert using Testing Library queries (e.g. `screen.getByTestId`, `screen.getByText`)
7. Run tests with the commands below

## Patterns

### Component Test
```typescript
describe('ComponentName', () => {
  const mockData = { /* test data */ };

  beforeEach(() => {
    vi.mocked(useGetDataQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    } as any);
  });

  it('should render data correctly', () => {
    render(<ComponentName />);
    expect(screen.getByTestId('data-display')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    vi.mocked(useGetDataQuery).mockReturnValue({
      isLoading: true,
    } as any);
    render(<ComponentName />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
```

### Hook Test
```typescript
import { renderHook } from '@testing-library/react';

describe('useCustomHook', () => {
  it('should return expected value', () => {
    const { result } = renderHook(() => useCustomHook(args));
    expect(result.current.value).toBe(expected);
  });
});
```

## Key Conventions
- Target elements with stable test selectors (e.g., `data-testid` attributes or accessible roles)
- Mock data-layer hooks, not the underlying fetch/HTTP layer
- Test behavior, not implementation details
- Cover: happy path, error states, loading states, user interactions

## Running

Frontend tests require **Node 24** — `nvm use 24` first (Fastify 5 / test-runner incompatibility on Node 18, see root `CLAUDE.md`).

```bash
nvm use 24

# All frontend tests
npm run test --workspace=apps/web

# Single test file
npm run test --workspace=apps/web -- src/routes/LoginPage.test.tsx

# Watch mode
npm run test:watch --workspace=apps/web
```
