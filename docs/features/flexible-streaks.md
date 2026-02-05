# Feature: Flexible Streak System

## Purpose

The current streak system requires consecutive daily completions, meaning missing a single day breaks the streak entirely. This is demotivating for habits that don't require daily practice (e.g., "Go to gym 3x per week" or "Read 5 books per month"). A flexible streak system allows users to define their own completion frequency while maintaining the motivational benefits of streaks.

## User Story

As a habit tracker user, I want to define how often I need to complete a habit to maintain my streak so that I can track non-daily habits (like gym 3x/week) without losing my streak for missing a day.

---

## 1. Approach Analysis

### 1.1 Frequency-Based Streaks

**Concept:** Users specify a target frequency (e.g., "3 times per week"). The streak measures consecutive successful periods, not consecutive days.

```
Week 1: ✓ ✓ ✓ _ _ _ _  (3/3 = streak continues)
Week 2: ✓ ✓ _ ✓ _ _ _  (3/3 = streak continues)
Week 3: ✓ _ _ _ _ _ _  (1/3 = streak breaks)
```

| Aspect                    | Assessment                                                   |
| ------------------------- | ------------------------------------------------------------ |
| **User Experience**       | ⭐⭐⭐⭐⭐ Intuitive - users naturally think "I gym 3x/week" |
| **Motivation**            | ⭐⭐⭐⭐ High - clear target, forgiving of daily misses      |
| **Clarity**               | ⭐⭐⭐⭐ Easy to understand once period is defined           |
| **Technical Complexity**  | ⭐⭐⭐ Moderate - requires period boundary calculations      |
| **Offline Compatibility** | ⭐⭐⭐⭐⭐ Fully calculable from local logs                  |
| **Data Model Impact**     | ⭐⭐⭐ Adds `frequency` and `frequencyPeriod` to Habit       |

**Pros:**

- Natural match for real-world habit patterns
- Clear, countable targets per period
- Period resets give natural "fresh start" moments

**Cons:**

- Week boundary logic can be complex (start Sunday or Monday?)
- User must understand period concept
- Daily habits need "7 per week" which feels awkward

---

### 1.2 Grace Period / Buffer Days

**Concept:** Streaks are based on daily completion but with a configurable number of "allowed misses" per period.

```
Buffer = 1 miss/week allowed
Day: M  T  W  T  F  S  S
     ✓  ✓  _  ✓  ✓  ✓  ✓  (1 miss ≤ 1 allowed = streak continues)
     ✓  _  _  ✓  ✓  ✓  ✓  (2 misses > 1 allowed = streak breaks)
```

| Aspect                    | Assessment                                               |
| ------------------------- | -------------------------------------------------------- |
| **User Experience**       | ⭐⭐⭐ Good - familiar "streak" concept with forgiveness |
| **Motivation**            | ⭐⭐⭐⭐ Reduces anxiety about single missed days        |
| **Clarity**               | ⭐⭐⭐ Moderate - "allowed misses" requires explanation  |
| **Technical Complexity**  | ⭐⭐⭐ Moderate - sliding window calculations            |
| **Offline Compatibility** | ⭐⭐⭐⭐⭐ Fully calculable from local logs              |
| **Data Model Impact**     | ⭐⭐ Adds `graceDays` and `gracePeriod` to Habit         |

**Pros:**

- Preserves familiar "streak" semantics
- Reduces single-day failure anxiety
- Works well for daily-ish habits

**Cons:**

- Doesn't map to "3x per week" mental model
- Can feel arbitrary ("why 1 grace day vs 2?")
- Harder to communicate to users

---

### 1.3 Percentage-Based Completion

**Concept:** Streak continues as long as completion rate stays above a threshold (e.g., 80%).

```
Threshold = 80%
Last 7 days: ✓ ✓ _ ✓ ✓ ✓ ✓  (6/7 = 86% > 80% = streak continues)
Last 7 days: ✓ ✓ _ _ ✓ ✓ ✓  (5/7 = 71% < 80% = streak breaks)
```

| Aspect                    | Assessment                                                |
| ------------------------- | --------------------------------------------------------- |
| **User Experience**       | ⭐⭐ Poor - percentages feel abstract                     |
| **Motivation**            | ⭐⭐⭐ Moderate - target feels fuzzy                      |
| **Clarity**               | ⭐⭐ Low - hard to know "am I on track today?"            |
| **Technical Complexity**  | ⭐⭐⭐⭐ Higher - rolling window calculations             |
| **Offline Compatibility** | ⭐⭐⭐⭐⭐ Fully calculable from local logs               |
| **Data Model Impact**     | ⭐⭐ Adds `completionThreshold` and `windowDays` to Habit |

**Pros:**

- Maximum flexibility
- Single number to configure

**Cons:**

- Harder to reason about daily ("did I need to do it today?")
- Percentages feel less motivating than counts
- Window size adds another configuration dimension

---

### 1.4 Hybrid: Frequency + Rest Days (Recommended)

**Concept:** Combine frequency-based tracking with optional rest day designations for maximum flexibility.

```
Config: 3x per week, rest days: Sat, Sun
Week 1: ✓ _ ✓ ✓ _ R R  (3/3 target on 5 active days = ✓)
Week 2: ✓ ✓ ✓ _ _ R R  (3/3 target on 5 active days = ✓)
```

| Aspect                    | Assessment                                                      |
| ------------------------- | --------------------------------------------------------------- |
| **User Experience**       | ⭐⭐⭐⭐⭐ Most intuitive for real-world habits                 |
| **Motivation**            | ⭐⭐⭐⭐⭐ High - clear targets + built-in rest                 |
| **Clarity**               | ⭐⭐⭐⭐⭐ "Do this X times per week" is universally understood |
| **Technical Complexity**  | ⭐⭐⭐ Moderate - week boundaries + rest day logic              |
| **Offline Compatibility** | ⭐⭐⭐⭐⭐ Fully calculable from local logs                     |
| **Data Model Impact**     | ⭐⭐⭐ Adds frequency fields, optional rest days                |

**Pros:**

- Natural mental model for most habits
- Built-in rest days prevent burnout
- Backward compatible (daily = 7x per week, no rest days)

**Cons:**

- Most configuration options (complexity tradeoff)
- Rest days add edge cases

---

## 2. Trade-off Comparison Matrix

| Criterion           | Frequency  | Grace Period | Percentage  | Hybrid (Recommended) |
| ------------------- | ---------- | ------------ | ----------- | -------------------- |
| **Intuitive UX**    | ⭐⭐⭐⭐⭐ | ⭐⭐⭐       | ⭐⭐        | ⭐⭐⭐⭐⭐           |
| **Motivation**      | ⭐⭐⭐⭐   | ⭐⭐⭐⭐     | ⭐⭐⭐      | ⭐⭐⭐⭐⭐           |
| **Daily clarity**   | ⭐⭐⭐     | ⭐⭐⭐⭐     | ⭐⭐        | ⭐⭐⭐⭐             |
| **Tech complexity** | Medium     | Medium       | High        | Medium               |
| **Offline-first**   | ✅ Full    | ✅ Full      | ✅ Full     | ✅ Full              |
| **Schema impact**   | +2 fields  | +2 fields    | +2 fields   | +3 fields            |
| **Backward compat** | ✅ Easy    | ✅ Easy      | ⚠️ Moderate | ✅ Easy              |
| **Sync complexity** | Low        | Low          | Low         | Low                  |

### Recommendation: **Hybrid Frequency-Based Approach (Simplified)**

After analysis, the **Frequency-Based approach with optional rest days** provides the best balance of user experience, technical feasibility, and backward compatibility. However, to reduce initial complexity, we recommend implementing in phases:

**Phase 1 (MVP):** Frequency-based only (no rest days)
**Phase 2 (Enhancement):** Add optional rest day configuration

---

## 3. Recommended Implementation

### 3.1 User Stories

#### Primary User Story

> As a user, I want to set my habit to "3 times per week" so that I can track my gym attendance without breaking my streak when I take rest days.

#### Secondary User Stories

1. **Daily habit user:**

   > As a user with a daily meditation habit, I want my existing streak behavior unchanged so that my current streak of 45 days continues to work.

2. **Weekly target user:**

   > As a gym-goer, I want to see my "weeks streak" (consecutive weeks hitting my 3x target) so that I feel motivated by longer-term consistency.

3. **Progress visibility user:**
   > As a user, I want to see "2/3 this week" on my habit card so that I know how many more times I need to complete it this period.

### 3.2 UI/UX Design

#### HabitForm Changes

Add a "Frequency" section to the habit creation/edit form:

```
┌─────────────────────────────────────────────────┐
│ Frequency                                        │
│ ┌───────────────────────────────────────────┐   │
│ │ ○ Daily (every day)                       │   │
│ │ ● Weekly target                           │   │
│ │   [ 3 ▼ ] times per week                  │   │
│ └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

#### HabitCard Changes

Update the streak display to show period progress:

**Daily habit (unchanged):**

```
┌─────────────────────────────────────┐
│ 🏃 Morning Run          🔥 12       │
└─────────────────────────────────────┘
```

**Weekly frequency habit:**

```
┌─────────────────────────────────────┐
│ 🏋️ Gym                  2/3 🔥 5   │
│                         ^^^^ ^^^^   │
│                     progress weeks  │
└─────────────────────────────────────┘
```

### 3.3 Data Model Changes

#### Dexie Schema (`src/lib/db/db.ts`)

```typescript
export interface Habit {
  id?: number;
  serverId?: string;
  name: string;
  emoji: string;
  color: string;
  reminderTime?: string;

  // NEW: Frequency configuration
  frequencyType: 'daily' | 'weekly';  // Period type
  frequencyTarget: number;             // How many times per period (1-7)
  weekStartsOn: 0 | 1;                 // 0 = Sunday, 1 = Monday (user preference)

  createdAt: number;
  updatedAt: number;
}
```

**Default values for backward compatibility:**

- `frequencyType`: `'daily'`
- `frequencyTarget`: `1`
- `weekStartsOn`: `1` (Monday)

#### Supabase Schema Migration (`supabase/migrations/20260205_flexible_streaks.sql`)

```sql
-- Migration: Add flexible streak fields to habits table
-- This migration adds frequency configuration for flexible streaks

-- Step 1: Add columns with defaults (allows existing rows to get values)
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS frequency_type VARCHAR(10) DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS frequency_target INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS week_starts_on INTEGER DEFAULT 1;

-- Step 2: Add constraints
ALTER TABLE habits
  ADD CONSTRAINT habits_frequency_type_check
    CHECK (frequency_type IN ('daily', 'weekly')),
  ADD CONSTRAINT habits_frequency_target_check
    CHECK (frequency_target BETWEEN 1 AND 7),
  ADD CONSTRAINT habits_week_starts_on_check
    CHECK (week_starts_on IN (0, 1));

-- Step 3: Update existing rows to ensure defaults are applied
UPDATE habits
SET
  frequency_type = COALESCE(frequency_type, 'daily'),
  frequency_target = COALESCE(frequency_target, 1),
  week_starts_on = COALESCE(week_starts_on, 1)
WHERE frequency_type IS NULL
   OR frequency_target IS NULL
   OR week_starts_on IS NULL;

-- Step 4: Make columns NOT NULL after backfill
ALTER TABLE habits
  ALTER COLUMN frequency_type SET NOT NULL,
  ALTER COLUMN frequency_target SET NOT NULL,
  ALTER COLUMN week_starts_on SET NOT NULL;
```

### 3.4 Streak Calculation Logic

#### New Streak Calculation (`src/lib/db/habitLogs.ts`)

```typescript
/**
 * Calculate flexible streak for a habit based on its frequency settings.
 *
 * For daily habits: consecutive days completed (existing behavior)
 * For weekly habits: consecutive weeks where target was met
 */
export async function calculateFlexibleStreak(habit: Habit): Promise<{
  streak: number;           // Current streak (days or weeks)
  periodProgress: number;   // Completions in current period
  periodTarget: number;     // Target for current period
  periodType: 'day' | 'week';
}> {
  if (habit.frequencyType === 'daily') {
    // Existing behavior for daily habits
    const streak = await calculateStreak(habit.id!);
    return {
      streak,
      periodProgress: (await isHabitCompletedOnDate(habit.id!, getTodayDate())) ? 1 : 0,
      periodTarget: 1,
      periodType: 'day'
    };
  }

  // Weekly frequency calculation
  const { weekStart, weekEnd } = getCurrentWeekBounds(habit.weekStartsOn);
  const completionsThisWeek = await getCompletionsInRange(habit.id!, weekStart, weekEnd);

  // Count consecutive successful weeks (streak)
  const weekStreak = await calculateWeekStreak(habit);

  return {
    streak: weekStreak,
    periodProgress: completionsThisWeek,
    periodTarget: habit.frequencyTarget,
    periodType: 'week'
  };
}

/**
 * Get the start and end dates of the current week
 */
export function getCurrentWeekBounds(weekStartsOn: 0 | 1): {
  weekStart: string;
  weekEnd: string;
} {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, ...

  // Calculate days since week start
  let daysSinceStart: number;
  if (weekStartsOn === 1) { // Monday start
    daysSinceStart = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  } else { // Sunday start
    daysSinceStart = dayOfWeek;
  }

  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() - daysSinceStart);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  return {
    weekStart: formatDateLocal(weekStartDate),
    weekEnd: formatDateLocal(weekEndDate)
  };
}

/**
 * Count completions within a date range
 */
async function getCompletionsInRange(
  habitId: number,
  startDate: string,
  endDate: string
): Promise<number> {
  const logs = await db.logs
    .where('habitId').equals(habitId)
    .filter(log => log.date >= startDate && log.date <= endDate)
    .toArray();
  return logs.length;
}

/**
 * Calculate consecutive weeks where the frequency target was met
 */
async function calculateWeekStreak(habit: Habit): Promise<number> {
  const allDates = await getHabitCompletionDates(habit.id!);
  if (allDates.length === 0) return 0;

  const { weekStart } = getCurrentWeekBounds(habit.weekStartsOn);
  let streak = 0;
  let checkWeekStart = new Date(weekStart + 'T00:00:00');

  // Check current week first
  let currentWeekCompletions = countCompletionsInWeek(allDates, checkWeekStart, habit.weekStartsOn);

  // If current week hasn't met target yet but isn't over, check from last week
  const today = new Date();
  const daysLeftInWeek = 6 - getDaysSinceWeekStart(today, habit.weekStartsOn);

  if (currentWeekCompletions < habit.frequencyTarget && daysLeftInWeek > 0) {
    // Current week still in progress - start counting from last week
    checkWeekStart.setDate(checkWeekStart.getDate() - 7);
  } else if (currentWeekCompletions >= habit.frequencyTarget) {
    // Current week target met - include it
    streak = 1;
    checkWeekStart.setDate(checkWeekStart.getDate() - 7);
  } else {
    // Current week failed - streak is 0
    return 0;
  }

  // Count previous consecutive successful weeks
  while (true) {
    const weekCompletions = countCompletionsInWeek(allDates, checkWeekStart, habit.weekStartsOn);
    if (weekCompletions >= habit.frequencyTarget) {
      streak++;
      checkWeekStart.setDate(checkWeekStart.getDate() - 7);
    } else {
      break;
    }
  }

  return streak;
}

function countCompletionsInWeek(
  allDates: string[],
  weekStart: Date,
  weekStartsOn: 0 | 1
): number {
  const start = formatDateLocal(weekStart);
  const end = new Date(weekStart);
  end.setDate(weekStart.getDate() + 6);
  const endStr = formatDateLocal(end);

  return allDates.filter(d => d >= start && d <= endStr).length;
}

function getDaysSinceWeekStart(date: Date, weekStartsOn: 0 | 1): number {
  const dayOfWeek = date.getDay();
  if (weekStartsOn === 1) {
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }
  return dayOfWeek;
}
```

### 3.5 Store Changes (`src/lib/stores/habits.ts`)

Update the `HabitWithStatus` interface and calculation:

```typescript
export interface HabitWithStatus extends Habit {
  streak: number;
  completedToday: boolean;
  // NEW: For flexible streaks
  periodProgress: number;    // e.g., 2 (completed 2 times this week)
  periodTarget: number;      // e.g., 3 (target is 3x per week)
  periodType: 'day' | 'week';
  totalCompletions: number;  // Lifetime completion count (all time)
}
```

**Field Descriptions:**

| Field              | Daily Habit      | Weekly Habit                 | Example |
| ------------------ | ---------------- | ---------------------------- | ------- |
| `streak`           | Consecutive days | Consecutive successful weeks | 12 or 5 |
| `periodProgress`   | 0 or 1 (today)   | Completions this week        | 2       |
| `periodTarget`     | Always 1         | User-configured (1-7)        | 3       |
| `periodType`       | `'day'`          | `'week'`                     | —       |
| `totalCompletions` | All-time days    | All-time days                | 45      |

### 3.6 Component Changes

#### HabitCard.svelte Updates

##### Visual Design: Side-by-Side Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DAILY HABIT CARD                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐                                                               │
│  │    🏃    │  Morning Run                              ┌─────────────┐     │
│  │  (icon)  │  7:00 AM                                  │  🔥 12      │     │
│  └──────────┘                                           │  days       │     │
│                                                         └─────────────┘     │
│                                                                              │
│  Visual: Single streak badge showing consecutive days                        │
│  Meaning: "12 days in a row"                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                          WEEKLY HABIT CARD                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────┐                                         ┌─────────────────┐   │
│  │    🏋️    │  Gym                                    │  2/3 this week │   │
│  │  (icon)  │  3x per week                            ├─────────────────┤   │
│  └──────────┘                                         │  📅 5 weeks     │   │
│                                                       │  45 total       │   │
│                                                       └─────────────────┘   │
│                                                                              │
│  Visual: Stacked metrics area with clear hierarchy                          │
│  Meaning: "2 of 3 done this week, 5 consecutive weeks, 45 lifetime days"    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

##### Visual Hierarchy Explanation

| Element              | Daily Habit   | Weekly Habit  | Purpose                   |
| -------------------- | ------------- | ------------- | ------------------------- |
| **Primary metric**   | 🔥 12 days    | 2/3 this week | Immediate actionable info |
| **Streak indicator** | 🔥 (fire)     | 📅 (calendar) | Visual differentiation    |
| **Streak unit**      | "days"        | "weeks"       | Clear unit labeling       |
| **Secondary metric** | —             | 45 total      | Lifetime achievement      |
| **Subtitle**         | Reminder time | "3x per week" | Context for frequency     |

**Design Rationale:**

1. **Primary Focus (Top):** Current week progress "2/3" is most actionable—tells user "you need 1 more this week"
2. **Streak (Middle):** Uses 📅 calendar icon instead of 🔥 to differentiate from daily streaks
3. **Lifetime (Bottom):** Smaller text, secondary importance—rewards long-term commitment
4. **Subtitle Change:** Shows "3x per week" instead of reminder time for weekly habits

##### Updated Svelte Code

```svelte
<script lang="ts">
	import { habits, type HabitWithStatus } from '$lib/stores/habits';
	import { buttonSpring, celebrate } from '$lib/animations/transitions';

	interface Props {
		habit: HabitWithStatus;
		showEdit?: boolean;
		onComplete?: () => void;
	}

	let { habit, showEdit = false, onComplete }: Props = $props();

	// Determine if this is a weekly frequency habit
	const isWeekly = $derived(habit.frequencyType === 'weekly');

	// Check if weekly target is met this week
	const weeklyTargetMet = $derived(isWeekly && habit.periodProgress >= habit.periodTarget);
</script>

<!-- Main card container -->
<div
	class="card flex w-full items-center gap-4 overflow-hidden transition-all"
	class:ring-2={habit.completedToday}
	class:ring-hungry-500={habit.completedToday}
	class:bg-hungry-50={habit.completedToday}
>
	<!-- Toggle button area (unchanged) -->
	<button
		type="button"
		onclick={handleToggle}
		class="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
	>
		<!-- Habit icon (unchanged) -->
		<div
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
			style="background-color: {habit.completedToday ? habit.color : habit.color + '20'}"
		>
			{#if habit.completedToday}
				<span class="text-lg text-white">✓</span>
			{:else}
				<span class="text-lg">{habit.emoji}</span>
			{/if}
		</div>

		<!-- Habit info -->
		<div class="min-w-0 flex-1">
			<p
				class="truncate font-medium"
				class:line-through={habit.completedToday}
				class:text-gray-500={habit.completedToday}
			>
				{habit.name}
			</p>
			<!-- Subtitle: reminder time for daily, frequency for weekly -->
			{#if isWeekly}
				<p class="text-sm text-gray-400">{habit.frequencyTarget}x per week</p>
			{:else if habit.reminderTime}
				<p class="text-sm text-gray-400">{habit.reminderTime}</p>
			{/if}
		</div>
	</button>

	<!-- ============================================================ -->
	<!-- METRICS AREA: Different layout for daily vs weekly habits    -->
	<!-- ============================================================ -->

	{#if isWeekly}
		<!-- WEEKLY HABIT: Stacked metrics -->
		<div class="flex flex-col items-end gap-0.5">
			<!-- Row 1: Current week progress (PRIMARY) -->
			<div
				class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-semibold"
				class:bg-green-100={weeklyTargetMet}
				class:text-green-700={weeklyTargetMet}
				class:bg-blue-100={!weeklyTargetMet}
				class:text-blue-700={!weeklyTargetMet}
				aria-label="Weekly progress: {habit.periodProgress} of {habit.periodTarget} completed this week"
			>
				<span>{habit.periodProgress}/{habit.periodTarget}</span>
				<span class="text-xs font-normal opacity-75">this week</span>
			</div>

			<!-- Row 2: Consecutive weeks streak -->
			<div
				class="flex items-center gap-1 text-xs"
				class:text-orange-600={habit.streak > 0}
				class:text-gray-400={habit.streak === 0}
				aria-label="Streak: {habit.streak} consecutive weeks"
			>
				<span>{habit.streak > 0 ? '📅' : ''}</span>
				<span class="font-medium">{habit.streak}</span>
				<span>week{habit.streak !== 1 ? 's' : ''}</span>
			</div>

			<!-- Row 3: Lifetime total days (secondary) -->
			<div
				class="text-xs text-gray-400"
				aria-label="Total: {habit.totalCompletions} days completed all time"
			>
				{habit.totalCompletions} total
			</div>
		</div>
	{:else}
		<!-- DAILY HABIT: Single streak badge (existing behavior) -->
		<div
			class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium"
			class:bg-orange-100={habit.streak > 0}
			class:text-orange-600={habit.streak > 0}
			class:bg-gray-100={habit.streak === 0}
			class:text-gray-500={habit.streak === 0}
			aria-label="Streak: {habit.streak} consecutive days"
		>
			{#if habit.streak > 0}
				<span>🔥</span>
			{/if}
			<span>{habit.streak}</span>
			<span class="text-xs font-normal opacity-75">day{habit.streak !== 1 ? 's' : ''}</span>
		</div>
	{/if}

	<!-- Edit button (unchanged, if showEdit is true) -->
	{#if showEdit}
		<!-- ... existing edit button code ... -->
	{/if}
</div>
```

##### Data Model Addition for `HabitWithStatus`

The component requires a new `totalCompletions` field:

```typescript
// src/lib/stores/habits.ts
export interface HabitWithStatus extends Habit {
	streak: number;
	completedToday: boolean;
	// NEW: For flexible streaks
	periodProgress: number;    // Completions in current period (e.g., 2)
	periodTarget: number;      // Target for current period (e.g., 3)
	periodType: 'day' | 'week';
	totalCompletions: number;  // NEW: Lifetime completion count
}
```

Add to `calculateFlexibleStreak` return type:

```typescript
// src/lib/db/habitLogs.ts
export async function calculateFlexibleStreak(habit: Habit): Promise<{
	streak: number;
	periodProgress: number;
	periodTarget: number;
	periodType: 'day' | 'week';
	totalCompletions: number;  // NEW
}> {
	// ... existing logic ...

	// Get total lifetime completions
	const totalCompletions = await db.logs
		.where('habitId').equals(habit.id!)
		.count();

	return {
		// ... existing fields ...
		totalCompletions
	};
}
```

##### Accessibility Considerations

| Feature            | Implementation                                            |
| ------------------ | --------------------------------------------------------- |
| **Screen readers** | `aria-label` on each metric with full context             |
| **Color contrast** | All colors meet WCAG AA (4.5:1 ratio)                     |
| **Icon meaning**   | 🔥 = daily streak, 📅 = weekly streak (consistent)        |
| **Unit labels**    | Always show "days" or "weeks" to avoid ambiguity          |
| **Touch targets**  | Metrics area is display-only; toggle is full-width button |

##### Mobile Responsiveness

The stacked layout for weekly habits works well on mobile:

```
┌─────────────────────────────────┐
│ 🏋️ Gym              2/3 this wk │  ← Primary: actionable
│    3x per week      📅 5 weeks  │  ← Streak
│                     45 total    │  ← Lifetime
└─────────────────────────────────┘
```

- **Minimum width:** ~320px (iPhone SE)
- **Metrics column:** Right-aligned, max-width ~100px
- **Text truncation:** Habit name truncates, metrics never truncate

##### Visual States Summary

| State                    | Daily Habit          | Weekly Habit                   |
| ------------------------ | -------------------- | ------------------------------ |
| **Not started**          | Gray badge, "0 days" | Gray progress, "0/3 this week" |
| **Active streak**        | Orange 🔥, "12 days" | Blue progress + orange 📅      |
| **Target met this week** | N/A                  | Green "3/3 this week" ✓        |
| **Completed today**      | Ring + checkmark     | Ring + checkmark               |

#### HabitForm.svelte Updates

Add frequency selection fields (see Section 3.2 for wireframe).

---

## 4. Sync Implications

### 4.1 Conflict Resolution

The new frequency fields follow the existing **last-write-wins** strategy:

```typescript
// src/lib/sync/conflicts.ts - Updated
export function resolveHabitConflict(
  local: Habit,
  remote: HabitRow
): ConflictResult<Partial<Habit>> {
  // ... existing timestamp comparison ...

  // Include new fields in conflict resolution
  if (localUpdatedAt > remoteUpdatedAt) {
    return {
      resolution: 'local',
      data: {
        // ... existing fields ...
        frequencyType: local.frequencyType,
        frequencyTarget: local.frequencyTarget,
        weekStartsOn: local.weekStartsOn,
      },
      // ...
    };
  }
  // ... remote wins case includes new fields from remote
}
```

### 4.2 Queue Operations

No changes needed - frequency fields are part of the habit payload and sync with existing create/update operations.

### 4.3 Edge Cases

| Scenario                         | Handling                                                  |
| -------------------------------- | --------------------------------------------------------- |
| **Frequency changed mid-streak** | Recalculate from current week; previous weeks unaffected  |
| **Offline for multiple weeks**   | All completions logged locally, streak calculated on sync |
| **Target increased (3→5)**       | Current week recalculated with new target                 |
| **Target decreased (5→3)**       | Current week immediately benefits from lower target       |

---

## 5. Migration Strategy

### 5.1 Database Migration

1. **Supabase Migration**: Deploy `20260205_flexible_streaks.sql`
2. **Dexie Version Bump**: Increment database version in `db.ts`

```typescript
// src/lib/db/db.ts
export class HungryHundredsDB extends Dexie {
  constructor() {
    super('HungryHundreds');

    // Version 1: Original schema
    this.version(1).stores({
      habits: '++id, serverId, createdAt',
      logs: '++id, serverId, [habitId+date], habitId, completedAt, synced',
      syncQueue: '++id, timestamp'
    });

    // Version 2: Add frequency fields
    this.version(2).stores({
      habits: '++id, serverId, createdAt',
      logs: '++id, serverId, [habitId+date], habitId, completedAt, synced',
      syncQueue: '++id, timestamp'
    }).upgrade(tx => {
      // Migrate existing habits to default frequency
      return tx.table('habits').toCollection().modify(habit => {
        habit.frequencyType = habit.frequencyType ?? 'daily';
        habit.frequencyTarget = habit.frequencyTarget ?? 1;
        habit.weekStartsOn = habit.weekStartsOn ?? 1;
      });
    });
  }
}
```

### 5.2 Backward Compatibility

| Aspect                | Handling                                                 |
| --------------------- | -------------------------------------------------------- |
| **Existing habits**   | Auto-migrate to `daily` type with target `1`             |
| **Existing streaks**  | Preserved - daily calculation unchanged for daily habits |
| **Old clients**       | Will ignore new fields (graceful degradation)            |
| **API compatibility** | New fields have defaults, existing endpoints work        |

### 5.3 Rollback Plan

If issues arise:

1. **Remove UI**: Revert HabitForm/HabitCard changes (frequency fields hidden)
2. **Keep data**: Leave frequency columns in database (no data loss)
3. **Calculation fallback**: `calculateFlexibleStreak` falls back to daily for any issues

---

## 6. Performance Considerations

### 6.1 Calculation Efficiency

| Metric           | Current (Daily) | New (Weekly)    | Notes                             |
| ---------------- | --------------- | --------------- | --------------------------------- |
| **Logs fetched** | ~30-100         | ~30-100         | Same query, different processing  |
| **Iterations**   | Days in streak  | Weeks in streak | Typically fewer iterations        |
| **Complexity**   | O(n)            | O(n/7)          | Weekly is faster for long streaks |

### 6.2 Storage Impact

- **Dexie**: +3 fields per habit (~50 bytes each) = negligible
- **Supabase**: +3 columns = negligible

### 6.3 Offline Calculation

All streak calculations remain fully offline-capable:

- No network requests needed
- All data in local IndexedDB
- Real-time updates on completion

---

## 7. Acceptance Criteria

### Core Functionality

- [ ] User can create a habit with "weekly" frequency type
- [ ] User can set frequency target (1-7 times per week)
- [ ] User can set week start day (Sunday or Monday)
- [ ] Daily habits behave exactly as before (backward compatible)
- [ ] Weekly habits show streak as consecutive successful weeks
- [ ] HabitCard displays period progress (e.g., "2/3")

### Data & Sync

- [ ] New frequency fields sync correctly to Supabase
- [ ] Conflict resolution includes frequency fields
- [ ] Existing habits migrate to daily type automatically
- [ ] Works offline - all calculations local

### UI/UX

- [ ] HabitForm has frequency type selection
- [ ] HabitCard shows appropriate streak display per type
- [ ] Streak milestones (7, 30, 100) trigger celebrations for both types

### Edge Cases

- [ ] Changing frequency type mid-streak recalculates correctly
- [ ] Streak counts correctly across year boundaries
- [ ] Multiple completions on same day count as 1 toward weekly target

---

## 8. Related Files

| File                                                | Changes                                                                    |
| --------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/lib/db/db.ts`                                  | Add frequency fields to Habit interface, version upgrade                   |
| `src/lib/db/habitLogs.ts`                           | Add `calculateFlexibleStreak`, `totalCompletions`, week boundary functions |
| `src/lib/db/habits.ts`                              | Update `CreateHabitInput`, `UpdateHabitInput` types                        |
| `src/lib/stores/habits.ts`                          | Update `HabitWithStatus` with new fields, use new streak calculation       |
| `src/lib/sync/conflicts.ts`                         | Include frequency fields in conflict resolution                            |
| `src/lib/supabase/types.ts`                         | Add new columns to HabitRow type                                           |
| `src/lib/components/HabitCard.svelte`               | Stacked metrics for weekly habits (progress, streak, total)                |
| `src/lib/components/HabitForm.svelte`               | Add frequency configuration fields                                         |
| `supabase/migrations/20260205_flexible_streaks.sql` | Database migration                                                         |

---

## 9. Future Enhancements (Phase 2)

These are out of scope for the initial implementation but documented for future reference:

1. **Rest Days**: Allow users to designate specific days as "off days" (e.g., weekends)
2. **Monthly Frequency**: Support "X times per month" in addition to weekly
3. **Custom Periods**: Allow arbitrary period lengths (every 2 weeks, etc.)
4. **Streak Freeze**: Allow users to "freeze" their streak for vacations
5. **Statistics**: Historical view of weekly completion rates

---

## See Also

- [ROADMAP.md](../ROADMAP.md) - Phase planning
- [API.md](../API.md) - Data model documentation
- [offline-sync.md](./offline-sync.md) - Sync architecture
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture overview
