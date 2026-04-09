# Feature: Journey Period Filter

## Purpose
Allow users to view historical habit completion data across preset or custom time windows on the /journey page, rather than being locked to the current week only.

## User Story
As a user, I want to select a time period (Yesterday, 7 Days, 30 Days, or a custom range) and see my habit completion chart and stats for that window, so I can review my progress over time.

## Implementation Approach

### Technical Design

**New store – `src/lib/stores/periodStats.ts`**
- `selectedPeriod`: `writable<PeriodRange>` – holds the active preset + `start`/`end` YYYY-MM-DD strings. Defaults to `7days`.
- `periodLogs`: `derived` store that subscribes to a Dexie `liveQuery` filtered to `[start, end]`. Re-subscribes automatically when `selectedPeriod` changes.
- `periodStats`: `derived` from `[periodLogs, habits, selectedPeriod]`. Computes `chartData`, `completionRate`, `totalCompleted`, `totalPossible`, `daysInRange`.
- Chart data strategy: ≤31 days → one bar per day; >31 days → one bar per week.

**New component – `src/lib/components/PeriodSelector.svelte`**
- Segment control: Yesterday | 7 Days | 30 Days | Custom.
- When Custom is selected, two `<input type="date">` fields appear; changes are applied immediately on blur/change.
- Emits changes via `onchange` prop.

**New component – `src/lib/components/PeriodChart.svelte`**
- Replaces `WeeklyChart` on the journey page.
- Accepts `data: PeriodDataPoint[]` and `title: string`.
- For dense charts (>14 bars), shows tick labels every Nth bar to avoid overflow.

**Modified – `src/routes/journey/+page.svelte`**
- Removes `WeeklyChart` import and `stats` store import.
- Adds `PeriodSelector` + `PeriodChart`.
- Completion Rate stat card reads from `$periodStats.completionRate`.
- Advanced stats section keeps its own fixed-window computation (unchanged); a note explains this.

### Integration Points
- Reads only from local Dexie (`db.logs`) via `liveQuery` – fully offline.
- Does not affect `advancedStats` store or sync logic.

## Acceptance Criteria
- [ ] Segment control renders with 4 options; active option is visually distinct.
- [ ] Selecting a preset immediately updates the chart with correct bars.
- [ ] Custom range: both date pickers appear; chart updates after selection.
- [ ] Completion Rate stat card reflects the selected period.
- [ ] Advanced Stats section remains unchanged (fixed 28–60 day windows).
- [ ] Works with zero habits / zero logs (empty state shown).
- [ ] No TypeScript errors (`pnpm check` passes).
