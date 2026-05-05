# UI Documentation

> Comprehensive reference for Hungry Hundreds UI architecture, pages, components, and design patterns.

## Overview

Hungry Hundreds uses a mobile-first, offline-capable PWA design built with SvelteKit and Tailwind CSS 4. The UI follows a consistent design language with the "Hungry" green theme, Fredoka display font, and card-based layouts.

**Design Principles:**

- **Gonn-centric** — The mascot is the visual anchor; the UI frames Gonn, not the other way around
- **Mobile-first** — Optimized for touch interactions and smaller screens
- **Offline-capable** — UI provides clear feedback for sync status
- **Warm and playful** — Warm neutral palette, rounded forms, generous whitespace; no clinical precision
- **No guilt** — Missed habits are communicated through Gonn's mood, never through red badges or warning UI
- **Accessible** — Keyboard navigation, ARIA labels, WCAG 2.1 AA contrast, focus rings

> **Design authority:** `docs/DESIGN_GUIDE.md` is the single source of truth for all visual and interaction decisions. This file documents the implemented state; the design guide documents the intent.

---

## Pages

### Route Structure

| Route               | Page          | Purpose                               | Status      |
| ------------------- | ------------- | ------------------------------------- | ----------- |
| `/`                 | Home          | Daily habit check-in with Gonn        | ✅ Complete |
| `/chat`             | Chat          | Full-screen conversation with Gonn    | ✅ Complete |
| `/habits`           | Habits List   | Detailed view of all habits           | ✅ Complete |
| `/habits/new`       | New Habit     | Create a new habit (full-page form)   | ✅ Complete |
| `/habits/[id]`      | Habit Detail  | View habit details and history        | ✅ Complete |
| `/habits/[id]/edit` | Edit Habit    | Edit an existing habit                | ✅ Complete |
| `/journey`          | Journey       | Stats, history, and milestones        | ✅ Complete |
| `/settings`         | Settings      | App preferences and sync              | ✅ Complete |
| `/onboard`          | Onboarding    | First-time conversational habit setup | ✅ Complete |
| `/auth/signin`      | Sign In       | User authentication                   | ✅ Complete |
| `/auth/signup`      | Sign Up       | Account creation                      | ✅ Complete |
| `/monster`          | Monster Debug | Dev-only Rive/mascot debug tools      | ✅ Complete |

### Page Details

#### Home (`/`)

**File:** `src/routes/+page.svelte`

**Purpose:** Primary daily interaction surface. The only screen showing the Rive canvas. Resting state for 95% of usage.

**Layout (target — Phase B/C/D of design system implementation):**

| Zone               | Height                     | Scrolls           | z-index | Content                            |
| ------------------ | -------------------------- | ----------------- | ------- | ---------------------------------- |
| Top bar            | 48px                       | No (fixed)        | 30      | Hamburger, date `<time>`, sync dot |
| Fire progress bar  | 6px                        | No (fixed)        | 25      | Today's completion gradient        |
| Habits scroll area | flex-1                     | **Yes**           | 20      | Habit cards on sky gradient        |
| Speech bubble zone | ~60–80px when visible      | No (fixed)        | 15      | Gonn's HTML dialogue bubble        |
| Rive canvas        | `min(100vw, 430px)` square | No (fixed bottom) | 10      | Gonn on ground surface             |
| Ground / safe area | canvas height + safe area  | No (fixed)        | 5       | Ground gradient behind Gonn        |

**Components Used:**

- `Header` (48px, date-only center, sync dot, hamburger → drawer)
- `FireProgressBar` (consumes `todaysProgress.pct`)
- `HabitCardCompact` (redesigned: circle indicator, success-soft tint)
- `SpeechBubble` (Svelte HTML/CSS, fixed zone above Gonn; typewriter text + 150 ms fade-between-messages; includes "Reply →" link to `/chat`)
- `MonsterDisplay` → `Monster.svelte` (Rive canvas, fixed bottom)

**Key Features:**

- Sky gradient background on habits scroll area
- Ground gradient behind fixed Gonn canvas
- Habits scroll uses `padding-bottom: calc(var(--gonn-size) + 80px)` to avoid overlapping Gonn
- No bottom navigation bar (drawer only)
- Empty state: centered message + HabitSuggestions
- All-done state: full fire bar + Gonn happy state (no banner needed)
- Real-time progress tracking
- Quick add habit link
- Monster head tracking — gaze follows cursor via `onmousemove` → `monsterLookAt()`
- Dialogue bubble is persistent until dismissed; replacement messages fade out old content before retyping
- **Chat triggers:** Transparent `<a href="/chat">` over Gonn's lower half (tap zone); "Reply →" link in SpeechBubble when visible

---

#### Chat (`/chat`)

**File:** `src/routes/chat/+page.svelte`

**Purpose:** Full-screen multi-turn conversation with Gonn. Aware of habit data, streaks, memory entries, and mascot state. Streams responses token-by-token.

**Layout:**

| Zone         | Description                                                                 |
| ------------ | --------------------------------------------------------------------------- |
| Header       | Back arrow → `/`, title "Gonn", sync dot                                    |
| Message list | `flex-1`, `overflow-y-auto`; suggestion chips on empty state                |
| Input bar    | `textarea` + send button; sticky to bottom; respects safe-area-inset-bottom |

**Components Used:**

- `Header` (with `showBack`)

**Entry Points:**

- Tap zone `<a>` over Gonn's lower half on the homepage
- "Reply →" link in `SpeechBubble` when Gonn is speaking
- Drawer nav item "Chat with Gonn" (accessible from every page)

**Key Features:**

- Session persisted to Dexie `chatSessions` table; resumed across app opens
- SSE streaming with live cursor `▊`
- Suggestion chips on empty state
- Error banner with dismiss
- `chatStore.newSession()` available for future "Start fresh" UI

**Navigation:**

- Back button → Home (`/`)

---

#### Habits List (`/habits`)

**File:** `src/routes/habits/+page.svelte`

**Purpose:** Complete list view of all habits with stats summary, edit/delete actions.

**Layout:**

1. Header with "+ New" action button
2. Stats summary card (total habits, total streak days)
3. Habit list section with edit/delete buttons
4. Quick action to add another habit
5. Delete confirmation modal (when deleting)

**Components Used:**

- `Header` (with `showSyncStatus`, right slot)
- `HabitCard` (for each habit, with `showEdit` enabled)

**Key Features:**

- Summary statistics
- Empty state for new users
- Sync status indicator in header
- Edit button on each habit card (navigates to edit page)
- Delete button with confirmation dialog
- Delete removes habit and all associated completion logs

---

#### New Habit (`/habits/new`)

**File:** `src/routes/habits/new/+page.svelte`

**Purpose:** Form for creating a new habit.

**Layout:**

1. Header with back button
2. Description text
3. HabitForm component
4. Tip text

**Components Used:**

- `Header` (with `showBack`)
- `HabitForm` (mode="create")

**Navigation:**

- Back button → Home (`/`)
- On submit → Habits list (`/habits`)

---

#### Habit Detail (`/habits/[id]`)

**File:** `src/routes/habits/[id]/+page.svelte`

**Purpose:** View one habit's current status, streak stats, and completion history.

**Layout:**

1. Header with back button
2. Habit summary card (emoji, name, schedule, edit action)
3. Statistics card (streak, totals, due/progress state)
4. Completion history section
5. Partial completion section (if configured)
6. Primary action buttons
7. Delete confirmation section

**Components Used:**

- `Header` (with `showBack`)
- `PeriodSelector`
- `HabitPeriodChart`
- `IntervalWindowList` (interval habits only)
- `CompletionLogList`

**Key Features:**

- Shows current streak label based on habit cadence (day/week/interval)
- Interval habits display due-today / overdue / next-due messaging
- Completion history can be filtered by 7 Days / Month / 3 Months / Custom
- Interval habits show window-by-window history with the rule that governed each window
- Individual completion log lists full vs partial completions and interval metadata
- Edit button navigates to `/habits/[id]/edit`

**Navigation:**

- Back button → previous page
- Edit button → `/habits/[id]/edit`
- Delete action → removes habit, then returns to Home (`/`)

---

#### Edit Habit (`/habits/[id]/edit`)

**File:** `src/routes/habits/[id]/edit/+page.svelte`

**Purpose:** Form for editing an existing habit, including deferred interval updates for `every-x-days` schedules.

**Layout:**

1. Header with back button and "Edit Habit" title
2. Description text
3. Pending interval notice with "Apply now and restart interval" action (when applicable)
4. HabitForm component (pre-populated with current habit data)
5. Error display (if update fails)

**Components Used:**

- `Header` (with `showBack`)
- `HabitForm` (mode="edit", with `initialValues`)

**Key Features:**

- Pre-populated form with existing habit name, emoji, color, reminder time
- For `every-x-days` habits, mid-window interval edits can be deferred via `pendingIntervalDays`
- Amber notice explains when a pending interval change will take effect
- Notice includes an explicit "Apply now and restart interval instead" escape hatch
- Loading state while submitting
- Error handling with user feedback
- Habit not found state with link back to habits list
- SSR-compatible with browser check

**Navigation:**

- Back button → Habits list (`/habits`)
- On submit → Habits list (`/habits`)
- "Apply now and restart interval instead" → Habit detail (`/habits/[id]`)

---

#### Journey (`/journey`)

**File:** `src/routes/journey/+page.svelte`

**Purpose:** Statistics and analytics view.

**Layout:**

1. Header
2. Today's progress card
3. Period selector + chart
4. Stats grid (2x2)
5. Motivation section

**Components Used:**

- `Header`
- `ProgressRing`
- `PeriodSelector`
- `PeriodChart`
- `StatsCard` (4 instances)

**Stats Displayed:**

- Today's progress with completion message
- Period-filtered completion chart
- Completion rate, active habits, total streak days, longest streak

---

#### Settings (`/settings`)

**File:** `src/routes/settings/+page.svelte`

**Purpose:** App configuration and user account management.

**Layout:**

1. Header
2. Monster settings (name input)
3. Account section (sign in/out)
4. Sync status section
5. App settings (notifications, dark mode - coming soon)
6. Data management (reset)
7. About section

**Components Used:**

- `Header`
- `SyncStatusIndicator` (full mode)

**Key Features:**

- Account status with sign in/out
- Detailed sync status with manual sync button
- Pending changes indicator
- Error display for sync issues
- Reset confirmation dialog
- Reset All Data clears the onboarding flag and replays onboarding

---

#### Onboarding (`/onboard`)

**File:** `src/routes/onboard/+page.svelte`

**Purpose:** Guest-first conversational onboarding that creates a user's first habit with minimal friction.

**Layout:** Seven-screen conversational flow:

1. **Egg** - Single CTA: “Feed me a habit →”
2. **Identity** - Motivational framing pills with auto-advance reply
3. **Habit** - Free-form text input with suggestion pills
4. **When?** - Reminder presets, inline custom time input, or skip
5. **Frequency** - Daily, weekly target, or every-x-days cadence
6. **Notifications** - Explicit browser prompt opt-in
7. **Reveal** - Final confirmation that commits to Dexie and returns home

**Components Used:**

- Route-local conversational UI (single-file stateful flow)
- Global `Toast.svelte` via root layout for the post-create account CTA

**Key Features:**

- One-question-per-screen flow with no progress stepper
- Suggestion pills fill the habit input without auto-submitting
- Exact suggestion matches inherit emoji, color, and reminder defaults
- Reminder presets pre-select the nearest match from suggestion data
- Notification permission is requested only after tapping “Yes, remind me”
- Habit is created only on the final reveal screen
- Guest users see a follow-up “Create account” toast after habit creation

---

#### Authentication Pages

**Files:**

- `src/routes/auth/+layout.svelte` - Minimal layout (no drawer, no sync)
- `src/routes/auth/signin/+page.svelte` - Sign in form
- `src/routes/auth/signup/+page.svelte` - Sign up form

**Common Features:**

- Centered card layout
- Monster emoji decoration
- Form validation with error display
- Loading states with spinner
- Links between sign in/sign up
- "Continue without account" option

---

#### Monster Debug (`/monster`)

**File:** `src/routes/monster/+page.svelte`

**Purpose:** Developer-only debug console for testing the Gonn mascot system, AI dialogue pipeline, and Rive animation controls.

**Layout:**

1. Header with title "Monster Debug" + head-tracking via `onmousemove`
2. Expression panel — override Gonn's facial expression
3. Satiation slider — drag to set satiation value
4. Force Stage panel — jump to any evolution stage
5. Actions panel — Feed / Reset buttons
6. **Dialogue: Fire a call** — trigger the AI dialogue pipeline
7. **Dialogue: Cache inspector** — view and clear Dexie dialogue cache
8. **Dialogue: Rate limit inspector** — check client throttle and server limits
9. **Dialogue: Rive typewriter test** — send custom text directly to the speech bubble
10. Live GonnState JSON dump
11. Live MascotState JSON dump

**Components Used:**

- `Header`
- `MonsterDisplay` (via root layout)

**AI Dialogue Panels (added Phase 7):**

| Panel                | Purpose                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Fire a call          | Choose interaction type, habit name, streak; calls `generateDialogue()` with the production `DialogueRequest` shape and shows LLM/cache badge |
| Cache inspector      | Lists all `dialogueCache` Dexie entries with hash + timestamp; Refresh / Clear buttons                                                        |
| Rate limit inspector | Shows production throttle key, last successful call for that key, client 12 s countdown, cache key, server limits, and edge logs link         |
| Rive typewriter test | Free-text input → `monsterSetDialogue()` → current HTML speech-bubble typewriter (legacy panel name kept)                                     |

**Key Features:**

- Interaction type selector: `tap`, `habit-complete`, `app-open`, `lapse-return`, `feast`, `evolution`, `regression`
- Cache hit detection: badge shows `📦 cache` or `🤖 llm` for each response
- Error display for throttle / auth failures, including the active throttle key
- `monsterSetDialogue` wired through store registration pattern (`registerMonsterSetDialogue`)

---

## Layouts

### Root Layout (`src/routes/+layout.svelte`)

**Purpose:** App shell providing consistent structure across all pages.

**Features:**

- Favicon and meta tags
- AuthGuard wrapper for protected routes
- Sync initialization on mount
- Toast component (global, rendered once here)

### Auth Layout (`src/routes/auth/+layout.svelte`)

**Purpose:** Minimal layout for authentication pages.

**Features:**

- No drawer navigation
- Full-height flex container
- Consistent styling with main app

---

## Components

All components are located in `src/lib/components/`.

### Navigation Components

#### Header

**File:** `src/lib/components/Header.svelte`

**Purpose:** Sticky page header with optional back button and sync status.

**Props:**

| Prop             | Type      | Default | Description                 |
| ---------------- | --------- | ------- | --------------------------- |
| `title`          | `string`  | `''`    | Header title text           |
| `showBack`       | `boolean` | `false` | Show back arrow button      |
| `showSyncStatus` | `boolean` | `false` | Show compact sync indicator |

**Slots:**

- `right` - Content for right side (Svelte 5 snippet)

**Usage:**

```svelte
<Header title="My Page" showBack showSyncStatus>
	{#snippet right()}
		<button>Action</button>
	{/snippet}
</Header>
```

**Styling:**

- Height: 56px (`h-14`)
- Sticky top with `z-10`
- Backdrop blur (`backdrop-blur-lg`)
- Max width: `max-w-lg`

---

#### Drawer Navigation (inside Header)

The hamburger drawer is the sole top-level navigation. Accessed via the `Menu` icon in every `Header`.

**Nav Items:**

| Route       | Label          | Icon (Lucide)   |
| ----------- | -------------- | --------------- |
| `/`         | Home           | `Home`          |
| `/habits`   | Habits         | `LayoutList`    |
| `/chat`     | Chat with Gonn | `MessageCircle` |
| `/journey`  | Journey        | `TrendingUp`    |
| `/settings` | Settings       | `Settings`      |

**Features:**

- 280px wide, `bg-surface-raised`, `border-radius: 0 20px 20px 0`
- 250ms `cubic-bezier(0.25, 0.1, 0.25, 1)` slide-in from left
- Overlay: `bg-overlay`; dismiss by clicking backdrop or pressing Escape
- Active state: `text-accent-warm` + `rgba(232,113,58,0.08)` background
- Dev-only "Monster Debug" section at bottom

---

### Habit Components

#### HabitCard

**File:** `src/lib/components/HabitCard.svelte`

**Purpose:** Interactive card for displaying and toggling habit completion, with optional edit action.

**Props:**

| Prop       | Type              | Required | Default | Description                  |
| ---------- | ----------------- | -------- | ------- | ---------------------------- |
| `habit`    | `HabitWithStatus` | Yes      | -       | Habit object                 |
| `showEdit` | `boolean`         | No       | `false` | Show edit button on the card |

**Visual States:**

- **Incomplete:** Light background, emoji icon, gray streak badge
- **Complete:** Green ring border, checkmark, green background, strike-through text

**Interactions:**

- Click toggle area → toggles completion
- Click edit button → navigates to `/habits/[id]/edit`
- Press feedback: `active:scale-[0.98]`

**Accessibility:**

- Toggle button with descriptive `aria-label`
- Dynamic label: "Mark [name] as complete/incomplete"
- Edit link with `aria-label`: "Edit [name]"

---

#### HabitForm

**File:** `src/lib/components/HabitForm.svelte`

**Purpose:** Form for creating and editing habits.

**Props:**

| Prop            | Type                     | Required | Default    | Description                   |
| --------------- | ------------------------ | -------- | ---------- | ----------------------------- |
| `onsubmit`      | `function`               | Yes      | -          | Callback with habit data      |
| `initialValues` | `Partial<HabitFormData>` | No       | `{}`       | Initial values for editing    |
| `mode`          | `'create' \| 'edit'`     | No       | `'create'` | Determines button text        |
| `isSubmitting`  | `boolean`                | No       | `false`    | Shows loading state on submit |

**Form Fields:**

1. **Habit Name** - Text input (required)
2. **Icon** - Emoji picker (8 preset emojis)
3. **Color** - Color picker (6 preset colors)
4. **Reminder Time** - Time input (optional)

**Preset Options:**

- **Emojis:** 🏃 📚 🧘 💧 💪 🎯 ✍️ 🛏️
- **Colors:** `#22c55e` (green), `#3b82f6` (blue), `#8b5cf6` (purple), `#ec4899` (pink), `#f97316` (orange), `#06b6d4` (cyan)

**Features:**

- Live preview card
- Disabled submit until name entered
- Mode-aware button text ("Create Habit" / "Save Changes")
- Loading spinner during submission
- Radio group accessibility for pickers

---

### Monster Components

#### Monster

**File:** `src/lib/components/Monster.svelte`

**Purpose:** Render the monster companion using Rive animations with emoji fallback.

**Props:**

| Prop      | Type           | Required | Default | Description             |
| --------- | -------------- | -------- | ------- | ----------------------- |
| `stage`   | `MonsterStage` | Yes      | -       | Current evolution stage |
| `isHappy` | `boolean`      | No       | `false` | Trigger happy animation |
| `class`   | `string`       | No       | `''`    | Additional CSS classes  |

**Exported Methods:**

| Method   | Signature                                               | Description                               |
| -------- | ------------------------------------------------------- | ----------------------------------------- |
| `lookAt` | `(targetX: number, targetY: number, duration?) => void` | Smoothly animate gaze direction (-1 to 1) |

**Features:**

- Rive canvas animation (when WebGL available)
- Automatic emoji fallback (when Rive fails or WebGL unavailable)
- View Model data binding (`autoBind: true`) for CharacterVM headX/headY
- Smooth head tracking via `lookAt()` with `requestAnimationFrame` + ease-out cubic
- HiDPI/Retina support via `resizeDrawingSurfaceToCanvas()`
- Visibility-based pause/play (saves battery when off-screen)
- Tab visibility handling (pauses when tab hidden)

**Fallback Strategy:**

1. Check WebGL support on mount
2. Attempt to load Rive animation with `monster_hatchling.riv`
3. On error → display emoji with bounce animation

---

#### MonsterDisplay

**File:** `src/lib/components/MonsterDisplay.svelte`

**Purpose:** Display the user's monster companion with progress bar and stage info.

**Props:**

| Prop      | Type      | Required | Default | Description             |
| --------- | --------- | -------- | ------- | ----------------------- |
| `monster` | `Monster` | Yes      | -       | Monster object          |
| `isHappy` | `boolean` | No       | `false` | Trigger happy animation |

**Monster Stages:**

| Stage   | Emoji | Background Color |
| ------- | ----- | ---------------- |
| `egg`   | 🥚    | Yellow           |
| `baby`  | 🐣    | Blue             |
| `teen`  | 🐲    | Purple           |
| `adult` | 🦖    | Pink             |
| `elder` | 🐉    | Gold             |

**Features:**

- Uses Monster.svelte for Rive animation (with emoji fallback)
- Registers Monster's `lookAt` callback via `registerMonsterLookAt()` store API
- Unregisters callback on destroy
- Evolution progress bar
- Stage badge
- Monster name display

---

### Display Components

#### ProgressRing

**File:** `src/lib/components/ProgressRing.svelte`

**Purpose:** Circular progress indicator.

**Props:**

| Prop   | Type     | Default | Description                 |
| ------ | -------- | ------- | --------------------------- |
| `pct`  | `number` | `0`     | Progress percentage (0-100) |
| `size` | `number` | `64`    | Ring diameter in pixels     |

**Implementation:**

- SVG-based with `stroke-dasharray` and `stroke-dashoffset`
- Rotated -90° to start progress at top
- 500ms transition animation

**Colors:**

- Background: `#e5e7eb` (gray-200)
- Progress: `#22c55e` (green-500)

---

#### StatsCard

**File:** `src/lib/components/StatsCard.svelte`

**Purpose:** Display a single statistic.

**Props:**

| Prop    | Type     | Default | Description     |
| ------- | -------- | ------- | --------------- |
| `label` | `string` | `''`    | Stat label text |
| `value` | `string` | `''`    | Stat value      |
| `icon`  | `string` | `''`    | Emoji icon      |

**Layout:**

- Card container with icon and label row
- Large value below

---

#### WeeklyChart

**File:** `src/lib/components/WeeklyChart.svelte`

**Purpose:** Bar chart showing weekly habit completion.

**Props:**

| Prop   | Type                | Required | Description |
| ------ | ------------------- | -------- | ----------- |
| `data` | `WeeklyDataPoint[]` | Yes      | Weekly data |

**Data Format:**

```typescript
interface WeeklyDataPoint {
	day: string; // e.g., "Mon"
	completed: number;
	total: number;
}
```

**Features:**

- Dynamic height scaling based on max
- Complete vs incomplete bar colors
- Day labels and counts

---

### Status Components

#### SyncStatusIndicator

**File:** `src/lib/components/SyncStatusIndicator.svelte`

**Purpose:** Display sync status with optional manual sync.

**Props:**

| Prop       | Type      | Default | Description      |
| ---------- | --------- | ------- | ---------------- |
| `compact`  | `boolean` | `false` | Icon-only mode   |
| `showText` | `boolean` | `true`  | Show status text |

**Modes:**

1. **Compact:** Small icon button with pending count badge
2. **Full:** Status dot, text, last sync time, sync button

**Status States:**

| State   | Icon | Color       | Description            |
| ------- | ---- | ----------- | ---------------------- |
| Offline | 📡   | Gray        | No internet connection |
| Error   | ⚠️   | Red         | Sync failed            |
| Syncing | 🔄   | Green/pulse | Currently syncing      |
| Pending | 📤   | Amber       | Changes waiting        |
| Synced  | ✓    | Green       | Up to date             |

---

#### Toast

**File:** `src/lib/components/Toast.svelte`

**Purpose:** Global transient feedback for app events and lightweight follow-up actions.

**Store API:** `showToast(message)` or `showToast({ message, actionLabel, onAction, durationMs })`

**Behavior:**

- Renders from root layout so it persists across route transitions
- Supports plain informational toasts and optional action button toasts
- Used by onboarding for the guest account CTA after first habit creation
- Auto-dismisses by default; action toasts stay visible longer

---

#### AuthGuard

**File:** `src/lib/components/AuthGuard.svelte`

**Purpose:** Protect routes that require authentication.

**Props:**

| Prop          | Type      | Default        | Description              |
| ------------- | --------- | -------------- | ------------------------ |
| `requireAuth` | `boolean` | `false`        | Require authentication   |
| `redirectTo`  | `string`  | `/auth/signin` | Redirect URL when unauth |

**Features:**

- Loading state with spinner
- Redirect with return URL
- SSR-compatible

---

## Navigation Flow

### User Journey Map

```
┌──────────────────────────────────────────────────────────────┐
│                    FIRST-TIME USER                           │
│                                                              │
│   /onboard → Egg → Identity → Habit → When? → Frequency     │
│             → Notifications? → Reveal → /                  │
│                               └─────────────→ Toast CTA → /auth/signup
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│           MAIN APP (Hamburger Drawer Navigation)             │
│                                                              │
│   / (Home) ←──→ /chat ←──→ /journey ←──→ /settings          │
│       ↓                                        ↓            │
│   /habits ←──→ /habits/new               /auth/signin        │
│   /habits/[id]                                               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    AUTHENTICATION                            │
│                                                              │
│   /auth/signin ←──→ /auth/signup                             │
│        ↓                  ↓                                  │
│   Redirect to original page or /                             │
└──────────────────────────────────────────────────────────────┘
```

### Navigation Patterns

1. **Drawer Navigation** - Main app sections (hamburger menu in Header, available on all pages)
2. **Back Button** - Return to previous/home page (in Header)
3. **Deep Links** - Direct action links (e.g., "+ Add New" → `/habits/new` from the habits list)
4. **Redirects** - Post-action navigation (e.g., create habit → habits list)

---

## Styling Patterns

### Design Tokens

**Colors (Hungry Theme):**

| Token        | Value     | Usage                    |
| ------------ | --------- | ------------------------ |
| `hungry-50`  | `#f0fdf4` | Light backgrounds        |
| `hungry-100` | `#dcfce7` | Hover states, highlights |
| `hungry-500` | `#22c55e` | Primary actions          |
| `hungry-600` | `#16a34a` | Hover on primary         |
| `hungry-700` | `#15803d` | Active/pressed states    |

**Typography:**

| Class          | Font      | Usage                  |
| -------------- | --------- | ---------------------- |
| `font-display` | Fredoka   | Headings, monster name |
| (default)      | System UI | Body text              |

### Utility Classes

Defined in `src/routes/layout.css`:

**`.btn-primary`** - Primary action button

```css
@apply bg-hungry-500 hover:bg-hungry-600 active:bg-hungry-700 rounded-xl px-6 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-50;
```

**`.btn-secondary`** - Secondary action button

```css
@apply rounded-xl bg-gray-100 px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-200 active:bg-gray-300;
```

**`.card`** - Card container

```css
@apply rounded-2xl border border-gray-100 bg-white p-4 shadow-sm;
```

**`.page-container`** - Page content wrapper

```css
@apply mx-auto w-full max-w-lg px-4 pb-24;
```

**`.input-field`** - Form input

```css
@apply focus:ring-hungry-500 w-full rounded-xl border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:outline-none;
```

### Responsive Behavior

- **Max Width:** All content constrained to `max-w-lg` (512px)
- **Padding:** `px-4` horizontal, `pb-6` bottom (no bottom nav)
- **Safe Areas:** Input bars and fixed elements respect `safe-area-inset-bottom`
- **Touch Targets:** Minimum 44px for interactive elements

### Mobile Considerations

- Touch-friendly tap targets (min 44x44px)
- Active states with scale transform (`active:scale-[0.98]`)
- Safe area insets for notched devices
- Sticky headers with backdrop blur
- Fixed bottom navigation

---

## Accessibility

### Implemented Features

| Feature             | Implementation                       |
| ------------------- | ------------------------------------ |
| Keyboard Navigation | All interactive elements focusable   |
| ARIA Labels         | Icon buttons have descriptive labels |
| Focus States        | Ring outline on focus (Tailwind)     |
| Color Contrast      | WCAG AA compliant text               |
| Screen Reader       | Semantic HTML, role attributes       |
| Current Page        | `aria-current="page"` on nav links   |

### Accessibility Patterns

```svelte
<!-- Icon-only button with label -->
<button aria-label="Go back">←</button>

<!-- Radio group for pickers -->
<div role="radiogroup" aria-label="Select habit icon">
	<button aria-pressed={selected}>🏃</button>
</div>

<!-- Current navigation item -->
<a aria-current={active ? 'page' : undefined}>Today</a>
```

---

## Animation Integration

### Animation System (Phase 5)

Hungry Hundreds uses a two-tier animation system:

1. **Rive (`@rive-app/canvas`)** - Character animations for the monster companion
2. **Motion One (`motion`)** - Lightweight micro-interactions for UI feedback

### Implemented Animations

| Animation        | Type       | Location       | Trigger                     |
| ---------------- | ---------- | -------------- | --------------------------- |
| Monster Rive     | Rive       | Monster.svelte | Page load, stage change     |
| Head tracking    | Rive       | Monster.svelte | Cursor move (onmousemove)   |
| Monster fallback | CSS        | Monster.svelte | WebGL unavailable           |
| Button spring    | Motion One | HabitCard      | Toggle button tap           |
| Celebrate        | Motion One | HabitCard      | Streak milestone (7/30/100) |
| Icon tap         | Motion One | Header drawer  | Navigation icon tap         |
| Progress ring    | CSS        | ProgressRing   | Progress change             |
| Sync spinner     | CSS        | Loading states | Sync in progress            |
| Chart bars       | CSS        | WeeklyChart    | Data change                 |

### Animation Utilities

**File:** `src/lib/animations/transitions.ts`

| Function       | Purpose                      | Reduced Motion Fallback |
| -------------- | ---------------------------- | ----------------------- |
| `buttonSpring` | Spring scale on button tap   | Opacity fade            |
| `checkmarkPop` | Pop animation for checkmarks | Opacity fade            |
| `staggerList`  | Staggered entrance for lists | Instant appearance      |
| `celebrate`    | Celebration for milestones   | Simple pulse            |
| `iconTap`      | Spring scale for nav icons   | Opacity fade            |

**File:** `src/lib/animations/rive-utils.ts`

| Function                     | Purpose                             |
| ---------------------------- | ----------------------------------- |
| `supportsWebGL`              | Check WebGL availability            |
| `shouldEnableRive`           | Determine if Rive should be used    |
| `createVisibilityObserver`   | Pause/play when off-screen          |
| `createTabVisibilityHandler` | Pause/play on tab visibility change |
| `getStateMachineInput`       | Safely get Rive state machine input |
| `setBooleanInput`            | Set boolean state machine input     |
| `setNumberInput`             | Set number state machine input      |
| `fireTrigger`                | Fire trigger state machine input    |

### Reduced Motion Support

All animations respect `prefers-reduced-motion: reduce`:

```typescript
import { prefersReducedMotion } from '$lib/animations/transitions';

if (prefersReducedMotion()) {
	// Use simple opacity fade instead of spring
}
```

### Future Animations (Planned)

| Component    | Planned Animation        | Status         |
| ------------ | ------------------------ | -------------- |
| ProgressRing | Motion One on completion | 📋 Planned     |
| StatsCard    | Count-up animation       | 📋 Planned     |
| Page wrapper | Route transitions        | 📋 Planned     |
| Monster      | View Model head tracking | ✅ Implemented |

---

## Planning

### Future UI Features

Based on the roadmap phases and current implementation:

#### Phase 5: Animation (In Progress)

- [x] **Monster.svelte** - Rive canvas component with emoji fallback and `lookAt()` export
- [x] **View Model binding** - CharacterVM headX/headY for head tracking
- [x] **Head tracking** - Cursor tracking on homepage via `onmousemove` → `monsterLookAt()`
- [x] **HiDPI support** - `resizeDrawingSurfaceToCanvas()` on load and resize
- [x] **Monster asset** - `monster_hatchling.riv` with CharacterVM view model
- [x] **Micro-interactions** - Button springs on HabitCard, icon taps in drawer nav
- [x] **Milestone celebrations** - Celebrate animation on streak milestones
- [x] **Animation utilities** - `transitions.ts` and `rive-utils.ts`
- [x] **Rive utilities** - WebGL detection, visibility observers, state machine helpers
- [ ] **Page transitions** - Smooth route transitions with Motion One
- [ ] **Confetti effects** - Particles on habit completion

#### Phase 6: PWA (Complete)

- [x] **Service worker** - Offline caching, push notifications, background sync
- [x] **PWA manifest** - App metadata, icons, shortcuts
- [x] **Install prompt** - Custom UI for PWA installation (`InstallPrompt.svelte`)
- [x] **Push notification system** - FCM integration, permission handling
- [ ] **Offline indicator** - Enhanced offline mode banner (optional)
- [x] **Update available** - Predictable SW update flow with user confirmation (`UpdatePrompt.svelte`)

#### Future Enhancements

| Feature            | Description                              | Priority | Status      |
| ------------------ | ---------------------------------------- | -------- | ----------- |
| Habit editing      | Edit existing habits (name, color, time) | High     | ✅ Complete |
| Habit deletion     | Delete habits with confirmation dialog   | High     | ✅ Complete |
| Dark mode          | System-aware theme switching             | Medium   | 📋 Planned  |
| Habit archiving    | Archive/restore habits                   | Medium   | 📋 Planned  |
| Habit reordering   | Drag-and-drop habit order                | Low      | 📋 Planned  |
| Streak calendar    | Calendar view of completion history      | Medium   | 📋 Planned  |
| Achievement badges | Gamification with unlockable badges      | Low      | 📋 Planned  |
| Share progress     | Social sharing of streaks                | Low      | 📋 Planned  |

---

### Component Roadmap

#### Recommended New Components

| Component              | Purpose                  | Phase  | Status      |
| ---------------------- | ------------------------ | ------ | ----------- |
| `Monster.svelte`       | Rive animation wrapper   | 5      | ✅ Complete |
| `InstallPrompt.svelte` | PWA install UI           | 6      | ✅ Complete |
| `UpdatePrompt.svelte`  | PWA update notification  | 6      | ✅ Complete |
| `Toast.svelte`         | Toast notifications      | 5      | ✅ Complete |
| `Modal.svelte`         | Reusable modal dialog    | 5      | 📋 Planned  |
| `ConfettiEffect`       | Celebration animation    | 5      | 📋 Planned  |
| `OfflineBanner`        | Offline mode indicator   | 6      | 📋 Planned  |
| `StreakCalendar`       | Calendar view component  | Future | 📋 Planned  |
| `DragHandle`           | Drag-and-drop reordering | Future | 📋 Planned  |

> **Note:** `HabitEditForm` is no longer needed - `HabitForm` now supports both create and edit modes via the `mode` and `initialValues` props.

#### Component Enhancements

| Component             | Enhancement                 | Priority | Status      |
| --------------------- | --------------------------- | -------- | ----------- |
| `HabitCard`           | Edit button                 | High     | ✅ Complete |
| `HabitCard`           | Spring animation on toggle  | High     | ✅ Complete |
| `HabitCard`           | Milestone celebration       | High     | ✅ Complete |
| `HabitCard`           | Swipe actions (edit/delete) | Medium   | 📋 Planned  |
| `HabitCard`           | Long-press context menu     | Low      | 📋 Planned  |
| `Header` drawer       | Icon tap animation          | Medium   | ✅ Complete |
| `Header`              | Animated title transitions  | Low      | 📋 Planned  |
| `ProgressRing`        | Animated count-up           | Medium   | 📋 Planned  |
| `MonsterDisplay`      | Rive animation integration  | High     | ✅ Complete |
| `SyncStatusIndicator` | Pull-to-refresh integration | Medium   | 📋 Planned  |

---

### Design System Evolution

#### Recommended Additions

**New Color Tokens:**

```css
/* Status colors */
--color-success: var(--color-hungry-500);
--color-warning: #f59e0b; /* amber-500 */
--color-error: #ef4444; /* red-500 */
--color-info: #3b82f6; /* blue-500 */

/* Semantic aliases */
--color-primary: var(--color-hungry-500);
--color-primary-hover: var(--color-hungry-600);
--color-primary-active: var(--color-hungry-700);
```

**New Utility Classes:**

```css
.btn-danger {
	@apply rounded-xl bg-red-500 px-6 py-3 font-semibold text-white transition-all hover:bg-red-600 active:bg-red-700;
}

.toast {
	@apply fixed right-4 bottom-20 left-4 mx-auto max-w-lg rounded-xl bg-gray-900 p-4 text-white shadow-lg;
}

.skeleton {
	@apply animate-pulse rounded bg-gray-200;
}
```

**Typography Scale:**

```css
/* Recommended text sizes */
.text-display {
	@apply font-display text-3xl font-bold;
}
.text-title {
	@apply text-xl font-semibold;
}
.text-body {
	@apply text-base;
}
.text-caption {
	@apply text-sm text-gray-500;
}
.text-micro {
	@apply text-xs text-gray-400;
}
```

---

## Quick Reference

### File Locations

| Type       | Location                   |
| ---------- | -------------------------- |
| Pages      | `src/routes/`              |
| Components | `src/lib/components/`      |
| Stores     | `src/lib/stores/`          |
| Animations | `src/lib/animations/`      |
| Styles     | `src/routes/layout.css`    |
| Mock Data  | `src/lib/data/mockData.ts` |
| Rive Files | `static/animations/`       |

### Component Import Pattern

```svelte
<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import HabitCard from '$lib/components/HabitCard.svelte';
	import { habits } from '$lib/stores/habits';
</script>
```

### Creating a New Page

1. Create route file: `src/routes/[route]/+page.svelte`
2. Import Header and required components
3. Add `<svelte:head>` for page title
4. Use `.page-container` for content wrapper
5. Use `.page-container` for content wrapper

### Creating a New Component

1. Create file: `src/lib/components/ComponentName.svelte`
2. Define Props interface
3. Use Svelte 5 runes (`$props`, `$state`, `$derived`)
4. Export component (auto-exported in Svelte)
5. Document in this file

---

## Related Documentation

- **[COMPONENTS.md](./COMPONENTS.md)** - Detailed component API reference
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture and patterns
- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development workflow
- **[STATUS.md](../STATUS.md)** - Current implementation status
- **[ROADMAP.md](./ROADMAP.md)** - Phase-based development plan
