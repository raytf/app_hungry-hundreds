# Architecture

## Overview

Hungry Hundreds is a habit tracking application with a gamified monster evolution system. This document outlines the system architecture, tech stack, and key design patterns.

## Tech Stack

### Frontend Framework
- **SvelteKit 2.x** - Full-stack framework with file-based routing
- **Svelte 5.x** - Component framework with runes-based reactivity
- **TypeScript** - Type safety and enhanced developer experience

### Styling
- **Tailwind CSS 4.x** - Utility-first CSS framework with Vite plugin
- **Custom Design System** - Hungry-themed color palette and component classes
- **Google Fonts** - Fredoka font family for playful typography

### Deployment
- **Cloudflare Pages** - Edge deployment platform
- **@sveltejs/adapter-cloudflare** - SvelteKit adapter for Cloudflare Workers
- **Wrangler** - Cloudflare development and deployment CLI

### Development Tools
- **Vite 7.x** - Build tool and dev server
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **ESLint + Prettier** - Code quality and formatting
- **MDsveX** - Markdown support in Svelte components

## Project Structure

```
src/
├── routes/                    # SvelteKit file-based routing
│   ├── +layout.svelte        # Root layout with bottom navigation
│   ├── +page.svelte          # Home page (today's habits)
│   ├── onboard/              # Onboarding flow
│   ├── habits/               # Habit management
│   │   ├── +page.svelte      # All habits list
│   │   └── new/+page.svelte  # Create new habit
│   ├── dashboard/            # Statistics and analytics
│   └── settings/             # App settings
├── lib/
│   ├── components/           # Reusable UI components
│   │   ├── BottomNav.svelte  # Bottom navigation bar
│   │   ├── Header.svelte     # Page header component
│   │   ├── HabitCard.svelte  # Individual habit display
│   │   ├── HabitForm.svelte  # Habit creation/edit form
│   │   ├── MonsterDisplay.svelte  # Monster visualization
│   │   ├── ProgressRing.svelte    # Circular progress indicator
│   │   └── StatsCard.svelte       # Statistics display card
│   ├── stores/               # Svelte stores for state management
│   │   └── habits.js         # Habit state and operations
│   └── data/                 # Mock data and constants
│       └── mockData.js       # Sample habits, monster, stats
└── static/                   # Static assets
    └── favicon.png
```

## Design Patterns

### State Management
- **Svelte Stores** - Reactive state management using writable and derived stores
- **Store Location** - `src/lib/stores/` for global application state
- **Mock Data** - Temporary mock data in `src/lib/data/mockData.js` (to be replaced with API/database)

### Component Architecture
- **Atomic Design** - Small, reusable components composed into larger features
- **Props-based API** - Components receive data via props and emit events
- **Event Dispatching** - Child components communicate with parents via `createEventDispatcher()`

### Routing
- **File-based Routing** - SvelteKit's convention-based routing in `src/routes/`
- **Layout Hierarchy** - Root layout (`+layout.svelte`) provides bottom navigation
- **Page Components** - `+page.svelte` files define route content

### Styling Strategy
- **Utility-first** - Tailwind CSS utilities for rapid development
- **Component Classes** - Custom classes in `app.css` for common patterns:
  - `.btn-primary` - Primary action buttons
  - `.card` - Card container styling
  - `.page-container` - Page layout wrapper
- **Inline Styles** - Dynamic colors and values via `style` attribute

## Data Models

### Habit
```typescript
interface Habit {
  id: number;
  name: string;
  emoji: string;
  color: string;          // Hex color code
  streak: number;         // Current streak count
  completedToday: boolean;
  reminderTime: string | null;  // HH:MM format or null
}
```

### Monster
```typescript
interface Monster {
  name: string;
  stage: 'egg' | 'baby' | 'teen' | 'adult' | 'elder';
  evolutionProgress: number;  // 0-100 percentage
}
```

### Stats
```typescript
interface Stats {
  completionRate: number;  // Overall completion percentage
  weeklyData: Array<{
    day: string;
    completed: number;
    total: number;
  }>;
}
```

## Key Technical Decisions

### Why SvelteKit?
- **Performance** - Minimal runtime overhead, compiled components
- **Developer Experience** - Simple syntax, less boilerplate than React/Vue
- **Full-stack Capability** - Server-side rendering and API routes in one framework
- **Edge Deployment** - Native Cloudflare Workers support

### Why Tailwind CSS 4?
- **Vite Plugin** - New architecture with better performance
- **Utility-first** - Rapid prototyping and consistent design
- **Custom Theme** - Easy to extend with brand colors and fonts

### Why Cloudflare?
- **Edge Performance** - Global CDN with low latency
- **Free Tier** - Generous limits for hobby projects
- **Workers Platform** - Serverless functions at the edge
- **Future-ready** - Easy to add D1 database, KV storage, R2 assets

### Mock Data Strategy
- **Phase 1** - UI foundation with mock data (current scope)
- **Phase 2** - Replace with Cloudflare D1 database and API routes
- **Phase 3** - Add authentication and user-specific data

## Component Communication

### Habit Toggle Flow
1. User clicks habit checkbox in `HabitCard.svelte`
2. Component calls `habits.toggle(id)` store method
3. Store updates habit state and streak
4. Reactive subscriptions update all dependent components
5. `todaysProgress` derived store recalculates automatically

### Form Submission Flow
1. User fills out `HabitForm.svelte`
2. Form dispatches `submit` event with habit data
3. Parent page component receives event
4. Calls `habits.add()` store method
5. Navigates to habits list page

## Future Architecture Considerations

### Database Integration
- Replace `src/lib/stores/habits.js` with API calls
- Add `src/routes/api/` endpoints for CRUD operations
- Use Cloudflare D1 for SQLite database

### Authentication
- Add auth provider (Clerk, Auth0, or Cloudflare Access)
- Protect routes with middleware
- User-specific habit data

### Monster Animation
- Replace emoji placeholder with Rive animations
- Add `@rive-app/canvas` package
- Create monster state machine in Rive editor

### Offline Support (PWA)
- Service worker for offline functionality
- IndexedDB for local data persistence
- Background sync for habit completions

## Performance Considerations

- **Code Splitting** - SvelteKit automatically splits routes
- **Lazy Loading** - Components loaded on-demand
- **Minimal JavaScript** - Svelte compiles to vanilla JS
- **Edge Caching** - Cloudflare CDN caches static assets
- **Optimistic UI** - Immediate feedback on habit toggles

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup and development workflow
- [API.md](./API.md) - Data models and future API endpoints
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Cloudflare deployment process

