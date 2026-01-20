# Component Reference

## Overview

This document provides detailed information about all UI components in the Hungry Hundreds application. Each component is designed to be reusable, accessible, and follows consistent design patterns.

## Component Location

All components are located in `src/lib/components/` directory.

## Core Components

### BottomNav.svelte

**Purpose**: Fixed bottom navigation bar for main app navigation.

**Location**: `src/lib/components/BottomNav.svelte`

**Features**:

- Fixed positioning at bottom of screen
- Safe area inset support for mobile devices
- Active state highlighting
- Icon + label navigation items

**Navigation Items**:

- Home (`/`) - Today's habits
- Habits (`/habits`) - All habits list
- Stats (`/dashboard`) - Statistics dashboard
- Settings (`/settings`) - App settings

**Usage**:

```svelte
<!-- In src/routes/+layout.svelte -->
<BottomNav />
```

**Styling**:

- Active: `text-hungry-500` (green)
- Inactive: `text-gray-400`
- Height: 64px (16 Tailwind units)

---

### Header.svelte

**Purpose**: Sticky page header with optional back button.

**Location**: `src/lib/components/Header.svelte`

**Props**:

```typescript
interface Props {
  title?: string;      // Header title text
  showBack?: boolean;  // Show back arrow button
}
```

**Slots**:

- `right` - Content for right side of header (e.g., action buttons)

**Usage**:

```svelte
<Header title="My Habits" showBack={true}>
	<button slot="right">Edit</button>
</Header>
```

**Features**:

- Sticky positioning
- Backdrop blur effect
- Back button navigates to home (`/`)

---

### HabitCard.svelte

**Purpose**: Display individual habit with completion toggle.

**Location**: `src/lib/components/HabitCard.svelte`

**Props**:

```typescript
interface Props {
  habit: Habit;  // Habit object from store
}
```

**Features**:

- Checkbox toggle for completion
- Visual feedback (ring, background color) when completed
- Streak counter with fire emoji
- Reminder time display
- Strike-through text when completed

**Interactions**:

- Click checkbox → calls `habits.toggle(habit.id)`
- Updates `completedToday` and `streak` in store

**Visual States**:

- **Uncompleted**: Light background, emoji icon
- **Completed**: Colored ring, checkmark, strike-through text

---

### HabitSuggestions.svelte

**Purpose**: Display suggested habits in the empty state to help users get started.

**Location**: `src/lib/components/HabitSuggestions.svelte`

**Props**:

```typescript
interface Props {
  maxSuggestions?: number;  // Maximum suggestions to display (default: 4)
}
```

**Features**:

- Grid of clickable habit suggestion cards
- Loading state while adding habits
- Link to create custom habit
- Uses suggestions from `src/lib/data/suggestedHabits.ts`

**Interactions**:

- Click suggestion card → adds habit via `habits.add()`
- Click "Create a custom habit" → navigates to `/habits/new`

**Visual States**:

- **Default**: Suggestion cards with emoji, name, and "+ Add" label
- **Adding**: Spinner emoji while habit is being created

---

### HabitForm.svelte

**Purpose**: Form for creating or editing habits.

**Location**: `src/lib/components/HabitForm.svelte`

**Events**:

```typescript
interface Events {
  submit: {
    name: string;
    emoji: string;
    color: string;
    reminderTime: string | null;
  };
}
```

**Form Fields**:

1. **Habit Name** - Text input (required, 1-50 chars)
2. **Icon** - Emoji picker (8 preset emojis)
3. **Color** - Color picker (6 preset colors)
4. **Reminder Time** - Time input (optional, HH:MM format)

**Preset Options**:

- **Emojis**: 🏃 📚 🧘 💧 💪 🎯 ✍️ 🛏️
- **Colors**: Green, Blue, Purple, Pink, Orange, Cyan

**Usage**:

```svelte
<script>
	function handleSubmit(event) {
		const habitData = event.detail;
		habits.add(habitData);
	}
</script>

<HabitForm on:submit={handleSubmit} />
```

---

### MonsterDisplay.svelte

**Purpose**: Display user's virtual pet monster.

**Location**: `src/lib/components/MonsterDisplay.svelte`

**Current Implementation**: Emoji placeholder (to be replaced with Rive animation)

**Monster Stages**:

- `egg` 🥚 - Yellow background
- `baby` 🐣 - Blue background
- `teen` 🐲 - Purple background
- `adult` 🦖 - Pink background
- `elder` 🐉 - Gold background

**Features**:

- Stage indicator badge
- Evolution progress bar
- Bounce animation
- Responsive sizing (192px × 192px)

**Future Enhancement**:
Replace with `@rive-app/canvas` for animated monster graphics.

---

### ProgressRing.svelte

**Purpose**: Circular progress indicator.

**Location**: `src/lib/components/ProgressRing.svelte`

**Props**:

```typescript
interface Props {
  pct?: number;   // Progress percentage (0-100)
  size?: number;  // Ring diameter in pixels (default: 64)
}
```

**Usage**:

```svelte
<ProgressRing pct={75} size={80} />
```

**Styling**:

- Background: Gray (`#e5e7eb`)
- Progress: Green (`#22c55e`)
- Stroke width: 6px
- Smooth transition animation

**Math**:

- Uses SVG circle with `stroke-dasharray` and `stroke-dashoffset`
- Rotated -90° to start at top

---

### StatsCard.svelte

**Purpose**: Display a single statistic with icon.

**Location**: `src/lib/components/StatsCard.svelte`

**Props**:

```typescript
interface Props {
  label?: string;  // Stat label (e.g., "Completion Rate")
  value?: string;  // Stat value (e.g., "78%")
  icon?: string;   // Emoji icon
}
```

**Usage**:

```svelte
<StatsCard label="Completion Rate" value="78%" icon="📊" />
```

**Layout**:

- Card container with padding
- Label and icon in header row
- Large value display below

---

## Utility Classes

Defined in `src/routes/layout.css` (or `src/app.css`):

### .btn-primary

Primary action button styling.

```css
@apply rounded-xl bg-hungry-500 px-6 py-3 font-semibold text-white transition-all hover:bg-hungry-600 active:bg-hungry-700 disabled:cursor-not-allowed disabled:opacity-50;
```

**Usage**:

```svelte
<button class="btn-primary">Save Habit</button>
```

### .card

Card container styling.

```css
@apply rounded-2xl border border-gray-100 bg-white p-4 shadow-sm;
```

**Usage**:

```svelte
<div class="card">
	<!-- Card content -->
</div>
```

### .page-container

Page layout wrapper with max width and padding.

```css
@apply mx-auto max-w-lg px-4 pb-24;
```

**Usage**:

```svelte
<div class="page-container">
	<!-- Page content -->
</div>
```

**Note**: `pb-24` (96px) provides space for bottom navigation.

---

## Design Tokens

### Colors

**Hungry Theme** (Green):

- `hungry-50`: `#f0fdf4` - Lightest
- `hungry-100`: `#dcfce7`
- `hungry-500`: `#22c55e` - Primary
- `hungry-600`: `#16a34a` - Hover
- `hungry-700`: `#15803d` - Active

**Usage**:

```svelte
<div class="bg-hungry-500 text-white">Primary</div>
<div class="bg-hungry-100 text-hungry-700">Light</div>
```

### Typography

**Font Family**:

- Display: `Fredoka` (Google Fonts)
- Body: System sans-serif

**Usage**:

```svelte
<h1 class="font-display">Heading</h1>
```

### Spacing

**Bottom Navigation Clearance**: 96px (`pb-24`)

- Ensures content doesn't hide behind fixed bottom nav
- Applied to `.page-container`

---

## Component Patterns

### Event Handling

Components use Svelte's `createEventDispatcher` for parent communication:

```svelte
<script>
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	function handleAction() {
		dispatch('eventName', { data: 'value' });
	}
</script>
```

### Store Integration

Components subscribe to stores using `$` prefix:

```svelte
<script>
	import { habits } from '$lib/stores/habits.js';
</script>

{#each $habits as habit}
	<HabitCard {habit} />
{/each}
```

### Conditional Styling

Use `class:` directive for dynamic classes:

```svelte
<div class="card" class:ring-2={isActive} class:ring-hungry-500={isActive}>Content</div>
```

---

## Accessibility

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Tab order follows visual layout
- Focus states visible

### ARIA Labels

Add ARIA labels for icon-only buttons:

```svelte
<button aria-label="Toggle habit completion"> ✓ </button>
```

### Color Contrast

- Text meets WCAG AA standards
- Interactive elements have sufficient contrast

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and design patterns
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow and guidelines
- [API.md](./API.md) - Data models and store API
