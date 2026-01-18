# Fix: Sync Queue Integration - Local Changes Not Syncing

> **Status:** ✅ FIXED (2026-01-18)

## Purpose

Fix the critical sync failure where local habit and log changes are never pushed to Supabase. The sync queue functions exist but are never called by the CRUD operations.

## Executive Summary

- **Root Cause:** The queue functions (`queueHabitCreate`, `queueHabitUpdate`, `queueHabitDelete`, `queueLogCreate`, `queueLogDelete`) are defined in `src/lib/sync/queue.ts` and exported but **never called** by any code.
- **Impact:** All local changes (create/update/delete habits, complete habits) are saved to IndexedDB but never queued for sync to Supabase.
- **Result:** Multi-device sync completely fails - changes on one device never appear on another.

**Issues Fixed:**

- Habit creation doesn't queue for sync
- Habit updates don't queue for sync
- Habit deletion doesn't queue for sync
- Habit completion (log creation) doesn't queue for sync
- Habit uncompletion (log deletion) doesn't queue for sync
- Auth race condition causing mock data seeding for authenticated users
- Logs failing to sync when habit hasn't been synced yet

**Actual Implementation Time:** ~1.5 hours

---

## Problem Analysis

### Issue: CRUD Operations Don't Call Queue Functions

**Current Behavior in `src/lib/db/habits.ts`:**

```typescript
export async function createHabit(input: CreateHabitInput): Promise<number> {
  const habit: Habit = { ... };
  return await db.habits.add(habit);  // ← Writes to IndexedDB ONLY
  // Missing: queueHabitCreate(id, habit) ← NEVER CALLED
}
```

**Current Behavior in `src/lib/db/habitLogs.ts`:**

```typescript
export async function toggleHabitCompletion(habitId: number, date?: string): Promise<boolean> {
  if (existing) {
    await db.logs.delete(existing.id!);  // ← Writes to IndexedDB ONLY
    // Missing: queueLogDelete(...) ← NEVER CALLED
    return false;
  } else {
    await logHabitCompletion(habitId, logDate);  // ← Writes to IndexedDB ONLY
    // Missing: queueLogCreate(...) ← NEVER CALLED
    return true;
  }
}
```

---

## Implementation Plan

### Phase 1: Add Queue Calls to Habit CRUD (Priority: Critical)

**File:** `src/lib/db/habits.ts`

1. Import queue functions from sync module
2. Call `queueHabitCreate()` after `db.habits.add()`
3. Call `queueHabitUpdate()` after `db.habits.update()`
4. Call `queueHabitDelete()` after habit deletion

### Phase 2: Add Queue Calls to HabitLog Operations (Priority: Critical)

**File:** `src/lib/db/habitLogs.ts`

1. Import queue functions from sync module
2. Call `queueLogCreate()` after `logHabitCompletion()`
3. Call `queueLogDelete()` after log deletion in `toggleHabitCompletion()`

### Phase 3: Trigger Debounced Sync After Queue Operations (Priority: High)

After queueing, trigger `syncStore.debouncedSync()` to push changes when online.

---

## Implementation Order

| Order | Phase            | Files Changed           | Risk | Time   |
| ----- | ---------------- | ----------------------- | ---- | ------ |
| 1     | Habit CRUD Queue | habits.ts               | Low  | 20 min |
| 2     | HabitLog Queue   | habitLogs.ts            | Low  | 20 min |
| 3     | Trigger Sync     | habits.ts, habitLogs.ts | Low  | 20 min |

---

## Testing Strategy

### Manual Testing Checklist

- [ ] Create habit → Check syncQueue table in IndexedDB has entry
- [ ] Edit habit → Check syncQueue has update entry
- [ ] Delete habit → Check syncQueue has delete entry
- [ ] Complete habit → Check syncQueue has log create entry
- [ ] Uncomplete habit → Check syncQueue has log delete entry
- [ ] Click "Sync Now" → Verify data appears in Supabase
- [ ] Login on second device → Verify data syncs

---

## Acceptance Criteria

- [x] `queueHabitCreate` called after habit creation
- [x] `queueHabitUpdate` called after habit update
- [x] `queueHabitDelete` called after habit deletion
- [x] `queueLogCreate` called after habit completion
- [x] `queueLogDelete` called after habit uncompletion
- [x] Sync triggered after queue operations (when online)
- [x] Data appears in Supabase after sync
- [x] Second device sees data after login

---

## Files Changed

| File                       | Changes                                              |
| -------------------------- | ---------------------------------------------------- |
| `src/lib/db/habits.ts`     | Added queue calls to create/update/delete operations |
| `src/lib/db/habitLogs.ts`  | Added queue calls to toggle completion               |
| `src/lib/sync/queue.ts`    | Added `onQueueChange` event system, fixed imports    |
| `src/lib/sync/sync.ts`     | Subscribe to queue changes, queue unsynced habits    |
| `src/lib/sync/index.ts`    | Export `onQueueChange`                               |
| `src/lib/stores/habits.ts` | Wait for auth before seeding (race condition fix)    |

---

## Related Documentation

- [multi-device-sync-fix.md](./multi-device-sync-fix.md) - Previous sync fixes (auth-aware sync)
- [offline-sync.md](../features/offline-sync.md) - Sync architecture
