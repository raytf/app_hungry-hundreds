# Development Guide

## Prerequisites

- **Node.js** - v18 or higher
- **pnpm** - Package manager (recommended) or npm/yarn
- **Git** - Version control

## Initial Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd sv-app
pnpm install
```

### 2. Environment Configuration

No environment variables required for Phase 1 (UI foundation with mock data).

For future phases with database/auth:
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start Development Server

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
- `+layout.svelte` - Layout wrapper
- `+server.js` - API endpoint (future)
- `+page.server.js` - Server-side data loading (future)

#### Components (`src/lib/components/`)
- Use PascalCase for filenames: `HabitCard.svelte`
- Export props with `export let propName`
- Use TypeScript for type safety
- Emit events with `createEventDispatcher()`

#### Stores (`src/lib/stores/`)
- Use camelCase for filenames: `habits.js`
- Export store instance and helper functions
- Use writable/readable/derived from `svelte/store`

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
hungry-50   // #f0fdf4 - Lightest green
hungry-100  // #dcfce7
hungry-500  // #22c55e - Primary green
hungry-600  // #16a34a - Hover state
hungry-700  // #15803d - Active state
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

#### Using Stores

```svelte
<script>
  import { habits, todaysProgress } from '$lib/stores/habits.js';
  
  // Subscribe with $ prefix
  $: currentHabits = $habits;
  $: progress = $todaysProgress;
</script>

<p>Completed: {progress.completed} / {progress.total}</p>
```

### Adding New Routes

1. Create directory in `src/routes/`
2. Add `+page.svelte` for the page content
3. Optionally add `+layout.svelte` for nested layouts
4. Update `BottomNav.svelte` if adding to main navigation

Example:
```
src/routes/
  profile/
    +page.svelte        # /profile
    edit/
      +page.svelte      # /profile/edit
```

### State Management

#### Habit Store Pattern

```javascript
// src/lib/stores/habits.js
import { writable, derived } from 'svelte/store';

function createHabitsStore() {
  const { subscribe, set, update } = writable([]);
  
  return {
    subscribe,
    toggle: (id) => update(habits => /* logic */),
    add: (habit) => update(habits => [...habits, habit]),
    remove: (id) => update(habits => habits.filter(h => h.id !== id)),
  };
}

export const habits = createHabitsStore();
```

#### Derived Stores

```javascript
export const todaysProgress = derived(habits, $habits => {
  const total = $habits.length;
  const completed = $habits.filter(h => h.completedToday).length;
  return { total, completed, pct: Math.round((completed / total) * 100) };
});
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

1. Update type in `src/lib/data/mockData.js`
2. Update `HabitForm.svelte` to include new field
3. Update `HabitCard.svelte` to display new field
4. Update store methods if needed

### Changing Theme Colors

1. Edit `tailwind.config.js` color definitions
2. Update component classes in `app.css` if needed
3. Update inline styles in components

### Adding Icons/Emojis

1. Add to emoji array in `HabitForm.svelte`
2. Or use icon library (future):
   ```bash
   pnpm add lucide-svelte
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

## Code Style

- Use TypeScript for type safety
- Prefer `const` over `let`
- Use arrow functions
- Keep components small and focused
- Extract reusable logic to stores or utilities
- Use semantic HTML elements
- Add ARIA labels for accessibility

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design patterns
- [API.md](./API.md) - Data models and API endpoints
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment process

