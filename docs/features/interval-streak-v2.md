# Feature: Interval Streak V2 + Habit Completion History

## Purpose

Two related improvements shipped together because they share the same data-model change.

1. **Non-retroactive interval streak** – each completion permanently records the
   interval that governed its window. Changing `x` later only affects the next
   window, not past ones or the currently-open one.

2. **Habit completion history view** – the habit detail page gains a
   period-filtered chart and completion log for that specific habit, modelled
   after the Journey page but scoped to one habit.

---

## User Stories

**Interval streak fix**
> As a user tracking "deep-clean every 14 days", I want changing the interval to
> 10 days to only affect my next cycle, not erase the streak I built under the
> 14-day rule.

**Completion history**
> As a user, I want to open a habit's detail page, pick "Last Month", and see
> exactly which days or windows I completed it, so I can spot patterns.

---

## Phase 1 — Data Model  
**Files:** `src/lib/db/db.ts`

### 1a. `HabitLog` — add `windowIntervalDays`

```ts
export interface HabitLog {
  // ... existing fields ...
  windowIntervalDays?: number; // interval active when this completion opened its next window
}
```

This is the single field that makes the streak non-retroactive.
It is only written for `every-x-days` habits; it is `undefined` for daily/weekly.

### 1b. `Habit` — add `pendingIntervalDays`

```ts
export interface Habit {
  // ... existing fields ...
  pendingIntervalDays?: number; // new interval waiting to apply on next completion
}
```

### 1c. Dexie version 6 — backfill migration

No new indexes needed. Add version 6 with an upgrade function only:

```ts
this.version(6)
  .stores({ /* identical to v5 */ })
  .upgrade(async (tx) => {
    // For each every-x-days habit, stamp all its existing logs
    // with the habit's current intervalDays as a best-guess baseline.
    const habits = await tx.table('habits').toArray();
    for (const habit of habits) {
      if (habit.schedule?.type === 'every-x-days' && habit.schedule.intervalDays) {
        await tx.table('logs')
          .where('habitId').equals(habit.id)
          .modify({ windowIntervalDays: habit.schedule.intervalDays });
      }
    }
  });
```

After migration, all historical logs for interval habits carry the current
interval as their baseline. From the next completion onward, each log carries
the exact interval that was active at the time.

---

## Phase 2 — Log Creation: Write `windowIntervalDays`  
**Files:** `src/lib/db/habitLogs.ts`

### 2a. Extend `logHabitCompletion`

Add an optional parameter:

```ts
export async function logHabitCompletion(
  habitId: number,
  date?: string,
  completionType: CompletionType = 'full',
  windowIntervalDays?: number   // ← new
): Promise<number>
```

When writing the `HabitLog` record, include `windowIntervalDays` if provided.

### 2b. New helper: `resolveWindowInterval(habit: Habit): number | undefined`

```ts
// Returns the interval to stamp on the NEXT log.
// Prefers pendingIntervalDays if set, else falls back to schedule.intervalDays.
// Returns undefined for non-interval habits.
export function resolveWindowInterval(habit: Habit): number | undefined {
  if (habit.schedule?.type !== 'every-x-days') return undefined;
  return habit.pendingIntervalDays ?? habit.schedule.intervalDays;
}
```

### 2c. New helper: `clearPendingInterval(habitId: number)`

```ts
// Called after a completion consumes pendingIntervalDays.
export async function clearPendingInterval(habitId: number): Promise<void> {
  await db.habits.update(habitId, { pendingIntervalDays: undefined });
}
```

---

## Phase 3 — Non-Retroactive Streak Algorithm  
**Files:** `src/lib/db/habitLogs.ts` — `calculateIntervalStreak`

### Current algorithm (retroactive)

```ts
// Every gap is compared against the habit's CURRENT intervalDays.
if (gapDays <= intervalDays) { streak++; }
```

### New algorithm (non-retroactive)

Walk completion pairs newest → oldest.  
For the gap between `completions[i]` (newer) and `completions[i+1]` (older),
compare against **`completions[i+1].windowIntervalDays`**, because the older
completion opened that window.

```ts
for (let i = 0; i < logsNewestFirst.length - 1; i++) {
  const newerLog = logsNewestFirst[i];
  const olderLog  = logsNewestFirst[i + 1];
  const gapDays  = daysBetween(olderLog.date, newerLog.date);
  // Govern the gap by the older log's recorded interval (fallback to current)
  const governs  = olderLog.windowIntervalDays ?? habit.schedule.intervalDays ?? 7;
  if (gapDays <= governs) {
    streak++;
  } else {
    break;
  }
}
```

### Due date

Use the **latest log's** `windowIntervalDays` for the current open window:

```ts
const latestLog = logsNewestFirst[0];
const effectiveInterval = latestLog.windowIntervalDays ?? habit.schedule.intervalDays ?? 7;
const nextDueMs = lastMs + effectiveInterval * msPerDay;
```

### Overdue rule stays the same

If `dueInDays < 0`, streak = 0. This still applies to the latest window.

---

## Phase 4 — Habits Store: Pending Interval on Edit  
**Files:** `src/lib/stores/habits.ts`

### 4a. `habits.edit` — detect mid-window change

When editing an `every-x-days` habit and `schedule.intervalDays` changes:

1. Fetch the latest log for the habit.
2. Compute `dueInDays` from the latest log using the **old** interval.
3. If `dueInDays > 0` (active window): set `pendingIntervalDays = newIntervalDays`,
   do NOT change `schedule.intervalDays`.
4. If `dueInDays <= 0` (no active window or overdue): apply immediately to
   `schedule.intervalDays`, clear any `pendingIntervalDays`.

```ts
// Pseudo-code inside habits.edit
const isIntervalChange =
  updates.schedule?.type === 'every-x-days' &&
  updates.schedule.intervalDays !== habit.schedule.intervalDays;

if (isIntervalChange) {
  const dueInDays = await computeDueInDays(habit);
  if (dueInDays > 0) {
    // Active window — defer the change
    await updateHabit(id, {
      pendingIntervalDays: updates.schedule.intervalDays,
      // keep existing schedule.intervalDays unchanged
    });
    return; // don't fall through to normal update
  }
}
// Otherwise apply normally (includes immediate apply for overdue/no-window)
```

### 4b. `habits.toggle` — consume pending interval

After a successful completion for an `every-x-days` habit:

```ts
const windowInterval = resolveWindowInterval(habit);
await logHabitCompletion(id, date, completionType, windowInterval);

if (habit.pendingIntervalDays !== undefined) {
  // Apply the pending change: update schedule and clear pending
  await updateHabit(id, {
    schedule: { type: 'every-x-days', intervalDays: habit.pendingIntervalDays },
    pendingIntervalDays: undefined
  });
}
```

### 4c. "Apply now" escape hatch

Add a `habits.applyIntervalNow(id: number)` method:

```ts
// Forces immediate interval change, resetting the current window.
// Used when the user explicitly chooses "Apply now & restart interval".
export async function applyIntervalNow(id: number, newIntervalDays: number): Promise<void> {
  await updateHabit(id, {
    schedule: { type: 'every-x-days', intervalDays: newIntervalDays },
    pendingIntervalDays: undefined
  });
}
```

---

## Phase 5 — HabitForm / Edit Page: Pending Notice  
**Files:** `src/lib/components/HabitForm.svelte`, `src/routes/habits/[id]/edit/+page.svelte`

### 5a. Edit page detects pending state

```ts
const hasPending = $derived(
  habit?.schedule?.type === 'every-x-days' && habit?.pendingIntervalDays !== undefined
);
```

### 5b. Show info banner above the form

```svelte
{#if hasPending}
  <div class="card mb-4 border border-amber-200 bg-amber-50 p-4">
    <p class="text-sm font-medium text-amber-800">
      ⏳ A change to <strong>Every {habit.pendingIntervalDays} days</strong>
      is pending — it will take effect after your next completion.
    </p>
    <button onclick={handleApplyNow} class="mt-2 text-xs text-amber-700 underline">
      Apply now and restart interval instead
    </button>
  </div>
{/if}
```

### 5c. `handleApplyNow`

Calls `habits.applyIntervalNow(habit.id, habit.pendingIntervalDays!)` then
navigates back.

---

## Phase 6 — PeriodSelector: Configurable Presets  
**Files:** `src/lib/components/PeriodSelector.svelte`, `src/lib/stores/periodStats.ts`

### 6a. New preset types

```ts
export type PeriodPreset = 'day' | '7days' | '30days' | 'month' | '3months' | 'custom';
```

### 6b. `getPresetRange` — new cases

```ts
case 'month': {
  const d = new Date(today);
  d.setDate(1); // first of current month
  return { start: formatDateLocal(d), end: end };
}
case '3months': {
  const d = new Date(today);
  d.setDate(d.getDate() - 89);
  return { start: formatDateLocal(d), end };
}
```

### 6c. `PeriodSelector` — accept `presets` prop

```svelte
interface Props {
  value: PeriodRange;
  onchange: (range: PeriodRange) => void;
  presets?: { id: PeriodPreset; label: string }[]; // override defaults
}
```

Default remains the existing four. Habit detail page passes its own set:

```ts
const HABIT_PRESETS = [
  { id: '7days',   label: '7 Days'   },
  { id: 'month',   label: 'Month'    },
  { id: '3months', label: '3 Months' },
  { id: 'custom',  label: 'Custom'   },
];
```

---

## Phase 7 — Habit Completion History Section  
**Files:** `src/routes/habits/[id]/+page.svelte` + new components

### 7a. State in the detail page

```ts
// Local period state — independent from the journey page's selectedPeriod
const defaultHabitPeriod = getPresetRange('7days');
let habitPeriod = $state<PeriodRange>({ preset: '7days', ...defaultHabitPeriod });

// Reactive logs for this habit in the selected period (liveQuery)
let periodLogs = $state<HabitLog[]>([]);

$effect(() => {
  if (!habit?.id || !browser) return;
  const sub = liveQuery(() =>
    db.logs
      .where('[habitId+date]')
      .between([habit.id, habitPeriod.start], [habit.id, habitPeriod.end], true, true)
      .toArray()
  ).subscribe({ next: (l) => (periodLogs = l) });
  return () => sub.unsubscribe();
});
```

### 7b. New section added below Stats

```svelte
<!-- Completion History -->
<div class="card mb-4">
  <h2 class="mb-3 font-semibold text-content-muted">Completion History</h2>

  <PeriodSelector
    value={habitPeriod}
    presets={HABIT_PRESETS}
    onchange={(r) => (habitPeriod = r)}
  />

  <div class="mt-4">
    <HabitPeriodChart {habit} logs={periodLogs} period={habitPeriod} />
  </div>

  {#if habit.schedule?.type === 'every-x-days'}
    <div class="mt-4">
      <IntervalWindowList {habit} logs={periodLogs} period={habitPeriod} />
    </div>
  {/if}

  <div class="mt-4">
    <CompletionLogList logs={periodLogs} />
  </div>
</div>
```

---

## New Component: `HabitPeriodChart.svelte`  
**File:** `src/lib/components/HabitPeriodChart.svelte`

Adapts the logic from `PeriodChart.svelte` and `buildChartData` for a single habit.

### Props

```ts
interface Props {
  habit: HabitWithStatus;
  logs: HabitLog[];
  period: PeriodRange;
}
```

### Chart data logic

| Habit type | Bar unit | Bar height |
|---|---|---|
| `daily` (target 1) | 1 bar per day | 1 = completed, 0 = not |
| `daily` (target > 1) | 1 bar per day | completions / target |
| `weekly` | 1 bar per week | completions / target |
| `every-x-days` | 1 bar per window | 1 = on time, 0 = missed |

For interval habits, windows are derived from `logs` within the period:
each adjacent pair of completion dates defines a window. The bar for a window
is green if the next completion arrived within `olderLog.windowIntervalDays`
(or current interval for legacy logs), red if it didn't.

### Visual states

- **Green bar**: period/window satisfied
- **Amber bar**: partial completion (daily/weekly only)
- **Red bar**: missed / overdue
- **Gray bar**: future or active window (not yet due)

---

## New Component: `IntervalWindowList.svelte`  
**File:** `src/lib/components/IntervalWindowList.svelte`

Only rendered for `every-x-days` habits.

Shows each interval window as a card row:

```
┌─────────────────────────────────────────────────────┐
│ ✓  Apr 1 → Apr 4        Completed Apr 3   3d rule   │
│ ✓  Apr 3 → Apr 8        Completed Apr 8   5d rule ← pending applied
│ ⏳  Apr 8 → Apr 13       Due in 3 days     5d rule   │
└─────────────────────────────────────────────────────┘
```

Fields per row:
- `startDate`: previous completion date (or habit created date for first window)
- `endDate`: `startDate + windowIntervalDays`
- `completionDate`: the completion that closed this window (if any)
- `status`: `'completed'` | `'missed'` | `'active'`
- `intervalDays`: the interval that governed this window (`windowIntervalDays` from the log)

**Window derivation algorithm** (pure function, no DB calls):

```ts
function deriveWindows(logs: HabitLog[], habit: Habit): IntervalWindow[] {
  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
  const windows: IntervalWindow[] = [];
  const today = getTodayDate();

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const governs = current.windowIntervalDays ?? habit.schedule.intervalDays ?? 7;
    const dueDate = addDays(current.date, governs);
    const next    = sorted[i + 1];

    if (next) {
      const gap = daysBetween(current.date, next.date);
      windows.push({
        startDate:      current.date,
        endDate:        dueDate,
        completionDate: next.date,
        status: gap <= governs ? 'completed' : 'missed',
        intervalDays:   governs,
      });
    } else {
      // Latest / open window
      windows.push({
        startDate:    current.date,
        endDate:      dueDate,
        completionDate: null,
        status: today <= dueDate ? 'active' : 'missed',
        intervalDays: governs,
      });
    }
  }

  return windows.reverse(); // newest first
}
```

Only windows whose `startDate` or `endDate` overlaps the selected period are shown.

---

## New Component: `CompletionLogList.svelte`  
**File:** `src/lib/components/CompletionLogList.svelte`

A simple chronological list of individual log entries in the period, newest first.

### Props

```ts
interface Props {
  logs: HabitLog[];
}
```

### Each row shows

- Date (formatted as "Thu Apr 3" or "Today" / "Yesterday")
- Completion type badge: `Full` (green) or `Partial` (amber)
- Relative timestamp from `completedAt`

Empty state: "No completions in this period"

---

## Acceptance Criteria

### Interval streak — non-retroactive
- [ ] Completing a habit stamps `windowIntervalDays` on the log
- [ ] Changing `x` mid-window sets `pendingIntervalDays`; active window unaffected
- [ ] Streak algorithm uses each older log's `windowIntervalDays` for its gap check
- [ ] Due date uses the latest log's `windowIntervalDays`
- [ ] "Apply now & restart interval" immediately updates the schedule
- [ ] Existing logs are backfilled with the habit's current interval at migration time
- [ ] Legacy logs without `windowIntervalDays` fall back to current interval (no crash)

### Habit completion history
- [ ] Detail page shows period selector with 7 Days / Month / 3 Months / Custom
- [ ] Chart data updates reactively when period changes
- [ ] Daily habits show 1 bar per day
- [ ] Weekly habits show 1 bar per week vs target
- [ ] Interval habits show 1 bar per window coloured by status
- [ ] `IntervalWindowList` is only shown for `every-x-days` habits
- [ ] Each window row shows the interval rule that governed it
- [ ] `CompletionLogList` shows individual completions sorted newest-first
- [ ] All computation is offline-capable (Dexie liveQuery only)

---

## Edge Cases

| Scenario | Handling |
|---|---|
| First completion ever (no prior log) | No window list; chart shows one active window bar |
| Habit has no completions in selected period | Chart renders empty state; log list shows "No completions" |
| `pendingIntervalDays` set, then habit deleted | Delete clears the habit row; no orphan |
| User sets pending then sets it again before completing | Latest pending wins; only one pending stored at a time |
| `windowIntervalDays` missing on log (legacy / non-interval) | Falls back to `habit.schedule.intervalDays`; no crash |
| Period selector "Month" on Jan 1 | startDate = Jan 1, endDate = Jan 1; shows today only |
| Very long history (500+ windows) | `IntervalWindowList` paginates or caps at 50 in the selected period |

---

## Files Changed

| File | Change |
|---|---|
| `src/lib/db/db.ts` | Add `windowIntervalDays` to `HabitLog`, `pendingIntervalDays` to `Habit`, Dexie v6 migration |
| `src/lib/db/habitLogs.ts` | Extend `logHabitCompletion`, add `resolveWindowInterval`, `clearPendingInterval`, update `calculateIntervalStreak` |
| `src/lib/stores/habits.ts` | Update `toggle` and `edit` for pending interval logic, add `applyIntervalNow` |
| `src/lib/stores/periodStats.ts` | Add `month` and `3months` presets to `PeriodPreset` and `getPresetRange` |
| `src/lib/components/PeriodSelector.svelte` | Accept configurable `presets` prop |
| `src/lib/components/HabitPeriodChart.svelte` | **New** — per-habit period bar chart |
| `src/lib/components/IntervalWindowList.svelte` | **New** — window-by-window history for interval habits |
| `src/lib/components/CompletionLogList.svelte` | **New** — chronological completion log |
| `src/routes/habits/[id]/+page.svelte` | Add Completion History section, liveQuery for period logs |
| `src/routes/habits/[id]/edit/+page.svelte` | Add pending interval info banner + Apply Now button |
| `supabase/migrations/…_interval_streak_v2.sql` | Add `window_interval_days` to `logs`, `pending_interval_days` to `habits` |

---

## Implementation Order

Phases must be done in order (each builds on the previous):

```
Phase 1 (data model)
  → Phase 2 (log creation writes windowIntervalDays)
    → Phase 3 (streak algorithm reads windowIntervalDays)
      → Phase 4 (store: pending interval on edit / consume on toggle)
        → Phase 5 (edit page UI: pending banner)
Phase 6 (PeriodSelector presets) — parallel with Phases 1–5
  → Phase 7 (habit detail history section)
```

Phases 1–5 (streak fix) and Phases 6–7 (history view) can be developed and
reviewed as two separate PRs if preferred.

---

## Test Cases to Add

### `src/lib/db/habitLogs.spec.ts`

- `calculateIntervalStreak` — gap judged by older log's `windowIntervalDays`, not current
- `calculateIntervalStreak` — changing `intervalDays` on habit does not affect completed windows
- `calculateIntervalStreak` — legacy log (no `windowIntervalDays`) falls back correctly
- `resolveWindowInterval` — returns `pendingIntervalDays` when set
- `resolveWindowInterval` — returns `schedule.intervalDays` when no pending
- `resolveWindowInterval` — returns `undefined` for daily/weekly habits

### `src/lib/stores/habits.spec.ts` (or new integration test)

- `habits.edit` — mid-window interval change sets `pendingIntervalDays`
- `habits.edit` — overdue-window interval change applies immediately
- `habits.toggle` — consuming completion applies pending interval and clears it
- `habits.applyIntervalNow` — updates schedule immediately regardless of window

### `src/lib/components/IntervalWindowList.svelte.spec.ts`

- `deriveWindows` — on-time window status
- `deriveWindows` — missed window status  
- `deriveWindows` — active window (today within due date)
- `deriveWindows` — mixed intervals (old 3d rule + new 5d rule applied at correct gap)
