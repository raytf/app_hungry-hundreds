# Architecture

## Overview

Hungry Hundreds is a habit-tracking PWA with an animated monster companion that evolves based on streak consistency. This document outlines the system architecture, tech stack, and key design patterns.

## Tech Stack

| Layer               | Technology               | Purpose                              |
| ------------------- | ------------------------ | ------------------------------------ |
| Framework           | SvelteKit (SPA mode)     | 15KB core, compiles to vanilla JS    |
| Character Animation | Rive                     | State machines for monster evolution |
| UI Animation        | Motion One               | 2.6KB micro-interactions             |
| Offline Storage     | Dexie.js                 | IndexedDB wrapper (29KB)             |
| Backend             | Supabase                 | PostgreSQL + Auth + Edge Functions   |
| Push Notifications  | Firebase Cloud Messaging | Cross-platform delivery              |
| Hosting             | Cloudflare Pages         | 300+ edges, $0 bandwidth             |

**Performance Targets:** Bundle <75KB | Load <2.5s on 3G | 100% offline reliability

### Frontend Framework

- **SvelteKit 2.x** - Full-stack framework with file-based routing (SPA mode)
- **Svelte 5.x** - Component framework with runes-based reactivity
- **TypeScript** - Type safety and enhanced developer experience

### Animation

- **Rive (@rive-app/canvas)** - Monster character animations with state machines
- **Motion** - Lightweight micro-interactions and UI feedback (2.6KB)

### Offline Storage

- **Dexie.js** - IndexedDB wrapper for local-first data persistence
- **Service Worker** - Cache-first asset loading, network-first API calls

### Backend Services

- **Supabase** - PostgreSQL database with Row Level Security
- **Supabase Auth** - User authentication and session management
- **Supabase Edge Functions** - Serverless API endpoints (Deno runtime)
- **Firebase Cloud Messaging** - Push notifications for reminders

### Styling

- **Tailwind CSS 4.x** - Utility-first CSS framework with Vite plugin
- **Custom Design System** - Hungry-themed color palette and component classes
- **Google Fonts** - Fredoka font family for playful typography

### Deployment

- **Cloudflare Pages** - Edge deployment platform (300+ edges)
- **@sveltejs/adapter-cloudflare** - SvelteKit adapter for Cloudflare Workers
- **Wrangler** - Cloudflare development and deployment CLI

### Development Tools

- **Vite 7.x** - Build tool and dev server
- **Vitest** - Unit testing framework
- **Playwright** - End-to-end testing
- **ESLint + Prettier** - Code quality and formatting

## Project Structure

```
hungryhundreds/
├── src/
│   ├── app.html
│   ├── routes/
│   │   ├── +page.svelte          # Home (habit list)
│   │   ├── +layout.svelte        # App shell
│   │   ├── onboard/+page.svelte  # First-time setup
│   │   ├── check-in/+page.svelte # Daily habit logging
│   │   ├── dashboard/+page.svelte # Analytics/streaks
│   │   └── settings/+page.svelte  # User preferences
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Monster.svelte     # Rive character
│   │   │   ├── HabitCard.svelte   # Individual habit item
│   │   │   └── StreakBadge.svelte # Streak indicator
│   │   ├── stores/
│   │   │   ├── habits.ts          # Habit state management
│   │   │   └── auth.ts            # User session
│   │   ├── db.ts                  # Dexie schema (local storage)
│   │   ├── api.ts                 # Supabase client
│   │   └── sync.ts                # Offline sync logic
│   └── service-worker.ts
├── static/
│   ├── manifest.json
│   ├── icon-192.png
│   ├── icon-512.png
│   └── animations/
│       └── monster.riv
├── supabase/
│   └── functions/
│       ├── complete-habit/        # Habit completion endpoint
│       └── daily-reminder/        # Push notification cron
├── svelte.config.js
├── vite.config.ts
└── package.json
```

## Design Patterns

### State Management

- **Svelte Stores** - Reactive state management using writable and derived stores
- **Store Location** - `src/lib/stores/` for global application state
- **Dexie.js** - Local IndexedDB storage for offline-first data persistence
- **Sync Queue** - Pending operations stored locally, synced when online

### Offline-First Architecture

- **Local-first Priority** - All operations save to Dexie immediately
- **Background Sync** - SyncQueue processes when connectivity restored
- **Server Authoritative** - Supabase is source of truth on conflicts (last-write-wins)
- **Optimistic UI** - Immediate feedback on user actions

### Component Architecture

- **Atomic Design** - Small, reusable components composed into larger features
- **Props-based API** - Components receive data via props
- **Svelte 5 Runes** - Modern reactivity with `$state`, `$derived`, `$effect`

### Routing

- **File-based Routing** - SvelteKit's convention-based routing in `src/routes/`
- **Layout Hierarchy** - Root layout (`+layout.svelte`) provides app shell
- **Page Components** - `+page.svelte` files define route content

### Styling Strategy

- **Utility-first** - Tailwind CSS utilities for rapid development
- **Component Classes** - Custom classes in `app.css` for common patterns
- **Dynamic Colors** - Habit colors applied via inline styles

## Data Models

### Local Storage (Dexie.js)

```typescript
// src/lib/db.ts
interface Habit {
  id?: number;
  serverId?: string;        // Supabase UUID after sync
  name: string;
  color: string;            // Hex color
  reminderTime?: string;    // HH:MM format
  createdAt: number;        // Unix timestamp
  updatedAt: number;
}

interface HabitLog {
  id?: number;
  serverId?: string;
  habitId: number;
  date: string;             // YYYY-MM-DD
  completedAt: number;      // Unix timestamp
  synced: boolean;
}

interface SyncQueue {
  id?: number;
  action: 'create' | 'update' | 'delete';
  table: 'habits' | 'logs';
  payload: any;
  timestamp: number;
  retries: number;
}
```

### Monster Evolution

| Stage | Streak Days | Animation State         |
| ----- | ----------- | ----------------------- |
| Egg   | 0           | idle_egg                |
| Baby  | 1-6         | idle_baby, happy_baby   |
| Teen  | 7-29        | idle_teen, happy_teen   |
| Adult | 30-99       | idle_adult, happy_adult |
| Elder | 100+        | idle_elder, happy_elder |

Rive state machine inputs:

- `evolutionStage` (number 0-4)
- `isHappy` (boolean, true on habit completion)
- `triggerCelebrate` (trigger, on milestone)

## Key Technical Decisions

### Why SvelteKit?

- **Performance** - 15KB core, minimal runtime overhead
- **Developer Experience** - Simple syntax, less boilerplate than React/Vue
- **SPA Mode** - Optimized for PWA with client-side routing
- **Edge Deployment** - Native Cloudflare Workers support

### Why Supabase?

- **PostgreSQL** - Robust relational database with Row Level Security
- **Built-in Auth** - User authentication out of the box
- **Edge Functions** - Serverless Deno functions for API logic
- **Realtime** - Future capability for sync across devices

### Why Dexie.js?

- **IndexedDB Wrapper** - Simple API for complex IndexedDB operations
- **29KB Bundle** - Lightweight for PWA constraints
- **Offline-First** - Critical for 100% offline reliability target
- **Reactive Queries** - Works well with Svelte stores

### Why Rive?

- **State Machines** - Complex character animations with triggers
- **Small Files** - Efficient animation format for mobile
- **Runtime Control** - Dynamic evolution stages based on streaks

### Why Cloudflare?

- **Edge Performance** - 300+ global CDN locations
- **Free Tier** - $0 bandwidth for static assets
- **Fast Deploys** - Instant global propagation

## Data Flow

### Habit Completion Flow

```
1. User taps "Done" on habit
2. UI: Button springs (Motion One)
3. Local: Insert log into Dexie, update streak store
4. Monster: Trigger happy animation, check evolution
5. Background: Add to syncQueue if offline, else POST to Supabase
6. Server: Insert log, return canonical streak
7. Reconcile: If server streak differs, update local
```

### Offline Sync Strategy

```
Priority: Local-first, server-authoritative

On action (create/update/delete):
  1. Apply to Dexie immediately
  2. Add to syncQueue with timestamp

On connectivity restored:
  1. Process syncQueue oldest-first
  2. For each item:
     - POST to Supabase
     - On success: remove from queue, update serverId
     - On conflict (409): fetch server state, merge (last-write-wins)
     - On failure: increment retries, retry with backoff (max 5)
  3. After queue empty: full sync (GET all user data since lastSync)
```

## Core Features

### 1. Habit Management

- Create/edit/delete habits with name, color, reminder time
- Maximum 10 habits per user (MVP)
- Soft delete with 30-day recovery window

### 2. Daily Check-in

- Tap to mark habit complete for today
- Visual feedback: button spring animation (Motion One)
- Immediate local save (Dexie), background sync (Supabase)
- Cannot complete future dates; can backfill past 7 days

### 3. Streak Tracking

- Current streak: consecutive days completed
- Best streak: all-time record
- Streak calculated locally first, server authoritative on sync

### 4. Push Notifications

- Daily reminder at user-configured time
- Streak milestone celebrations (7, 30, 100 days)
- Re-engagement after 3 days inactive

## Performance Budgets

| Metric        | Target          | Measurement                                   |
| ------------- | --------------- | --------------------------------------------- |
| Bundle (gzip) | <75KB           | `pnpm build && ls -la .svelte-kit/cloudflare` |
| LCP           | <2.5s           | Lighthouse on 3G throttle                     |
| FID           | <100ms          | Lighthouse                                    |
| CLS           | <0.1            | Lighthouse                                    |
| Offline       | 100% functional | Manual test: airplane mode                    |

## Service Worker

The service worker (`src/service-worker.ts`) provides:

- **Install**: Cache app shell assets
- **Activate**: Clean old caches
- **Fetch**: Cache-first for assets, network-first for API
- **Push**: Handle push notification display
- **Notification Click**: Open app to relevant page

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup and development workflow
- [API.md](./API.md) - Data models and Supabase endpoints
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Cloudflare deployment process
- [TECH_SPEC.md](./TECH_SPEC.md) - Full technical specification
