# UI Documentation

> Comprehensive reference for Hungry Hundreds UI architecture, pages, components, and design patterns.

## Overview

Hungry Hundreds uses a mobile-first, offline-capable PWA design built with SvelteKit and Tailwind CSS 4. The UI follows a consistent design language with the "Hungry" green theme, Fredoka display font, and card-based layouts.

**Design Principles:**

- **Mobile-first** - Optimized for touch interactions and smaller screens
- **Offline-capable** - UI provides clear feedback for sync status
- **Playful** - Fun, gamified aesthetic with monster companion
- **Accessible** - Keyboard navigation, ARIA labels, sufficient contrast

---

## Pages

### Route Structure

| Route               | Page         | Purpose                 | Status      |
| ------------------- | ------------ | ----------------------- | ----------- |
| `/`                 | Home (Today) | Daily habit check-in    | ✅ Complete |
| `/habits`           | Habits List  | View and manage habits  | ✅ Complete |
| `/habits/new`       | New Habit    | Create a new habit      | ✅ Complete |
| `/habits/[id]/edit` | Edit Habit   | Edit an existing habit  | ✅ Complete |
| `/dashboard`        | Statistics   | Analytics and streaks   | ✅ Complete |
| `/settings`         | Settings     | App preferences         | ✅ Complete |
| `/onboard`          | Onboarding   | First-time setup wizard | ✅ Complete |
| `/auth/signin`      | Sign In      | User authentication     | ✅ Complete |
| `/auth/signup`      | Sign Up      | Account creation        | ✅ Complete |

### Page Details

#### Home (`/`)

**File:** `src/routes/+page.svelte`

**Purpose:** Primary daily interaction surface for habit tracking.

**Layout:**

1. Header with title "Today" and ProgressRing
2. Time-based greeting section
3. MonsterDisplay component
4. Progress summary card
5. Habits list with HabitCard components

**Components Used:**

- `Header` (with `showSyncStatus` enabled)
- `HabitCard` (for each habit)
- `MonsterDisplay`
- `ProgressRing` (in header and summary)

**Key Features:**

- Time-aware greeting (morning/afternoon/evening)
- Real-time progress tracking
- Quick add habit link
- Empty state with call-to-action

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

#### Edit Habit (`/habits/[id]/edit`)

**File:** `src/routes/habits/[id]/edit/+page.svelte`

**Purpose:** Form for editing an existing habit.

**Layout:**

1. Header with back button and "Edit Habit" title
2. Description text
3. HabitForm component (pre-populated with current habit data)
4. Error display (if update fails)

**Components Used:**

- `Header` (with `showBack`)
- `HabitForm` (mode="edit", with `initialValues`)

**Key Features:**

- Pre-populated form with existing habit name, emoji, color, reminder time
- Loading state while submitting
- Error handling with user feedback
- Habit not found state with link back to habits list
- SSR-compatible with browser check

**Navigation:**

- Back button → Habits list (`/habits`)
- On submit → Habits list (`/habits`)

---

#### Dashboard (`/dashboard`)

**File:** `src/routes/dashboard/+page.svelte`

**Purpose:** Statistics and analytics view.

**Layout:**

1. Header
2. Today's progress card
3. Weekly chart
4. Stats grid (2x2)
5. Motivation section

**Components Used:**

- `Header`
- `ProgressRing`
- `WeeklyChart`
- `StatsCard` (4 instances)

**Stats Displayed:**

- Today's progress with completion message
- Weekly completion chart
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

---

#### Onboarding (`/onboard`)

**File:** `src/routes/onboard/+page.svelte`

**Purpose:** First-time user setup wizard.

**Layout:** Three-step wizard:

1. **Welcome** - Introduction with get started CTA
2. **Monster** - Name the monster companion
3. **Habit** - Create first habit

**Components Used:**

- `MonsterDisplay`
- `HabitForm`

**Key Features:**

- Multi-step flow with back navigation
- Personalized greeting for authenticated users
- Skip option for quick start
- Monster name customization

---

#### Authentication Pages

**Files:**

- `src/routes/auth/+layout.svelte` - Minimal layout without BottomNav
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

## Layouts

### Root Layout (`src/routes/+layout.svelte`)

**Purpose:** App shell providing consistent structure across all pages.

**Features:**

- Favicon and meta tags
- AuthGuard wrapper for protected routes
- BottomNav (conditionally shown)
- Sync initialization on mount

**Configuration:**

- `noNavRoutes`: Routes without BottomNav (`/auth`, `/onboard`)
- `protectedRoutes`: Routes requiring auth (currently empty for optional auth)

### Auth Layout (`src/routes/auth/+layout.svelte`)

**Purpose:** Minimal layout for authentication pages.

**Features:**

- No BottomNav
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

#### BottomNav

**File:** `src/lib/components/BottomNav.svelte`

**Purpose:** Fixed bottom navigation bar.

**Navigation Items:**

| Route        | Label    | Icon | Page        |
| ------------ | -------- | ---- | ----------- |
| `/`          | Today    | 🏠   | Home        |
| `/habits`    | Habits   | 📋   | Habits List |
| `/dashboard` | Stats    | 📊   | Dashboard   |
| `/settings`  | Settings | ⚙️   | Settings    |

**Features:**

- Fixed bottom positioning
- Safe area inset support (`pb-[env(safe-area-inset-bottom)]`)
- Active state highlighting (`text-hungry-500`)
- Keyboard accessible with `aria-current`

**Styling:**

- Height: 64px (`h-16`)
- Max width: `max-w-lg`
- White background with top border

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

#### MonsterDisplay

**File:** `src/lib/components/MonsterDisplay.svelte`

**Purpose:** Display the user's monster companion.

**Props:**

| Prop      | Type      | Required | Description    |
| --------- | --------- | -------- | -------------- |
| `monster` | `Monster` | Yes      | Monster object |

**Monster Stages:**

| Stage   | Emoji | Background Color |
| ------- | ----- | ---------------- |
| `egg`   | 🥚    | Yellow           |
| `baby`  | 🐣    | Blue             |
| `teen`  | 🐲    | Purple           |
| `adult` | 🦖    | Pink             |
| `elder` | 🐉    | Gold             |

**Features:**

- Bounce animation on emoji
- Evolution progress bar
- Stage badge
- Monster name display

**Future:** Replace with Rive animation component.

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
  day: string;       // e.g., "Mon"
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
│   /onboard ─┬→ Welcome → Monster Name → First Habit → /     │
│             └→ Skip ──────────────────────────────────→ /   │
│             └→ Create Account ────────────────────→ /auth/signup
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    MAIN APP (BottomNav)                      │
│                                                              │
│   / (Today) ←──→ /habits ←──→ /dashboard ←──→ /settings     │
│       ↓              ↓                              ↓        │
│   /habits/new   /habits/new                  /auth/signin    │
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

1. **Bottom Navigation** - Main app sections (persistent, except auth/onboard)
2. **Back Button** - Return to previous/home page (in Header)
3. **Deep Links** - Direct action links (e.g., "+ Add New" → `/habits/new`)
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
@apply rounded-xl bg-hungry-500 px-6 py-3 font-semibold text-white transition-all hover:bg-hungry-600 active:bg-hungry-700 disabled:cursor-not-allowed disabled:opacity-50;
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
@apply w-full rounded-xl border border-gray-200 px-4 py-3 transition-all focus:border-transparent focus:ring-2 focus:ring-hungry-500 focus:outline-none;
```

### Responsive Behavior

- **Max Width:** All content constrained to `max-w-lg` (512px)
- **Padding:** `px-4` horizontal, `pb-24` bottom (for BottomNav clearance)
- **Safe Areas:** Bottom nav respects `safe-area-inset-bottom`
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

### Current Animations

| Animation      | Type | Location       |
| -------------- | ---- | -------------- |
| Monster bounce | CSS  | MonsterDisplay |
| Progress ring  | CSS  | ProgressRing   |
| Card press     | CSS  | HabitCard      |
| Sync spinner   | CSS  | Loading states |
| Chart bars     | CSS  | WeeklyChart    |

### Planned Animations (Phase 5)

**Rive Integration:**

- Monster character with state machines
- Evolution transitions
- Happy/celebration animations
- Idle animations per evolution stage

**Motion One Integration:**

- Button micro-interactions (spring physics)
- Page transitions
- Success celebrations
- Streak milestone effects

**Animation Entry Points:**

| Component      | Planned Animation          |
| -------------- | -------------------------- |
| MonsterDisplay | Rive canvas replacement    |
| HabitCard      | Spring on toggle           |
| ProgressRing   | Motion One on completion   |
| StatsCard      | Count-up animation         |
| Page wrapper   | Transition on route change |

---

## Planning

### Future UI Features

Based on the roadmap phases and current implementation:

#### Phase 5: Animation (Current Priority)

- [ ] **Monster.svelte** - Rive canvas component replacing MonsterDisplay
- [ ] **Celebration effects** - Confetti/particles on habit completion
- [ ] **Page transitions** - Smooth route transitions with Motion One
- [ ] **Micro-interactions** - Button springs, toggle animations

#### Phase 6: PWA

- [ ] **Install prompt** - Custom UI for PWA installation
- [ ] **Offline indicator** - Enhanced offline mode banner
- [ ] **Push notification permissions** - Request UI
- [ ] **Update available** - Service worker update prompt

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

| Component        | Purpose                  | Phase  | Status      |
| ---------------- | ------------------------ | ------ | ----------- |
| `Monster.svelte` | Rive animation wrapper   | 5      | 📋 Planned  |
| `Toast.svelte`   | Toast notifications      | 5      | 📋 Planned  |
| `Modal.svelte`   | Reusable modal dialog    | 5      | 📋 Planned  |
| `ConfettiEffect` | Celebration animation    | 5      | 📋 Planned  |
| `InstallPrompt`  | PWA install UI           | 6      | ✅ Complete |
| `OfflineBanner`  | Offline mode indicator   | 6      | 📋 Planned  |
| `StreakCalendar` | Calendar view component  | Future | 📋 Planned  |
| `DragHandle`     | Drag-and-drop reordering | Future | 📋 Planned  |

> **Note:** `HabitEditForm` is no longer needed - `HabitForm` now supports both create and edit modes via the `mode` and `initialValues` props.

#### Component Enhancements

| Component             | Enhancement                 | Priority | Status      |
| --------------------- | --------------------------- | -------- | ----------- |
| `HabitCard`           | Edit button                 | High     | ✅ Complete |
| `HabitCard`           | Swipe actions (edit/delete) | Medium   | 📋 Planned  |
| `HabitCard`           | Long-press context menu     | Low      | 📋 Planned  |
| `Header`              | Animated title transitions  | Low      | 📋 Planned  |
| `ProgressRing`        | Animated count-up           | Medium   | 📋 Planned  |
| `MonsterDisplay`      | Replace with Rive component | High     | 📋 Planned  |
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
| Styles     | `src/routes/layout.css`    |
| Mock Data  | `src/lib/data/mockData.ts` |

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
5. Include bottom padding (`pb-24`) for BottomNav clearance

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
