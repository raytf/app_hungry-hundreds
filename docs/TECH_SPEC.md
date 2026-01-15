# HUNGRY HUNDREDS - Technical Specification

> Habit-tracking PWA with animated monster companion that evolves based on streak consistency.

## Stack Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| Framework | SvelteKit (SPA mode) | 15KB core, compiles to vanilla JS |
| Character Animation | Rive | State machines for monster evolution |
| UI Animation | Motion One | 2.6KB micro-interactions |
| Offline Storage | Dexie.js | IndexedDB wrapper (29KB) |
| Backend | Supabase | PostgreSQL + Auth + Edge Functions |
| Push Notifications | Firebase Cloud Messaging | Cross-platform delivery |
| Hosting | Cloudflare Pages | 300+ edges, $0 bandwidth |

**Targets:** Bundle <75KB | Load <2.5s on 3G | 100% offline reliability

---

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
│   │   ├── db.ts                  # Dexie schema
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
│       ├── complete-habit/
│       └── daily-reminder/
├── svelte.config.js
├── vite.config.ts
└── package.json
```

---

## Data Models

### Local (Dexie.js)

```typescript
// src/lib/db.ts
import Dexie, { type Table } from 'dexie';

export interface Habit {
  id?: number;
  serverId?: string;        // Supabase UUID after sync
  name: string;
  color: string;            // Hex color
  reminderTime?: string;    // HH:MM format
  createdAt: number;        // Unix timestamp
  updatedAt: number;
}

export interface HabitLog {
  id?: number;
  serverId?: string;
  habitId: number;
  date: string;             // YYYY-MM-DD
  completedAt: number;      // Unix timestamp
  synced: boolean;
}

export interface SyncQueue {
  id?: number;
  action: 'create' | 'update' | 'delete';
  table: 'habits' | 'logs';
  payload: any;
  timestamp: number;
  retries: number;
}

export class HungryHundredsDB extends Dexie {
  habits!: Table<Habit>;
  logs!: Table<HabitLog>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super('HungryHundreds');
    this.version(1).stores({
      habits: '++id, serverId, createdAt',
      logs: '++id, serverId, [habitId+date], completedAt, synced',
      syncQueue: '++id, timestamp'
    });
  }
}

export const db = new HungryHundredsDB();
```

### Remote (Supabase PostgreSQL)

```sql
-- Users handled by Supabase Auth

CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3498db',
  reminder_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, habit_id, logged_date)
);

CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);

-- Row Level Security
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own logs" ON habit_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_logs_user_date ON habit_logs(user_id, logged_date);
CREATE INDEX idx_logs_habit_date ON habit_logs(habit_id, logged_date);

-- Function: Calculate current streak
CREATE OR REPLACE FUNCTION get_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
BEGIN
  LOOP
    IF EXISTS (
      SELECT 1 FROM habit_logs 
      WHERE habit_id = p_habit_id AND logged_date = check_date
    ) THEN
      streak := streak + 1;
      check_date := check_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN streak;
END;
$$ LANGUAGE plpgsql;
```

---

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

### 4. Monster Evolution
Five stages based on longest active streak:
| Stage | Streak Days | Animation State |
|-------|-------------|-----------------|
| Egg | 0 | idle_egg |
| Baby | 1-6 | idle_baby, happy_baby |
| Teen | 7-29 | idle_teen, happy_teen |
| Adult | 30-99 | idle_adult, happy_adult |
| Elder | 100+ | idle_elder, happy_elder |

Rive state machine inputs:
- `evolutionStage` (number 0-4)
- `isHappy` (boolean, true on habit completion)
- `triggerCelebrate` (trigger, on milestone)

### 5. Push Notifications
- Daily reminder at user-configured time
- Streak milestone celebrations (7, 30, 100 days)
- Re-engagement after 3 days inactive

---

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

---

## Configuration

### svelte.config.js
```javascript
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: { include: ['/*'], exclude: ['<all>'] }
    }),
    serviceWorker: { register: false }, // Manual registration
    alias: { '$lib': './src/lib' }
  }
};
```

### vite.config.ts
```typescript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  build: {
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: { manualChunks: { rive: ['@rive-app/canvas'] } }
    }
  }
});
```

### manifest.json
```json
{
  "name": "Hungry Hundreds",
  "short_name": "Hungry",
  "description": "Build habits, grow your monster",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#e94560",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Environment Variables
```bash
# .env.local (not committed)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=xxx
PUBLIC_FIREBASE_API_KEY=xxx
PUBLIC_FIREBASE_PROJECT_ID=xxx
PUBLIC_FIREBASE_VAPID_KEY=xxx
```

---

## Service Worker

```typescript
// src/service-worker.ts
/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

import { build, files, version } from '$service-worker';

const CACHE_NAME = `cache-${version}`;
const ASSETS = [...build, ...files];

// Install: cache app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (url.pathname.startsWith('/api') || url.origin.includes('supabase')) {
    // Network first for API
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    );
  } else {
    // Cache first for assets
    event.respondWith(
      caches.match(request).then(cached => cached || fetch(request))
    );
  }
});

// Push notification handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Hungry Hundreds', {
      body: data.body || 'Time to check in!',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/' }
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data.url)
  );
});
```

---

## API Endpoints (Supabase Edge Functions)

### POST /functions/v1/complete-habit
```typescript
// supabase/functions/complete-habit/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  );

  const { habit_id, logged_date } = await req.json();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ user_id: user.id, habit_id, logged_date }, { onConflict: 'user_id,habit_id,logged_date' })
    .select()
    .single();

  if (error) return new Response(JSON.stringify({ error }), { status: 400 });

  // Calculate streak
  const { data: streak } = await supabase.rpc('get_habit_streak', { p_habit_id: habit_id });

  return new Response(JSON.stringify({ log: data, streak }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

### POST /functions/v1/daily-reminder (Scheduled)
```typescript
// supabase/functions/daily-reminder/index.ts
// Triggered by Supabase cron at minute intervals
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async () => {
  // Query users with reminder_time matching current hour
  // Send FCM to each user's push_subscriptions
  // Implementation uses Firebase Admin SDK
});
```

---

## UI Components

### Monster.svelte
```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { Rive, StateMachineInput } from '@rive-app/canvas';
  import { currentStreak } from '$lib/stores/habits';
  
  let canvas: HTMLCanvasElement;
  let rive: Rive;
  let evolutionInput: StateMachineInput;
  let happyInput: StateMachineInput;
  
  function getEvolutionStage(streak: number): number {
    if (streak >= 100) return 4; // Elder
    if (streak >= 30) return 3;  // Adult
    if (streak >= 7) return 2;   // Teen
    if (streak >= 1) return 1;   // Baby
    return 0; // Egg
  }
  
  onMount(() => {
    rive = new Rive({
      src: '/animations/monster.riv',
      canvas,
      autoplay: true,
      stateMachines: 'MonsterStateMachine',
      onLoad: () => {
        evolutionInput = rive.stateMachineInputs('MonsterStateMachine')
          .find(i => i.name === 'evolutionStage');
        happyInput = rive.stateMachineInputs('MonsterStateMachine')
          .find(i => i.name === 'isHappy');
      }
    });
    
    return () => rive?.cleanup();
  });
  
  $: if (evolutionInput) evolutionInput.value = getEvolutionStage($currentStreak);
  
  export function triggerHappy() {
    if (happyInput) {
      happyInput.value = true;
      setTimeout(() => happyInput.value = false, 2000);
    }
  }
</script>

<canvas bind:this={canvas} width={300} height={300} />
```

### HabitCard.svelte
```svelte
<script lang="ts">
  import { animate, spring } from 'motion';
  import { completeHabit } from '$lib/stores/habits';
  import type { Habit } from '$lib/db';
  
  export let habit: Habit;
  export let completed: boolean;
  export let onComplete: () => void;
  
  let button: HTMLButtonElement;
  
  async function handleComplete() {
    if (completed) return;
    
    // Spring animation
    animate(button, { scale: [1, 1.2, 1] }, { easing: spring() });
    
    await completeHabit(habit.id!);
    onComplete();
  }
</script>

<div class="habit-card" style="--color: {habit.color}">
  <span class="name">{habit.name}</span>
  <button 
    bind:this={button}
    on:click={handleComplete}
    class:completed
    disabled={completed}
  >
    {completed ? '✓' : '○'}
  </button>
</div>
```

---

## Performance Budgets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Bundle (gzip) | <75KB | `pnpm build && ls -la .svelte-kit/cloudflare` |
| LCP | <2.5s | Lighthouse on 3G throttle |
| FID | <100ms | Lighthouse |
| CLS | <0.1 | Lighthouse |
| Offline | 100% functional | Manual test: airplane mode |

---

## Setup Commands

```bash
# Create project
pnpm create svelte@latest hungryhundreds
cd hungryhundreds

# Install dependencies
pnpm add dexie @rive-app/canvas motion @supabase/supabase-js firebase

# Dev server
pnpm dev

# Build & preview
pnpm build
pnpm preview

# Deploy to Cloudflare
pnpm dlx wrangler pages deploy .svelte-kit/cloudflare
```

---

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
