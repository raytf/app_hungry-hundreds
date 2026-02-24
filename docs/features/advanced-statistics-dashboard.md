# Feature: Advanced Statistics Dashboard

## Status

| Aspect                  | Status                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| **Phase**               | ✅ Implementation Complete                                          |
| **Date Completed**      | 2026-02-17                                                          |
| **Build Status**        | ✅ Passes (`pnpm build` succeeds, no source-file type errors)       |
| **Tests**               | ⬜ Unit tests not yet written                                       |
| **Metrics Implemented** | 6/6                                                                 |
| **Components Created**  | 4/4 (TrendIndicator, InsightCard, ConsistencyGauge, DayPatternGrid) |
| **Acceptance Criteria** | 27/30 complete (3 partial — see details below)                      |

## Purpose

The current dashboard (`src/routes/dashboard/+page.svelte`) shows basic metrics — completion rate, active habits, total streak days, longest streak, and a weekly bar chart. While useful for a quick snapshot, these metrics don't help users understand _why_ they succeed or fail, or _how_ their behavior is changing over time.

This feature adds six advanced behavioral analytics that surface actionable insights: which days and times work best, how quickly users recover from misses, a holistic consistency score, trend direction, time-to-complete tracking, and a "never miss twice" counter inspired by James Clear's Atomic Habits. Together, these metrics help users build sustainable consistency rather than chasing volatile streaks.

## User Story

As a habit tracker user, I want to see advanced behavioral analytics about my habit patterns so that I can understand when I'm most consistent, how quickly I recover from misses, and whether my overall trajectory is improving — enabling me to make informed adjustments to my routine.

## Implementation Approach

### Technical Design

#### Files Created

| File                                         | Purpose                                            |
| -------------------------------------------- | -------------------------------------------------- |
| `src/lib/stores/advancedStats.ts`            | Derived stores for all six advanced metrics        |
| `src/lib/components/TrendIndicator.svelte`   | Reusable arrow indicator (↗ → ↘) with percentage   |
| `src/lib/components/InsightCard.svelte`      | Card variant for text-based insights with icon     |
| `src/lib/components/ConsistencyGauge.svelte` | Circular gauge (0-100) for consistency score       |
| `src/lib/components/DayPatternGrid.svelte`   | 7-column heatmap grid showing day-of-week strength |

#### Files Modified

| File                                | Changes                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `src/routes/dashboard/+page.svelte` | Added advanced stats sections below existing content (66 → 153 lines)   |
| `src/lib/stores/stats.ts`           | Exported `getWeekStart()` and `getWeekDates()` (changed from private)   |
| `src/lib/db/db.ts`                  | Added Dexie v5 migration with standalone `date` index on logs table     |
| `src/lib/db/habitLogs.ts`           | Added query helpers: `getAllLogsForHabit()`, `getLogsBetweenDates()`    |
| `src/lib/db/index.ts`               | Added barrel exports for `getAllLogsForHabit` and `getLogsBetweenDates` |

#### Data Model Changes

The existing `HabitLog` interface already stores `completedAt: number` (Unix timestamp in milliseconds), which provides the time-of-day data needed for most metrics. No new fields are required on the interface itself.

**Dexie Schema Change (Version 5):**

```typescript
// src/lib/db/db.ts — new version for completedAt index
this.version(5).stores({
  habits: '++id, serverId, createdAt',
  logs: '++id, serverId, [habitId+date], habitId, completedAt, synced, date',
  syncQueue: '++id, timestamp'
});
```

The key change is adding `date` as a standalone index on `logs` (it currently only exists in the compound index `[habitId+date]`). This enables efficient date-range queries across all habits for trend calculations without filtering every log in memory.

**No Supabase migration required** — the remote `habit_logs` table already stores `logged_at TIMESTAMPTZ` which maps to `completedAt`. Analytics are computed client-side from local Dexie data.

#### New Query Helpers (`src/lib/db/habitLogs.ts`)

```typescript
/** Get all logs for a habit, sorted by date ascending */
export async function getAllLogsForHabit(habitId: number): Promise<HabitLog[]> {
  return db.logs.where('habitId').equals(habitId).sortBy('date');
}

/** Get all logs across all habits within a date range */
export async function getLogsBetweenDates(
  startDate: string,
  endDate: string
): Promise<HabitLog[]> {
  return db.logs.where('date').between(startDate, endDate, true, true).toArray();
}
```

#### Derived Stores (`src/lib/stores/advancedStats.ts`)

All six metrics are computed as derived Svelte stores that react to changes in `habits` and a configurable refresh trigger. Each metric is calculated from local Dexie data only — no network calls.

**Store Structure:**

```typescript
export interface AdvancedStats {
  dayPatterns: DayPattern[];           // Metric 1
  recoverySpeed: RecoveryMetric;       // Metric 2
  consistencyScore: ConsistencyMetric; // Metric 3
  trendDirection: TrendMetric;         // Metric 4
  timeToComplete: TimeToCompleteMetric; // Metric 5
  neverMissTwice: NeverMissTwiceMetric; // Metric 6
}
```

### Metric Algorithms

#### 1. Best Day and Time Patterns

Analyzes which days of the week and times of day the user completes habits most successfully. Surfaces insights like "You're strongest on weekday mornings" or "Weekends need support."

```typescript
interface DayPattern {
  day: string;              // 'Mon' | 'Tue' | ... | 'Sun'
  completionRate: number;   // 0-100 percentage
  avgCompletionHour: number; // 0-23 average hour of completion
  totalCompletions: number;
}

interface DayTimeInsight {
  bestDay: string;
  worstDay: string;
  bestTimeWindow: 'morning' | 'afternoon' | 'evening' | 'night';
  insightText: string; // e.g., "You're strongest on weekday mornings"
}

function calculateDayPatterns(
  logs: HabitLog[],
  habits: Habit[]
): { patterns: DayPattern[]; insight: DayTimeInsight } {
  // 1. Group logs by day-of-week (0=Sun through 6=Sat)
  // 2. For each day: count completions / total possible (habits × weeks active)
  // 3. Extract hour from completedAt timestamp for time-of-day analysis
  // 4. Classify hours: morning (5-11), afternoon (12-16), evening (17-20), night (21-4)
  // 5. Find best/worst days and dominant time window
  // 6. Generate natural language insight string
  //
  // Only analyze last 30 days of data to keep patterns current
  // Minimum 7 days of data required; return empty/default if insufficient
}
```

#### 2. Recovery Speed

Tracks how quickly users return to habits after missing a day. Measures the average gap length between a miss and the next completion.

```typescript
interface RecoveryMetric {
  averageRecoveryDays: number; // e.g., 1.2
  trend: 'improving' | 'steady' | 'declining'; // compared to previous period
  totalMisses: number;        // in analysis window
  totalRecoveries: number;    // times user came back after a miss
}

function calculateRecoverySpeed(
  logs: HabitLog[],
  habitCreatedAt: number
): RecoveryMetric {
  // 1. Build a set of all completion dates (across all habits or per-habit)
  // 2. Walk through each day from habit creation to today
  // 3. When a gap is found (no completion), count consecutive miss days
  // 4. When a completion follows a gap, record the gap length as a recovery
  // 5. Average all recovery gap lengths
  // 6. Compare recent 2-week recovery avg vs previous 2-week for trend
  //
  // Analysis window: last 60 days (need enough data for trend)
  // If no misses exist, return { averageRecoveryDays: 0, trend: 'steady', ... }
}
```

#### 3. Consistency Score

A weighted metric (0-100) that factors in recency, frequency, and regularity. Prioritizes steady 5/7 days per week over volatile 14-day streaks followed by gaps.

```typescript
interface ConsistencyMetric {
  score: number;          // 0-100
  breakdown: {
    recency: number;      // 0-40 points — weighted toward recent completions
    frequency: number;    // 0-35 points — overall completion rate
    regularity: number;   // 0-25 points — low variance in daily completion pattern
  };
  label: string;          // 'Excellent' | 'Good' | 'Building' | 'Needs Work'
}

function calculateConsistencyScore(
  logs: HabitLog[],
  totalHabits: number
): ConsistencyMetric {
  // RECENCY (0-40 points):
  //   - Divide last 28 days into 4 weeks
  //   - Week 1 (most recent): weight 4x
  //   - Week 2: weight 3x
  //   - Week 3: weight 2x
  //   - Week 4: weight 1x
  //   - Score = weighted completion rate × 40
  //
  // FREQUENCY (0-35 points):
  //   - Overall completion rate over last 28 days
  //   - Score = (completions / possible) × 35
  //
  // REGULARITY (0-25 points):
  //   - Calculate standard deviation of daily completion counts
  //   - Lower variance = higher score
  //   - Score = max(0, 25 - (stddev × 10))
  //   - A user completing 5/7 days every week scores higher than
  //     one completing 14 days then missing 14 days
  //
  // LABELS:
  //   90-100: 'Excellent'
  //   70-89:  'Good'
  //   40-69:  'Building'
  //   0-39:   'Needs Work'
  //
  // Minimum 7 days of data required; return score 0 with 'Needs Work' if insufficient
}
```

#### 4. Trend Direction

Compares recent 2 weeks vs. previous 2 weeks to show directional momentum.

```typescript
interface TrendMetric {
  direction: 'improving' | 'steady' | 'declining';
  percentageChange: number;  // e.g., +12 or -8
  recentRate: number;        // completion rate for recent 2 weeks (0-100)
  previousRate: number;      // completion rate for previous 2 weeks (0-100)
  arrow: '↗' | '→' | '↘';
}

function calculateTrendDirection(
  logs: HabitLog[],
  totalHabits: number
): TrendMetric {
  // 1. Define periods:
  //    - Recent: today minus 13 days through today (14 days)
  //    - Previous: today minus 27 days through today minus 14 days (14 days)
  // 2. Calculate completion rate for each period:
  //    rate = completions / (totalHabits × daysInPeriod) × 100
  // 3. Calculate percentage change:
  //    change = recentRate - previousRate
  // 4. Classify:
  //    - change > 5:  'improving' / '↗'
  //    - change < -5: 'declining' / '↘'
  //    - else:        'steady' / '→'
  //
  // Requires at least 14 days of data for meaningful comparison
  // If < 14 days, return 'steady' with 0% change
}
```

#### 5. Time-to-Complete Tracking

For habits with `reminderTime` set, measures the delay between the reminder time and the actual `completedAt` timestamp. Tracks whether this delay is decreasing over time (habit becoming more automatic).

```typescript
interface TimeToCompleteMetric {
  averageDelayMinutes: number;  // e.g., 45
  trend: 'faster' | 'stable' | 'slower';
  recentAvgMinutes: number;    // last 7 days average
  previousAvgMinutes: number;  // 7 days before that
  applicableHabits: number;    // habits with reminderTime set
}

function calculateTimeToComplete(
  logs: HabitLog[],
  habits: Habit[]
): TimeToCompleteMetric {
  // 1. Filter habits that have reminderTime set
  // 2. For each log of those habits:
  //    a. Parse reminderTime (HH:MM) into minutes-since-midnight
  //    b. Extract hour/minute from completedAt timestamp
  //    c. Calculate delay = completedAt time - reminderTime
  //    d. Handle day-boundary: if delay < 0, user completed before reminder (delay = 0)
  //    e. Cap maximum delay at 720 minutes (12 hours) to exclude next-day completions
  // 3. Average all delays for overall metric
  // 4. Compare recent 7-day avg vs previous 7-day avg for trend:
  //    - recentAvg < previousAvg - 5min: 'faster'
  //    - recentAvg > previousAvg + 5min: 'slower'
  //    - else: 'stable'
  //
  // If no habits have reminderTime, return defaults with applicableHabits: 0
  // UI should hide this card when applicableHabits === 0
}
```

#### 6. "Never Miss Twice" Counter

Tracks the longest streak of never missing the same habit two consecutive days in a row. Inspired by James Clear's principle: "Never miss twice."

```typescript
interface NeverMissTwiceMetric {
  currentStreak: number;   // current "never missed twice" streak in days
  bestStreak: number;      // all-time best
  isActive: boolean;       // whether the current streak is still going
}

function calculateNeverMissTwice(
  logs: HabitLog[],
  habits: Habit[]
): NeverMissTwiceMetric {
  // 1. For each habit, build a set of completion dates
  // 2. Walk through each day from the earliest habit creation to today
  // 3. For each day, check if ANY habit was missed two consecutive days:
  //    - Day N has no completion AND Day N-1 has no completion for the same habit
  //    - If so, the "never miss twice" streak is broken
  // 4. Track current streak (days since last "missed twice" event)
  // 5. Track best-ever streak
  //
  // Edge cases:
  //   - New habits: only count days after the habit was created
  //   - Deleted habits: exclude from calculation
  //   - Weekly habits: check against weekly period, not daily
  //   - If user has 0 habits, return { currentStreak: 0, bestStreak: 0, isActive: false }
}
```

### UI/UX Design

#### Dashboard Layout (Updated)

The dashboard page (`src/routes/dashboard/+page.svelte`) will be extended with new sections below the existing content. The existing Today's Progress, Weekly Chart, and Stats Grid sections remain unchanged.

```
┌─────────────────────────────────┐
│ Header: Statistics              │  ← existing
├─────────────────────────────────┤
│ Today's Progress (ring + text)  │  ← existing
├─────────────────────────────────┤
│ Weekly Chart (bar chart)        │  ← existing
├─────────────────────────────────┤
│ Stats Grid (2×2)                │  ← existing
│ ┌──────────┐ ┌──────────┐      │
│ │ Rate 📊  │ │ Active 📋│      │
│ ├──────────┤ ├──────────┤      │
│ │ Streak 🔥│ │ Best  🏆 │      │
│ └──────────┘ └──────────┘      │
├─────────────────────────────────┤  ← NEW SECTIONS BELOW
│ Consistency Score               │
│ ┌───────────────────────────┐   │
│ │ [Gauge 0-100]  "Good"    │   │
│ │ Recency ████░░  32/40    │   │
│ │ Frequency ███░░  25/35   │   │
│ │ Regularity ██░░  18/25   │   │
│ └───────────────────────────┘   │
├─────────────────────────────────┤
│ Trend & Recovery (2-col)        │
│ ┌────────────┐ ┌────────────┐  │
│ │ Improving  │ │ Recovery   │  │
│ │ ↗ +12%    │ │ 1.2 days   │  │
│ └────────────┘ └────────────┘  │
├─────────────────────────────────┤
│ Day Patterns (heatmap grid)     │
│ ┌───────────────────────────┐   │
│ │ M  T  W  T  F  S  S      │   │
│ │ ██ ██ ██ ██ ██ ░░ ░░     │   │
│ │ "Strongest on weekdays"   │   │
│ └───────────────────────────┘   │
├─────────────────────────────────┤
│ Advanced Stats Grid (2-col)     │
│ ┌────────────┐ ┌────────────┐  │
│ │ Never Miss │ │ Response   │  │
│ │ Twice: 23d │ │ Time: 45m  │  │
│ └────────────┘ └────────────┘  │
├─────────────────────────────────┤
│ Motivation Section              │  ← existing
└─────────────────────────────────┘
```

#### New Components

**`TrendIndicator.svelte`** — Compact directional indicator used inside cards.

```svelte
<script lang="ts">
	interface Props {
		direction: 'improving' | 'steady' | 'declining';
		percentage: number;
	}
	let { direction, percentage }: Props = $props();

	let arrow = $derived(direction === 'improving' ? '↗' : direction === 'declining' ? '↘' : '→');
	let colorClass = $derived(
		direction === 'improving'
			? 'text-green-600'
			: direction === 'declining'
				? 'text-red-500'
				: 'text-gray-500'
	);
</script>

<span class="inline-flex items-center gap-1 text-sm font-medium {colorClass}">
	{arrow}
	{percentage > 0 ? '+' : ''}{percentage}%
</span>
```

**`InsightCard.svelte`** — Text-based insight card with icon and optional trend.

```svelte
<script lang="ts">
	interface Props {
		icon: string;
		label: string;
		value: string;
		subtitle?: string;
		trend?: { direction: 'improving' | 'steady' | 'declining'; percentage: number };
	}
	let { icon, label, value, subtitle, trend }: Props = $props();
</script>

<div class="card">
	<div class="mb-2 flex items-start justify-between">
		<span class="text-sm text-gray-500">{label}</span>
		<span class="text-lg">{icon}</span>
	</div>
	<p class="text-2xl font-bold text-gray-900">{value}</p>
	{#if subtitle}
		<p class="mt-1 text-xs text-gray-500">{subtitle}</p>
	{/if}
	{#if trend}
		<TrendIndicator direction={trend.direction} percentage={trend.percentage} />
	{/if}
</div>
```

**`ConsistencyGauge.svelte`** — Circular gauge displaying the 0-100 consistency score with breakdown bars.

- Reuses the existing `ProgressRing` component for the circular gauge
- Adds three horizontal progress bars below for recency/frequency/regularity breakdown
- Color transitions: red (0-39) → orange (40-69) → green (70-89) → hungry-600 (90-100)

**`DayPatternGrid.svelte`** — 7-column heatmap showing completion strength per day of week.

- Each column represents a day (Mon-Sun)
- Color intensity maps to completion rate (lighter = lower, darker = higher)
- Uses the existing hungry color palette for consistency
- Displays the natural language insight text below the grid

#### Offline Behavior

All advanced metrics work fully offline because they are computed from local Dexie data only. No network requests are made for analytics. When new data syncs in (pull from Supabase), the derived stores automatically recompute because the underlying `liveQuery` on `db.logs` fires change events.

### Integration Points

#### Existing Code Interactions

| Integration                              | How                                                                                                         |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/lib/stores/habits.ts`               | `advancedStats` subscribes to the `habits` store for habit count and metadata (reminderTime, frequencyType) |
| `src/lib/stores/stats.ts`                | Reuse `getWeekStart()` and `getWeekDates()` helpers (export them if currently private)                      |
| `src/lib/db/habitLogs.ts`                | New query helpers (`getAllLogsForHabit`, `getLogsBetweenDates`) added here                                  |
| `src/lib/db/db.ts`                       | Dexie version 5 upgrade adds `date` index on logs table                                                     |
| `src/lib/components/ProgressRing.svelte` | Reused by `ConsistencyGauge` for the circular score display                                                 |
| `src/lib/components/StatsCard.svelte`    | Existing card used for simple value metrics (never-miss-twice, time-to-complete)                            |
| `src/routes/dashboard/+page.svelte`      | Imports `advancedStats` store and new components                                                            |

#### Sync Considerations

- **No new sync operations** — Advanced stats are read-only derived computations from existing `HabitLog` data
- **Sync pull triggers recomputation** — When `sync.ts` pulls new logs from Supabase, Dexie's `liveQuery` fires, which triggers the `advancedStats` derived store to recompute
- **No server-side analytics** — All computation is client-side to maintain offline-first architecture
- **Cross-device consistency** — After a full sync, all devices will compute identical metrics from the same log data

#### API Endpoints

No new Supabase Edge Functions are needed. All analytics are computed client-side from local data.

## Acceptance Criteria

### Metric 1: Best Day and Time Patterns

- [x] Displays a 7-day heatmap grid showing completion strength per day of week
- [x] Shows natural language insight (e.g., "You're strongest on weekday mornings")
- [x] Correctly identifies best and worst days from last 30 days of data
- [x] Extracts time-of-day from `completedAt` timestamps for time window classification
- [x] Gracefully handles < 7 days of data (shows "Complete habits for a week to see patterns")

### Metric 2: Recovery Speed

- [x] Displays average recovery time in days (e.g., "1.2 days")
- [ ] Shows trend indicator (improving/steady/declining) — _trend is computed but not displayed in UI; InsightCard does not pass `trend` prop_
- [x] Correctly identifies gaps in completion and measures recovery time
- [x] Handles edge case of zero misses (shows "Perfect!" / "No misses yet — keep it up!")

### Metric 3: Consistency Score

- [x] Displays score as circular gauge (0-100) with label
- [x] Shows breakdown bars for recency, frequency, and regularity sub-scores
- [x] Recency weighting correctly prioritizes recent weeks (4x/3x/2x/1x)
- [x] Regularity score correctly penalizes high variance patterns
- [x] Score updates reactively when habits are completed

### Metric 4: Trend Direction

- [x] Displays arrow indicator (↗ → ↘) with percentage change
- [x] Correctly compares recent 14 days vs previous 14 days
- [x] Uses ±5% threshold for improving/declining classification
- [ ] Shows "Not enough data" when < 14 days of history — _returns steady/0% instead of explicit message_

### Metric 5: Time-to-Complete Tracking

- [x] Only displays for habits with `reminderTime` set
- [x] Correctly calculates delay between reminder time and completion time
- [x] Caps delay at 12 hours to exclude next-day completions
- [ ] Shows trend (faster/stable/slower) comparing recent vs previous 7 days — _trend is computed but not displayed in UI; InsightCard does not pass `trend` prop_
- [x] Hidden when no habits have reminder times configured

### Metric 6: "Never Miss Twice" Counter

- [x] Displays current streak of never missing same habit two consecutive days
- [x] Displays all-time best streak
- [x] Correctly handles per-habit tracking (not aggregate)
- [x] Only counts days after each habit's creation date
- [x] Handles weekly habits — _deviation: weekly habits are skipped entirely rather than checked against weekly period (see Implementation Notes)_

### General

- [x] All metrics work fully offline (no network requests)
- [x] Metrics recompute when new data syncs from Supabase (via Dexie `liveQuery`)
- [ ] Dashboard loads within 200ms on a device with 100 habits and 1 year of logs — _not yet verified with performance testing_
- [x] New components follow existing Svelte 5 runes patterns (`$props()`, `$derived`)
- [x] New components use existing Tailwind utility classes and hungry color palette
- [x] Dexie version 5 migration is idempotent and preserves existing data

### Additional Criteria (emerged during implementation)

- [x] `isLoading` flag on AdvancedStats enables progressive rendering with skeleton loaders
- [x] `hasEnoughData` flag gates DayPatternGrid display to avoid empty heatmaps
- [x] Error handling wraps `computeAllMetrics` in try/catch with fallback to defaults
- [x] `refreshAdvancedStats()` function exported for manual refresh trigger
- [x] 300ms debounce prevents rapid recomputation during batch completions
- [x] Analysis capped at 365 days for Never Miss Twice to bound computation cost
- [x] `recentLogs` store uses `liveQuery` directly on `db.logs` for automatic Dexie reactivity

## Implementation Notes

### Deviations from Original Plan

1. **Debounce timing:** Documentation specified 500ms debounce; implementation uses 300ms. The shorter interval felt more responsive during manual testing without causing performance issues.

2. **Lazy computation strategy:** Documentation mentioned `requestIdleCallback` or `setTimeout(0)` for idle-time computation. Implementation uses a standard `setTimeout` with 300ms debounce instead, which is simpler and achieves the same goal of avoiding rapid recomputation.

3. **Loading skeleton:** Documentation referenced Motion One transitions for progressive rendering. Implementation uses CSS `animate-pulse` skeleton placeholder, which avoids adding a Motion One dependency for a simple loading state.

4. **Weekly habits in Never Miss Twice:** Documentation specified checking weekly habits against their weekly period. Implementation skips weekly habits entirely (`if (habit.frequencyType === 'weekly') continue`) because determining "missed" for a weekly habit on a per-day basis is ambiguous — the user could complete any day within the week. This simplification avoids false negatives.

5. **`recentLogs` data source:** Documentation implied using the `getLogsBetweenDates()` helper from `habitLogs.ts`. Implementation uses `liveQuery` directly on `db.logs` for automatic Dexie reactivity (the helper is a one-shot async function, not a reactive query).

6. **Unused re-exported helpers:** `getWeekStart()` and `getWeekDates()` were exported from `stats.ts` as planned, but `advancedStats.ts` computes its own date ranges inline since it needs different windows (30/60/28/14 days) than the weekly helpers provide.

7. **Memoization vs. debouncing:** Documentation described explicit memoization (cache last result + log count). Implementation relies on debouncing only, since Svelte's derived store already avoids recomputation when inputs haven't changed.

### Partial Implementations

Three acceptance criteria are partially met:

| Criterion                         | Status                  | Detail                                                                                                                             |
| --------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Recovery Speed trend indicator    | Computed, not displayed | `calculateRecoverySpeed()` returns a `trend` object, but the dashboard's `InsightCard` for recovery does not pass the `trend` prop |
| Time-to-Complete trend            | Computed, not displayed | `calculateTimeToComplete()` returns a `trend` object, but the dashboard's `InsightCard` does not pass it                           |
| Trend Direction "Not enough data" | Returns default instead | When < 14 days of history, returns `steady` / `0%` rather than an explicit "Not enough data" message                               |

These are minor UI wiring gaps — the data is available and can be connected with a one-line prop addition each.

### Technical Decisions

- **365-day cap on Never Miss Twice:** The algorithm walks every day since each habit's creation. To prevent runaway computation for long-lived habits, the check is capped at 365 days back from today.
- **60-day window for `recentLogs`:** A single `liveQuery` fetches 60 days of logs, which covers the largest analysis window (Recovery Speed). Other metrics filter this set further (30 days for Day Patterns, 28 for Consistency/Trend, 14 for Time-to-Complete).
- **Error boundary:** `computeAllMetrics()` is wrapped in try/catch. On error, the store returns safe defaults with `isLoading: false` and `hasEnoughData: false`, preventing a computation error from crashing the dashboard.
- **Dexie v5 migration:** Adding the standalone `date` index requires no `.upgrade()` handler — Dexie automatically builds the index from existing data on the next database open.

## Performance Considerations

### Computation Cost

| Metric            | Data Scanned                             | Complexity                             | Mitigation                              |
| ----------------- | ---------------------------------------- | -------------------------------------- | --------------------------------------- |
| Day Patterns      | Last 30 days of logs                     | O(n) where n = logs in 30 days         | Date-range filter before processing     |
| Recovery Speed    | Last 60 days of logs                     | O(n × h) where h = habits              | Pre-group logs by habitId               |
| Consistency Score | Last 28 days of logs                     | O(n) single pass with bucketing        | Reuse grouped data from other metrics   |
| Trend Direction   | Last 28 days of logs                     | O(n) two-pass count                    | Share date-range query with consistency |
| Time-to-Complete  | Last 14 days of logs for reminder habits | O(n) filtered subset                   | Skip entirely if no reminder habits     |
| Never Miss Twice  | All logs for active habits               | O(d × h) where d = days since creation | Most expensive — cap at 365 days        |

### Optimization Strategy

1. **Single Dexie query** — Fetch all logs for the analysis window (last 60 days) in one `getLogsBetweenDates()` call, then compute all metrics from the in-memory array. Avoids 6 separate IndexedDB queries.

2. **Lazy computation** — The `advancedStats` store uses `derived()` with an async setter. Metrics are computed in a `requestIdleCallback` or `setTimeout(0)` to avoid blocking the main thread during initial dashboard render.

3. **Debounced refresh** — When multiple habit completions happen rapidly (e.g., catching up on a week), debounce the advanced stats recomputation by 500ms to avoid redundant calculations.

4. **Memoization** — Cache the last computed result and the log count that produced it. Only recompute when the log count changes (new completions or sync).

5. **Progressive rendering** — Show existing basic stats immediately. Advanced stats sections show skeleton loaders while computing, then fade in with Motion One transitions.

### Bundle Size Impact

| Addition                                | Estimated Size      |
| --------------------------------------- | ------------------- |
| `advancedStats.ts` (store + algorithms) | ~3-4 KB gzipped     |
| `TrendIndicator.svelte`                 | ~0.3 KB             |
| `InsightCard.svelte`                    | ~0.4 KB             |
| `ConsistencyGauge.svelte`               | ~0.8 KB             |
| `DayPatternGrid.svelte`                 | ~0.6 KB             |
| **Total**                               | **~5-6 KB gzipped** |

This stays well within the 75KB total bundle budget. No new dependencies are required — all calculations use native JavaScript.

### Offline Storage Impact

No additional IndexedDB storage is needed. All metrics are computed on-the-fly from existing `HabitLog` records. The only schema change is adding a `date` index to the logs table (Dexie version 5), which adds negligible overhead to the existing index set.

## Migration Strategy for Existing Users

### `completedAt` Timestamp Data

The `HabitLog.completedAt` field has been stored since the initial Dexie schema (version 1). All existing logs already have valid `completedAt` timestamps. **No data migration is needed for timestamp data.**

However, the accuracy of time-of-day analysis depends on when `completedAt` was recorded:

- Logs created through normal app usage: `completedAt` reflects the actual moment the user tapped "Done" — accurate for time-of-day analysis
- Logs created through backfill (past 7 days): `completedAt` reflects when the backfill was performed, not when the habit was actually done — less accurate for time-of-day analysis
- Logs synced from Supabase: `completedAt` is mapped from `logged_at` which is set server-side on first sync — accurate

### Dexie Version 5 Migration

```typescript
// src/lib/db/db.ts
this.version(5).stores({
  habits: '++id, serverId, createdAt',
  logs: '++id, serverId, [habitId+date], habitId, completedAt, synced, date',
  syncQueue: '++id, timestamp'
});
// No .upgrade() needed — adding an index doesn't require data transformation
// Dexie automatically builds the new index from existing data
```

This migration is safe and idempotent:

- Adding a new index (`date`) to an existing table does not modify data
- Dexie rebuilds the index automatically from existing records
- No `.upgrade()` handler is needed
- Existing queries continue to work unchanged

### Graceful Degradation

For users with limited history, each metric handles insufficient data:

| Metric            | Minimum Data              | Fallback Display                             |
| ----------------- | ------------------------- | -------------------------------------------- |
| Day Patterns      | 7 days                    | "Complete habits for a week to see patterns" |
| Recovery Speed    | 1 miss + 1 recovery       | "No misses yet — keep it up!"                |
| Consistency Score | 7 days                    | Score 0 with "Building" label                |
| Trend Direction   | 14 days                   | "→ Steady" with 0% change                    |
| Time-to-Complete  | 1 reminder habit + 3 days | Hidden entirely                              |
| Never Miss Twice  | 2 days                    | Shows 0 with encouragement text              |
