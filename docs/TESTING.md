# Testing Guide

This guide covers the testing strategy, patterns, and best practices for the Hungry Hundreds project.

## Testing Overview

Hungry Hundreds uses a two-tier testing strategy:

| Framework          | Type      | Purpose                                | Location                         |
| ------------------ | --------- | -------------------------------------- | -------------------------------- |
| **Vitest**         | Unit      | Test stores, utilities, database logic | `src/**/*.{test,spec}.ts`        |
| **Vitest Browser** | Component | Test Svelte components in real browser | `src/**/*.svelte.{test,spec}.ts` |
| **Playwright**     | E2E       | Test complete user flows               | `e2e/*.test.ts`                  |

### Testing Philosophy

1. **Offline-First Testing** - Tests run with `fake-indexeddb` to simulate IndexedDB
2. **Real Browser Testing** - Component tests run in Chromium via Vitest Browser Mode
3. **No Mocking Dexie** - Use actual Dexie operations with fake IndexedDB
4. **Isolated Tests** - Each test clears database tables before/after

---

## Unit Testing Guidelines

### File Naming Conventions

| Pattern                    | Test Type        | Environment |
| -------------------------- | ---------------- | ----------- |
| `*.spec.ts` or `*.test.ts` | Server/Node      | Node.js     |
| `*.svelte.spec.ts`         | Svelte Component | Browser     |

### Test File Placement

Tests are co-located with the code they test:

```
src/
├── lib/
│   ├── db/
│   │   ├── habits.ts           # Implementation
│   │   ├── habits.spec.ts      # Unit tests
│   │   ├── habitLogs.ts
│   │   └── habitLogs.spec.ts
│   ├── supabase/
│   │   ├── client.ts
│   │   └── client.test.ts      # Connection tests
│   └── stores/
│       └── habits.ts
├── routes/
│   ├── +page.svelte
│   └── page.svelte.spec.ts     # Component tests
└── demo.spec.ts                # Demo/sanity tests
```

### Testing Patterns

#### 1. Database Operations (Dexie.js)

Use `fake-indexeddb` to test IndexedDB operations in Node.js:

```typescript
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './db';
import { createHabit, getHabitById } from './habits';

describe('Habit CRUD Operations', () => {
  beforeEach(async () => {
    // Clear tables before each test
    await db.habits.clear();
    await db.logs.clear();
    await db.syncQueue.clear();
  });

  afterEach(async () => {
    // Clean up after tests
    await db.habits.clear();
    await db.logs.clear();
    await db.syncQueue.clear();
  });

  it('should create a habit and return its ID', async () => {
    const id = await createHabit({
      name: 'Morning Run',
      emoji: '🏃',
      color: '#3498db'
    });

    expect(id).toBeGreaterThan(0);
  });

  it('should retrieve habit by ID', async () => {
    const id = await createHabit({ name: 'Test', emoji: '🧪', color: '#000' });
    const habit = await getHabitById(id);

    expect(habit).toBeDefined();
    expect(habit!.name).toBe('Test');
  });
});
```

#### 2. Streak Calculation

Test date-dependent logic with helper functions:

```typescript
describe('Streak Calculation', () => {
  // Helper to get date relative to today
  function daysAgo(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  it('should count consecutive days including today', async () => {
    await logHabitCompletion(habitId, daysAgo(2));
    await logHabitCompletion(habitId, daysAgo(1));
    await logHabitCompletion(habitId, daysAgo(0)); // today

    const streak = await calculateStreak(habitId);

    expect(streak).toBe(3);
  });
});
```

#### 3. Supabase Connection Tests

Test external service connections:

```typescript
import { describe, it, expect } from 'vitest';
import { supabase } from './client';

describe('Supabase Connection', () => {
  it('should connect and access habits table', async () => {
    const { error, count } = await supabase
      .from('habits')
      .select('*', { count: 'exact', head: true });

    expect(error).toBeNull();
  });

  it('should access auth endpoint', async () => {
    const { error } = await supabase.auth.getSession();

    expect(error).toBeNull();
  });
});
```

### Testing Svelte 5 Components

Component tests run in a real browser using Vitest Browser Mode:

```typescript
// src/routes/page.svelte.spec.ts
import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte (Home)', () => {
  it('should render greeting heading', async () => {
    render(Page);

    const heading = page.getByRole('heading', { level: 2 });
    await expect.element(heading).toBeInTheDocument();
  });

  it('should render habits section', async () => {
    render(Page);

    const habitsHeading = page.getByText('Your Habits');
    await expect.element(habitsHeading).toBeInTheDocument();
  });
});
```

### Mocking Strategies

#### Mocking Authentication State

```typescript
import { vi } from 'vitest';

// Mock the auth store
vi.mock('$lib/stores/auth', () => ({
  auth: {
    subscribe: vi.fn((cb) => {
      cb({ user: null, session: null, loading: false, initialized: true });
      return () => {};
    })
  },
  isAuthenticated: {
    subscribe: vi.fn((cb) => {
      cb(false);
      return () => {};
    })
  }
}));
```

#### Mocking SvelteKit Modules

```typescript
import { vi } from 'vitest';

// Mock $app/navigation
vi.mock('$app/navigation', () => ({
  goto: vi.fn()
}));

// Mock $app/environment
vi.mock('$app/environment', () => ({
  browser: true
}));
```

---

## Running Tests

### Commands

| Command                | Description                     |
| ---------------------- | ------------------------------- |
| `pnpm test:unit`       | Run all unit tests (watch mode) |
| `pnpm test:unit --run` | Run all unit tests once         |
| `pnpm test:e2e`        | Run Playwright E2E tests        |
| `pnpm test`            | Run all tests (unit + e2e)      |

### Running Specific Tests

```bash
# Run tests matching a pattern
pnpm test:unit -- habits

# Run a specific test file
pnpm test:unit -- src/lib/db/habits.spec.ts

# Run tests in a specific project
pnpm test:unit -- --project=server   # Node.js tests only
pnpm test:unit -- --project=client   # Browser tests only
```

### Watch Mode

```bash
# Watch mode (default for pnpm test:unit)
pnpm test:unit

# Exit watch mode and run once
pnpm test:unit --run
```

### Coverage Reports

```bash
# Generate coverage report
pnpm test:unit --coverage

# Coverage with specific reporter
pnpm test:unit --coverage --reporter=html
```

---

## Test Structure Examples

### Testing a Store Function

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { db } from '$lib/db/db';
import { createHabit, deleteHabit, getHabitCount } from '$lib/db/habits';

describe('deleteHabit', () => {
  beforeEach(async () => {
    await db.habits.clear();
    await db.logs.clear();
  });

  it('should delete the habit', async () => {
    const id = await createHabit({ name: 'To Delete', emoji: '🗑️', color: '#000' });

    await deleteHabit(id);
    const count = await getHabitCount();

    expect(count).toBe(0);
  });

  it('should also delete associated logs', async () => {
    const id = await createHabit({ name: 'With Logs', emoji: '📝', color: '#000' });
    await logHabitCompletion(id, '2024-01-01');
    await logHabitCompletion(id, '2024-01-02');

    await deleteHabit(id);

    const logsAfter = await db.logs.where('habitId').equals(id).count();
    expect(logsAfter).toBe(0);
  });
});
```

### Testing Utility Functions

```typescript
import { describe, it, expect } from 'vitest';
import { getTodayDate, now } from '$lib/db/db';

describe('Date Utilities', () => {
  it('should return today in YYYY-MM-DD format', () => {
    const today = getTodayDate();

    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should return current timestamp', () => {
    const timestamp = now();

    expect(timestamp).toBeGreaterThan(0);
    expect(typeof timestamp).toBe('number');
  });
});
```

### Testing Toggle Behavior

```typescript
describe('toggleHabitCompletion', () => {
  it('should add completion when not exists', async () => {
    const result = await toggleHabitCompletion(habitId, '2024-01-15');

    expect(result).toBe(true);
    expect(await isHabitCompletedOnDate(habitId, '2024-01-15')).toBe(true);
  });

  it('should remove completion when already exists', async () => {
    await logHabitCompletion(habitId, '2024-01-15');
    const result = await toggleHabitCompletion(habitId, '2024-01-15');

    expect(result).toBe(false);
    expect(await isHabitCompletedOnDate(habitId, '2024-01-15')).toBe(false);
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow

The project is configured to run tests in CI. Here's a typical workflow configuration:

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps chromium

      - name: Run unit tests
        run: pnpm test:unit --run

      - name: Run E2E tests
        run: pnpm test:e2e
```

### Vitest Configuration

The test configuration is defined in `vite.config.ts`:

```typescript
export default defineConfig({
  test: {
    // Require assertions in tests
    expect: { requireAssertions: true },

    projects: [
      {
        // Browser tests for Svelte components
        test: {
          name: 'client',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', headless: true }]
          },
          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
          exclude: ['src/lib/server/**']
        }
      },
      {
        // Node.js tests for stores, utilities, database
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
        }
      }
    ]
  }
});
```

---

## Troubleshooting

### Common Issues

#### Playwright Browser Not Found

```
Error: browserType.launch: Executable doesn't exist
```

**Solution:** Install Playwright browsers:

```bash
pnpm exec playwright install
# Or install with system dependencies
pnpm exec playwright install --with-deps chromium
```

#### IndexedDB Not Working in Tests

```
Error: indexedDB is not defined
```

**Solution:** Import `fake-indexeddb/auto` at the top of your test file:

```typescript
import 'fake-indexeddb/auto';
```

#### Svelte Component Tests Fail to Import

```
Error: Cannot find module '$lib/components/...'
```

**Solution:** Ensure your test file ends with `.svelte.spec.ts` so it runs in the browser project, not the Node.js project.

#### Tests Hang or Timeout

**Solution:** Check for unresolved promises or missing async/await:

```typescript
// ❌ Wrong - missing await
it('should create habit', () => {
  const id = createHabit({ name: 'Test', emoji: '🧪', color: '#000' });
  expect(id).toBeGreaterThan(0);
});

// ✅ Correct
it('should create habit', async () => {
  const id = await createHabit({ name: 'Test', emoji: '🧪', color: '#000' });
  expect(id).toBeGreaterThan(0);
});
```

#### Database State Leaks Between Tests

**Solution:** Clear database tables in `beforeEach` and `afterEach`:

```typescript
beforeEach(async () => {
  await db.habits.clear();
  await db.logs.clear();
  await db.syncQueue.clear();
});
```

#### Supabase Tests Fail with Network Error

**Solution:** Ensure you have valid Supabase credentials in `.env`:

```bash
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
```

For CI, skip Supabase tests or use a test project:

```typescript
import { describe, it, expect } from 'vitest';

const SKIP_SUPABASE = !process.env.PUBLIC_SUPABASE_URL;

describe.skipIf(SKIP_SUPABASE)('Supabase Connection', () => {
  // tests...
});
```

---

## Best Practices

1. **Write Tests First** - Use TDD for complex business logic
2. **Keep Tests Fast** - Use in-memory databases, avoid network calls
3. **Test Behavior, Not Implementation** - Focus on what, not how
4. **One Assertion Per Test** - Keep tests focused and readable
5. **Use Descriptive Names** - `should calculate streak for consecutive days`
6. **Clean Up State** - Always reset database between tests
7. **Mock External Services** - Don't rely on network in unit tests

---

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development setup and workflow
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API.md](./API.md) - Data models and endpoints
