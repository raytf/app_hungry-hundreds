# Fix: Interval Streak Retroactive Recalculation

## Purpose

Document the fix for `every-x-days` habits where editing `intervalDays` retroactively changes past streak windows and current due-state.

## Executive Summary

- Current interval streaks are recalculated entirely from the habit's latest `schedule.intervalDays`
- This makes past windows and current due dates shift unexpectedly after edits
- The fix stores the governing interval on each completion log and defers mid-window edits until the next completion by default
- Expected outcome: interval edits feel predictable and non-destructive
- Estimated implementation time: 1 PR

## Problem Analysis

### Issue 1: Historical windows are reinterpreted
**Root Cause:** `calculateIntervalStreak()` compares all gaps against the habit's current `schedule.intervalDays`.
**Current Behavior:** Changing `x` from 14 → 10 can immediately break or extend old streak links.
**Impact:** Users feel punished or confused when editing the habit.

### Issue 2: Active due date moves immediately
**Root Cause:** current due-state is also computed from the latest `schedule.intervalDays` instead of the rule active when the current window began.
**Current Behavior:** editing `x` mid-window can instantly change "Due in 3 days" to "Overdue".
**Impact:** Active windows feel unfair and unstable.

## Implementation Plan

### Phase 1: Record governing interval on logs (Priority: Critical)
**File:** `src/lib/db/db.ts`
**Changes:** add `windowIntervalDays?: number` to `HabitLog`; add Dexie migration backfill.

### Phase 2: Support deferred interval edits (Priority: Critical)
**File:** `src/lib/db/db.ts`, `src/lib/stores/habits.ts`
**Changes:** add `pendingIntervalDays?: number` to `Habit`; when editing mid-window, store pending instead of replacing active interval.

### Phase 3: Update streak and due calculations (Priority: Critical)
**File:** `src/lib/db/habitLogs.ts`
**Changes:** use the older completion's `windowIntervalDays` for each gap and the latest completion's `windowIntervalDays` for the active window.

### Phase 4: Add explicit apply-now UX (Priority: High)
**File:** `src/routes/habits/[id]/edit/+page.svelte`
**Changes:** banner for pending interval and explicit "Apply now and restart interval" action.

## Implementation Order

| Order | Phase | Files Changed | Risk Level | Time Est. |
|---|---|---|---|---|
| 1 | Record interval snapshots | `src/lib/db/db.ts` | Medium | 30m |
| 2 | Defer interval edits | `src/lib/stores/habits.ts` | Medium | 45m |
| 3 | Rework streak logic | `src/lib/db/habitLogs.ts` | High | 60m |
| 4 | Add edit-page UX | `src/routes/habits/[id]/edit/+page.svelte` | Low | 30m |
| 5 | Tests | `*.spec.ts` | Medium | 60m |

## Testing Strategy

### Unit Tests
- Gap checks use the older log's `windowIntervalDays`
- Latest log governs current due date
- Legacy logs without `windowIntervalDays` still work
- Mid-window edits set `pendingIntervalDays`
- Next completion consumes `pendingIntervalDays`

### Integration Tests
- Edit interval while window is active
- Edit interval while overdue
- Use "Apply now and restart interval"

### Manual Testing Checklist
- Create interval habit and build a streak
- Change interval while still within the window
- Confirm due date does not move until next completion
- Confirm next completion starts the new interval

## Edge Cases

### 1. Legacy logs without snapshots
**Scenario:** older data has no `windowIntervalDays`
**Handling:** fall back to current `schedule.intervalDays`

### 2. Multiple edits before next completion
**Scenario:** user changes 7 → 10 → 5 before completing
**Handling:** latest `pendingIntervalDays` wins

### 3. No completions yet
**Scenario:** interval habit is edited before first check-in
**Handling:** apply immediately because no active window exists

## Rollback Plan

### Immediate Rollback
Revert streak calculation to current `schedule.intervalDays` behavior.

### Partial Rollback by Feature
Keep `windowIntervalDays` and `pendingIntervalDays` fields but hide deferred-edit UX.

### Data Recovery
No destructive migration required; snapshot fields can remain unused safely.

## Performance Considerations
- Bundle size impact: negligible
- Memory impact: small extra fields on habits/logs
- Runtime impact: minimal; interval streak loop still linear in number of completion dates

## Acceptance Criteria
- [ ] Interval streaks are no longer retroactively recalculated from the latest `x`
- [ ] Current active window keeps its original due date after mid-window edits
- [ ] New interval takes effect on the next completion by default
- [ ] Explicit apply-now action is available for users who want immediate change
