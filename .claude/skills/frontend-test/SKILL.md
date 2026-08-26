---
name: frontend-test
description: Write unit tests for frontend components and hooks. Use when implementing tests or adding coverage.
---

# Write Frontend Unit Tests

Write unit tests for frontend components and hooks.

> The code examples below use React + Vitest + Testing Library + RTK Query. The **patterns** (mocking data hooks, rendering with providers, asserting via Testing Library queries, covering happy/error/loading states and user interactions) are the same across stacks — adapt the syntax to your framework and test runner.

## Setup

This repo's frontend is `apps/web` (React 18 + Vite + TypeScript, Vitest). Colocate `*.test.ts` /
`*.test.tsx` files next to the component or hook under test — see `apps/api`'s equivalent
colocated-`*.test.ts` convention on the backend side; `apps/web` has no test files yet, so this
is the pattern to establish, not one to match against existing frontend tests.

```typescript
// React + Vitest + Testing Library example — adapt to your framework
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
```

## Steps

1. Read existing test files in the same app for patterns
2. Identify components/hooks to test
3. Create the test file following your project's location convention
4. Mock data hooks and state-management hooks as needed
5. Render with required providers — this app's providers are `AuthProvider` (`apps/web/src/lib/auth/context.tsx`) and React Router, not Redux/RTK
6. Assert using your test library's queries (e.g. `screen.getByTestId`, `screen.getByText`)
7. Run tests with `npm test --workspace=apps/web` (see Running below)

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
- This project has no RTK Query / data-hook layer — API calls go through the typed fetch wrappers in
  `apps/web/src/lib/api/`. Mock those functions (e.g. `vi.mock("../lib/api/auth.js")`), not `fetch` itself
- Test behavior, not implementation details
- Cover: happy path, error states, loading states, user interactions

## Running

This repo's frontend is `apps/web` (Vitest).

```bash
# Full frontend test suite
npm test --workspace=apps/web

# Single test file
npm test --workspace=apps/web -- src/components/SomeComponent.test.tsx

# Watch mode
npm run test:watch --workspace=apps/web
```

Note: `apps/web`'s Vitest run currently requires **Node 24** (`nvm use 24`) due to a Fastify 5 /
test-runner incompatibility — see the repo's root `CLAUDE.md`.
