# Implementation Guide

## Overview

This guide provides step-by-step instructions for implementing the Hungry Hundreds UI foundation based on the technical specification. Use this as a checklist when building out the application.

## Phase 1: UI Foundation (Current Scope)

### Prerequisites Checklist

- [ ] SvelteKit project initialized
- [ ] Tailwind CSS 4.x configured with Vite plugin
- [ ] Cloudflare adapter installed and configured
- [ ] TypeScript enabled
- [ ] Google Fonts (Fredoka) imported

### Implementation Steps

#### 1. Configure Tailwind Theme

**File**: `tailwind.config.js`

Add to `theme.extend`:
```javascript
colors: {
  hungry: {
    50: '#f0fdf4',
    100: '#dcfce7',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
  }
},
fontFamily: {
  display: ['Fredoka', 'sans-serif'],
}
```

#### 2. Setup Global Styles

**File**: `src/routes/layout.css` or `src/app.css`

1. Import Google Fonts
2. Define component utility classes:
   - `.btn-primary`
   - `.card`
   - `.page-container`

See [COMPONENTS.md](./COMPONENTS.md) for exact CSS definitions.

#### 3. Create Mock Data

**File**: `src/lib/data/mockData.js`

Export:
- `mockHabits` - Array of 4 sample habits
- `mockMonster` - Monster state object
- `mockStats` - Statistics object with weekly data

**Data Structure**: See [API.md](./API.md) for complete schemas.

#### 4. Implement Habit Store

**File**: `src/lib/stores/habits.js`

Create store with methods:
- `toggle(id)` - Toggle habit completion
- `add(habit)` - Add new habit
- `reset()` - Reset to mock data

Create derived store:
- `todaysProgress` - Calculate completion percentage

#### 5. Build Core Components

Create in `src/lib/components/`:

**Priority Order**:
1. `BottomNav.svelte` - Navigation (needed for all pages)
2. `Header.svelte` - Page headers
3. `HabitCard.svelte` - Habit display
4. `ProgressRing.svelte` - Progress visualization
5. `MonsterDisplay.svelte` - Monster placeholder
6. `StatsCard.svelte` - Statistics display
7. `HabitForm.svelte` - Habit creation form

**Component Specs**: See [COMPONENTS.md](./COMPONENTS.md) for detailed props and usage.

#### 6. Create Route Structure

**Files to create**:

```
src/routes/
├── +layout.svelte         # Root layout with BottomNav
├── +page.svelte           # Home page (today's habits)
├── onboard/
│   └── +page.svelte       # Onboarding flow
├── habits/
│   ├── +page.svelte       # All habits list
│   └── new/
│       └── +page.svelte   # Create new habit
├── dashboard/
│   └── +page.svelte       # Statistics dashboard
└── settings/
    └── +page.svelte       # Settings page
```

#### 7. Implement Pages

**Home Page** (`src/routes/+page.svelte`):
- Display today's habits using `HabitCard`
- Show `MonsterDisplay` at top
- Show `ProgressRing` with today's completion
- Use `page-container` wrapper

**All Habits** (`src/routes/habits/+page.svelte`):
- List all habits from store
- Add "New Habit" button linking to `/habits/new`
- Show streak information

**New Habit** (`src/routes/habits/new/+page.svelte`):
- Render `HabitForm` component
- Handle submit event
- Call `habits.add()` store method
- Navigate back to `/habits` on success

**Dashboard** (`src/routes/dashboard/+page.svelte`):
- Display `StatsCard` components
- Show weekly completion chart
- Display overall completion rate

**Settings** (`src/routes/settings/+page.svelte`):
- Monster name customization
- Reset data option
- About/version information

**Onboarding** (`src/routes/onboard/+page.svelte`):
- Welcome screen
- Monster naming
- First habit creation
- Navigate to home on completion

#### 8. Root Layout

**File**: `src/routes/+layout.svelte`

Structure:
```svelte
<script>
  import BottomNav from '$lib/components/BottomNav.svelte';
  import '../app.css';
</script>

<div class="min-h-screen bg-gray-50">
  <slot />
  <BottomNav />
</div>
```

### Testing Checklist

- [ ] All routes accessible via bottom navigation
- [ ] Habit toggle updates streak correctly
- [ ] New habit form validation works
- [ ] Progress ring shows correct percentage
- [ ] Monster display shows correct stage
- [ ] Stats display accurate data
- [ ] Mobile responsive (test at 375px width)
- [ ] Safe area insets work on iOS

### Visual Testing

**Key Screens to Verify**:
1. Home page with 0 habits completed
2. Home page with all habits completed
3. Habits list with various streak counts
4. New habit form with all fields
5. Dashboard with weekly data
6. Settings page

**Responsive Breakpoints**:
- Mobile: 375px - 768px (primary target)
- Tablet: 768px - 1024px
- Desktop: 1024px+ (centered with max-width)

## Common Implementation Patterns

### Page Template

```svelte
<script>
  import Header from '$lib/components/Header.svelte';
  import { habits } from '$lib/stores/habits.js';
</script>

<Header title="Page Title" showBack={true} />

<div class="page-container">
  <!-- Page content -->
</div>
```

### Form Handling

```svelte
<script>
  import HabitForm from '$lib/components/HabitForm.svelte';
  import { habits } from '$lib/stores/habits.js';
  import { goto } from '$app/navigation';
  
  function handleSubmit(event) {
    habits.add(event.detail);
    goto('/habits');
  }
</script>

<HabitForm on:submit={handleSubmit} />
```

### List Rendering

```svelte
<script>
  import { habits } from '$lib/stores/habits.js';
  import HabitCard from '$lib/components/HabitCard.svelte';
</script>

<div class="space-y-3">
  {#each $habits as habit (habit.id)}
    <HabitCard {habit} />
  {/each}
</div>
```

## Styling Guidelines

### Mobile-First Approach

Start with mobile styles, add responsive variants:

```svelte
<div class="text-sm md:text-base lg:text-lg">
  Responsive text
</div>
```

### Consistent Spacing

Use Tailwind spacing scale:
- `gap-3` (12px) - Between cards
- `gap-4` (16px) - Between sections
- `p-4` (16px) - Card padding
- `px-4` (16px) - Page horizontal padding
- `pb-24` (96px) - Bottom padding for nav clearance

### Interactive States

Always include hover and active states:

```svelte
<button class="
  bg-hungry-500 
  hover:bg-hungry-600 
  active:bg-hungry-700
  transition-all
">
  Button
</button>
```

## Performance Optimization

### Code Splitting

SvelteKit automatically splits routes. No action needed.

### Image Optimization

For future image assets:
- Use WebP format
- Provide multiple sizes
- Use `loading="lazy"`

### Store Subscriptions

Unsubscribe automatically with `$` prefix:

```svelte
<!-- Good: Auto-unsubscribes -->
{#each $habits as habit}

<!-- Avoid: Manual subscription management -->
<script>
  const unsubscribe = habits.subscribe(value => {});
  onDestroy(unsubscribe);
</script>
```

## Debugging Tips

### Store State

View current store state:
```svelte
<pre>{JSON.stringify($habits, null, 2)}</pre>
```

### Reactive Statements

Log reactive changes:
```svelte
<script>
  $: console.log('Habits changed:', $habits);
</script>
```

### Component Props

Verify props received:
```svelte
<script>
  export let habit;
  $: console.log('Habit prop:', habit);
</script>
```

## Next Steps (Future Phases)

### Phase 2: Database Integration
1. Setup Cloudflare D1 database
2. Create database schema (see [API.md](./API.md))
3. Replace store methods with API calls
4. Add loading states
5. Implement error handling

### Phase 3: Authentication
1. Choose auth provider (Clerk, Auth0, etc.)
2. Add protected routes
3. User-specific data
4. Profile management

### Phase 4: Enhanced Features
1. Replace monster emoji with Rive animation
2. Add push notifications
3. Implement PWA features
4. Social sharing

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [COMPONENTS.md](./COMPONENTS.md) - Component reference
- [API.md](./API.md) - Data models
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide

