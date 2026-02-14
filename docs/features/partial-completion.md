# Feature: Partial Completion

## Purpose

Users sometimes have busy days where completing their full habit routine isn't possible. Rather than breaking their streak entirely, partial completions allow users to acknowledge their effort with a reduced version of the habit. This maintains momentum and prevents the "all-or-nothing" mentality that often leads to habit abandonment.

## User Story

As a user, I want to mark a habit as "partially completed" on busy days so that I can maintain my streak momentum without the pressure of a full completion, while still acknowledging my effort.

---

## Implementation Approach

### Technical Design

#### Data Model Changes

**HabitLog (`src/lib/db/db.ts`):**
```typescript
export type CompletionType = 'full' | 'partial';

export interface HabitLog {
  id?: number;
  serverId?: string;
  habitId: number;
  date: string;              // YYYY-MM-DD format
  completedAt: number;       // Unix timestamp
  completionType: CompletionType; // NEW: 'full' or 'partial'
  synced: boolean;
}
```

**Habit (optional enhancement):**
```typescript
export interface Habit {
  // ... existing fields ...
  partialCriteria?: string;  // User-defined partial completion description
}
```

#### Streak Calculation Logic

```
Streak Rules:
1. Consecutive days with ANY completion (full OR partial) maintain the streak
2. Only FULL completions increment the streak counter
3. Partial completions prevent streak breaks but do NOT add to the count

Example:
Day 1: Full    → Streak = 1
Day 2: Partial → Streak = 1 (preserved, not incremented)
Day 3: Full    → Streak = 2
Day 4: None    → Streak = 0 (broken)
```

### Components Changed

| File | Change |
|------|--------|
| `src/lib/db/db.ts` | Add `CompletionType`, `completionType` to HabitLog, bump version |
| `src/lib/db/habitLogs.ts` | Update toggle/log functions, modify streak calculation |
| `src/lib/db/index.ts` | Export new types |
| `src/lib/sync/queue.ts` | Add `completionType` to QueuedLogPayload |
| `src/lib/supabase/types.ts` | Add `completion_type` to habit_logs |
| `src/lib/stores/habits.ts` | Track `hasPartialToday` in HabitWithStatus |
| `src/lib/components/HabitCard.svelte` | Add partial completion UI |
| `supabase/migrations/` | Add migration for completion_type column |

### UI/UX Design

#### HabitCard Partial Completion UI

**Option 1: Long-press action**
- Long-press (500ms) on the completion button shows partial completion option
- Accessible alternative: secondary button revealed on tap

**Option 2: Swipe action**
- Swipe left on habit card to reveal partial completion button

**Option 3: Context menu (Recommended)**
- Tap on completion button = full completion
- Secondary smaller button for partial completion (half-filled circle icon)

#### Visual Distinction

| State | Visual |
|-------|--------|
| Not completed | Emoji in light color background |
| Full completion | ✓ checkmark, full color background |
| Partial completion | ½ symbol or "P" badge, striped/dashed background |

### Integration Points

1. **Sync Queue**: Include `completionType` in log payloads
2. **Conflict Resolution**: `completionType` synced with last-write-wins
3. **Flexible Streaks**: Works with both daily and weekly frequency types
4. **Statistics**: Track partial vs full completion rates separately

---

## Acceptance Criteria

- [ ] User can mark a habit as partially completed for today
- [ ] Partial completions prevent streak breaks
- [ ] Partial completions do NOT increment the streak counter
- [ ] Visual distinction between full and partial completions in UI
- [ ] Partial completion data syncs correctly to Supabase
- [ ] Works offline with proper sync queue integration
- [ ] Compatible with both daily and weekly frequency types
- [ ] Statistics page shows partial completion metrics (future enhancement)

---

## Performance Considerations

- **Bundle size**: Minimal impact (~200 bytes additional code)
- **Streak calculation**: O(n) unchanged, just checks completion type
- **Database migration**: Non-breaking, adds nullable column with default

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| Full then partial same day | Keep full completion (higher priority) |
| Partial then full same day | Upgrade to full completion |
| Multiple partials same day | Allow for multi-completion daily habits |
| Partial on weekly habit | Counts toward weekly target |
| Toggle off partial | Removes partial completion |

---

## Migration Strategy

1. Add `completion_type` column to Supabase (default: 'full')
2. Bump Dexie schema version with upgrade handler
3. Existing logs default to `completionType: 'full'`
4. UI changes are additive (no breaking changes)

---

## Related Files

- `docs/features/flexible-streaks.md` - Frequency-based streak system
- `docs/API.md` - Data model documentation
- `src/lib/db/habitLogs.ts` - Streak calculation logic

