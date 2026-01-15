# Development Guide

## Prerequisites

- **Node.js** - v18 or higher
- **pnpm** - Package manager (recommended) or npm/yarn
- **Git** - Version control
- **Supabase CLI** - For local backend development (optional)

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd hungryhundreds
pnpm install
```

### 2. Install Dependencies

The project uses the following key dependencies:

```bash
# Core dependencies (installed via pnpm install)
pnpm add dexie @rive-app/canvas motion @supabase/supabase-js firebase
```

| Package                 | Purpose                                         | Size                 |
| ----------------------- | ----------------------------------------------- | -------------------- |
| `dexie`                 | IndexedDB wrapper for offline storage           | 29KB                 |
| `@rive-app/canvas`      | Rive animation runtime                          | ~150KB (lazy loaded) |
| `motion`                | Motion One micro-interactions                   | 2.6KB                |
| `@supabase/supabase-js` | Supabase client SDK                             | ~35KB                |
| `firebase`              | Firebase Cloud Messaging for push notifications | ~50KB                |

### 3. Environment Configuration

Create `.env.local` in the project root (not committed to git):

```bash
# Supabase
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx

# Firebase Cloud Messaging
PUBLIC_FIREBASE_API_KEY=xxx
PUBLIC_FIREBASE_PROJECT_ID=xxx
PUBLIC_FIREBASE_VAPID_KEY=xxx
```

**Getting credentials:**

1. **Supabase**: Create a project at [supabase.com](https://supabase.com), copy URL and anon key from Settings → API
2. **Firebase**: Create a project at [console.firebase.google.com](https://console.firebase.google.com), enable Cloud Messaging, generate VAPID key

### 4. Start Development Server

```bash
pnpm dev
# or
pnpm dev -- --open  # Opens browser automatically
```

The app will be available at `http://localhost:5173`

## Development Workflow

### Project Scripts

```bash
# Development
pnpm dev              # Start dev server
pnpm dev -- --open    # Start dev server and open browser

# Building
pnpm build            # Build for production
pnpm preview          # Preview production build locally

# Code Quality
pnpm check            # Type-check with svelte-check
pnpm check:watch      # Type-check in watch mode
pnpm lint             # Run ESLint and Prettier checks
pnpm format           # Format code with Prettier

# Testing
pnpm test:unit        # Run Vitest unit tests
pnpm test:e2e         # Run Playwright e2e tests
pnpm test             # Run all tests

# Type Generation
pnpm types            # Generate Cloudflare Worker types
```

### File Structure Conventions

#### Routes (`src/routes/`)

- `+page.svelte` - Page component
- `+layout.svelte` - Layout wrapper (app shell)
- SPA mode - Client-side routing for PWA

#### Components (`src/lib/components/`)

- Use PascalCase for filenames: `HabitCard.svelte`, `Monster.svelte`
- Use Svelte 5 runes for props: `let { prop } = $props()`
- Use TypeScript for type safety

#### Stores (`src/lib/stores/`)

- Use camelCase for TypeScript files: `habits.ts`, `auth.ts`
- Export store instance and helper functions
- Use writable/readable/derived from `svelte/store`

#### Core Library Files (`src/lib/`)

- `db.ts` - Dexie database schema and instance
- `api.ts` - Supabase client configuration
- `sync.ts` - Offline sync queue logic

### Styling Guidelines

#### Tailwind CSS

- Use utility classes for most styling
- Avoid custom CSS unless necessary
- Use custom component classes from `app.css`:
  - `.btn-primary` - Primary buttons
  - `.card` - Card containers
  - `.page-container` - Page wrappers

#### Custom Colors

```javascript
// Hungry theme colors (defined in tailwind.config.js)
hungry - 50; // #f0fdf4 - Lightest green
hungry - 100; // #dcfce7
hungry - 500; // #22c55e - Primary green
hungry - 600; // #16a34a - Hover state
hungry - 700; // #15803d - Active state
```

#### Typography

- **Display Font**: Fredoka (headings, buttons)
- **Body Font**: System sans-serif
- Use `font-display` class for headings

### Component Development

#### Creating a New Component

1. Create file in `src/lib/components/ComponentName.svelte`
2. Define props and types:

```svelte
<script lang="ts">
	interface Props {
		title: string;
		count?: number;
	}

	let { title, count = 0 }: Props = $props();
</script>

<div class="card">
	<h2>{title}</h2>
	<p>{count}</p>
</div>
```

3. Export from `src/lib/index.ts` if needed:

```typescript
export { default as ComponentName } from './components/ComponentName.svelte';
```

#### Using Stores with Dexie

```svelte
<script lang="ts">
	import { habits, currentStreak } from '$lib/stores/habits';
	import { db } from '$lib/db';

	// Subscribe to store
	$: habitList = $habits;
	$: streak = $currentStreak;
</script>

<p>Current streak: {streak} days</p>
```

### State Management

#### Habit Store with Dexie Integration

```typescript
// src/lib/stores/habits.ts
import { writable, derived } from 'svelte/store';
import { db, type Habit, type HabitLog } from '$lib/db';
import { syncQueue } from '$lib/sync';

export const habits = writable<Habit[]>([]);
export const currentStreak = writable<number>(0);

export async function completeHabit(habitId: number) {
  const today = new Date().toISOString().split('T')[0];
  const log: HabitLog = {
    habitId,
    date: today,
    completedAt: Date.now(),
    synced: false
  };

  // Save locally first
  await db.logs.add(log);

  // Queue for sync
  await syncQueue.add('create', 'logs', log);
}
```

#### Offline Sync Pattern

```typescript
// src/lib/sync.ts
import { db, type SyncQueue } from '$lib/db';
import { supabase } from '$lib/api';

export async function processQueue() {
  const pending = await db.syncQueue.orderBy('timestamp').toArray();

  for (const item of pending) {
    try {
      await syncToSupabase(item);
      await db.syncQueue.delete(item.id);
    } catch (error) {
      await db.syncQueue.update(item.id, { retries: item.retries + 1 });
    }
  }
}
```

## Testing

### Unit Tests (Vitest)

Create tests alongside components:

```
src/lib/components/
  HabitCard.svelte
  HabitCard.spec.ts
```

Example test:

```typescript
import { render } from '@testing-library/svelte';
import HabitCard from './HabitCard.svelte';

test('displays habit name', () => {
  const { getByText } = render(HabitCard, {
    props: { habit: { name: 'Test Habit', /* ... */ } }
  });
  expect(getByText('Test Habit')).toBeInTheDocument();
});
```

### E2E Tests (Playwright)

Located in `e2e/` directory:

```typescript
import { test, expect } from '@playwright/test';

test('can toggle habit', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="habit-toggle"]');
  await expect(page.locator('.completed')).toBeVisible();
});
```

## Common Tasks

### Adding a New Habit Field

1. Update Dexie schema in `src/lib/db.ts`
2. Update Supabase table (migration)
3. Update `HabitCard.svelte` to display new field
4. Update sync logic in `src/lib/sync.ts`

### Working with Rive Animations

1. Edit animation in Rive editor
2. Export `.riv` file to `static/animations/`
3. Update state machine inputs in `Monster.svelte`

### Testing Offline Mode

1. Build the app: `pnpm build`
2. Preview with service worker: `pnpm preview`
3. Open DevTools → Network → check "Offline"
4. Verify all features work without network

### Supabase Local Development

```bash
# Start local Supabase
supabase start

# Apply migrations
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > src/lib/types/supabase.ts
```

## Troubleshooting

### Type Errors

```bash
pnpm check          # Check for type errors
pnpm types          # Regenerate Cloudflare types
```

### Build Errors

```bash
rm -rf .svelte-kit node_modules
pnpm install
pnpm build
```

### Tailwind Not Working

- Ensure Tailwind Vite plugin is in `vite.config.ts`
- Check `@tailwindcss/vite` is installed
- Restart dev server

### IndexedDB Issues

- Clear browser data in DevTools → Application → Storage
- Check Dexie schema version matches
- Ensure migrations handle schema changes

### Service Worker Not Updating

```bash
# Force update in DevTools
Application → Service Workers → Update on reload

# Or clear cache
Application → Storage → Clear site data
```

## Code Style

- Use TypeScript for type safety
- Prefer `const` over `let`
- Use Svelte 5 runes (`$state`, `$derived`, `$effect`)
- Keep components small and focused
- Extract reusable logic to stores or utilities
- Use semantic HTML elements
- Add ARIA labels for accessibility

## Testing Checklist

- [ ] Habit CRUD works offline
- [ ] Sync completes on reconnect without data loss
- [ ] Monster evolves at correct streak thresholds
- [ ] Push notifications deliver on Android
- [ ] Push notifications deliver on iOS (installed PWA)
- [ ] Service worker updates without breaking app
- [ ] All Lighthouse scores green
- [ ] Works on: Chrome, Safari, Firefox, Edge
- [ ] Installable on: iOS, Android, Desktop

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design patterns
- [API.md](./API.md) - Data models and Supabase endpoints
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment process
- [TECH_SPEC.md](./TECH_SPEC.md) - Full technical specification
