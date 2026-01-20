# Fix: Multi-Device Sync Inconsistency

> **Status:** ✅ FIXED (2026-01-18)
> **Related:** See [sync-queue-integration-fix.md](./sync-queue-integration-fix.md) for additional fixes required
>
> **Update (2026-01-20):** The seeding behavior has been further simplified. All users now start with an empty habits list—no mock data is seeded for any users. Instead, users are presented with a `HabitSuggestions` component in the empty state to help them get started.

## Purpose

Fix the multi-device sync inconsistency issues in Hungry Hundreds where users logging in with the same account on different devices see different data. This implementation plan ensures data consistency across devices while maintaining the offline-first architecture.

## User Story

As a user with multiple devices, I want my habit data to sync automatically when I log in so that I see the same habits and completion status on all my devices.

---

## Executive Summary

The app currently fails to synchronize data consistently across multiple devices because sync only triggers on network connectivity changes, not on authentication events. This causes users logging in on different devices to see stale or incorrect data until they manually trigger a sync.

**Issues Being Fixed:**

- **Missing Initial Sync** - No sync occurs when app loads with authenticated session
- **Seed Data Conflicts** - Mock data seeds into IndexedDB before remote sync completes
- **Cross-User Data Contamination** - IndexedDB retains previous user's data after logout
- **No Auth-Triggered Sync** - Authentication state changes don't trigger sync

**Expected Outcome:** After implementing all phases, users will see consistent, up-to-date habit data across all devices immediately upon login. Data will sync automatically when authentication occurs, and switching users on the same device will show correct data.

**Estimated Total Implementation Time:** 2 hours 45 minutes

| Phase   | Description        | Time   |
| ------- | ------------------ | ------ |
| Phase 1 | Clear DB on Logout | 30 min |
| Phase 2 | Auth-Aware Sync    | 1 hour |
| Phase 3 | Fix Seed Data      | 45 min |
| Phase 4 | Debouncing         | 30 min |

---

## Problem Analysis

### Issue 1: Missing Initial Sync

**Root Cause:** The `syncStore.init()` method only sets up connection change listeners but does NOT perform an initial sync when the app loads with an authenticated user.

**Current Behavior:**

```typescript
// src/lib/sync/sync.ts - init() method
init(): void {
  if (!browser) return;
  this.updatePendingCount();

  // Only syncs when connection status CHANGES (offline → online)
  autoSyncUnsubscribe = connection.onConnectionChange(async (online) => {
    if (online) {
      await this.sync();  // ← Not called on first load!
    }
  });
}
```

**Impact:** Each device shows stale local data instead of pulling latest from server.

---

### Issue 2: Seed Data Conflicts

**Root Cause:** The habits store seeds mock data on first access, BEFORE checking authentication or syncing with the server.

**Current Behavior:**

```typescript
// src/lib/stores/habits.ts
const rawHabits = readable<Habit[]>([], (set) => {
  if (!browser) return () => {};

  // Seeds mock data immediately - no auth check!
  initializeDatabase().catch((err) => console.error('[habits] Init error:', err));

  const subscription = liveQuery(() => getAllHabits()).subscribe({...});
});
```

**Impact:** New device gets populated with mock habits before remote data arrives, causing duplicates or overwritten user data.

---

### Issue 3: Cross-User Data Contamination

**Root Cause:** IndexedDB data is not cleared when a user logs out. When a different user logs in on the same device, they see the previous user's cached data.

**Current Behavior:**

```typescript
// src/lib/stores/auth.ts - signOut()
signOut: async () => {
  const result = await signOut();
  // IndexedDB is NOT cleared here!
  return result;
}
```

**Impact:** User B sees User A's habits until sync completes (or worse, creates conflicts).

---

### Issue 4: No Auth-Triggered Sync

**Root Cause:** The sync system listens for network connectivity changes but NOT for authentication state changes.

**Current Behavior:**

- ✅ Syncs when: offline → online
- ❌ Does NOT sync when: logged out → logged in
- ❌ Does NOT sync when: app loads with existing session

**Impact:** User must manually click "Sync" button after login, or wait for a network change.

---

## Implementation Plan

### Phase 1: Add Database Clear on Logout (Priority: Critical)

Prevents cross-user data contamination.

**File:** `src/lib/db/db.ts`

**Add new function:**

```typescript
/**
 * Clear all user data from IndexedDB
 * Called on logout to prevent cross-user data contamination
 */
export async function clearAllUserData(): Promise<void> {
  await db.transaction('rw', [db.habits, db.logs, db.syncQueue], async () => {
    await db.habits.clear();
    await db.logs.clear();
    await db.syncQueue.clear();
  });
  console.log('[db] All user data cleared');
}
```

**File:** `src/lib/db/index.ts`

**Export the new function:**

```typescript
export { db, getTodayDate, now, clearAllUserData, type Habit, type HabitLog, type SyncQueue } from './db';
```

**File:** `src/lib/stores/auth.ts`

**Update signOut to clear database:**

```typescript
import { clearAllUserData } from '$lib/db';

signOut: async () => {
  update((state) => ({ ...state, loading: true }));

  // Clear local database BEFORE signing out
  if (browser) {
    await clearAllUserData();
  }

  const result = await signOut();

  if (!result.success) {
    update((state) => ({ ...state, loading: false }));
  }

  return result;
}
```

---

### Phase 2: Add Auth-Aware Sync Initialization (Priority: Critical)

Triggers sync when user logs in or app loads with authenticated session.

**File:** `src/lib/sync/sync.ts`

**Add new method to syncStore:**

```typescript
/**
 * Subscribe to auth changes and trigger sync when user logs in
 * Returns unsubscribe function
 */
subscribeToAuth(): () => void {
  if (!browser) return () => {};

  let previousUserId: string | null = null;

  const unsubscribe = userId.subscribe(async (currentUserId) => {
    if (currentUserId && currentUserId !== previousUserId) {
      // User just logged in or session restored
      console.log('[sync] Auth detected, triggering initial sync');

      // Small delay to ensure auth state is fully settled
      setTimeout(() => {
        this.sync();
      }, 100);
    }
    previousUserId = currentUserId;
  });

  return unsubscribe;
}
```

**Update init() method:**

```typescript
init(): void {
  if (!browser) return;

  this.updatePendingCount();

  // Listen for connection changes
  autoSyncUnsubscribe = connection.onConnectionChange(async (online) => {
    if (online) {
      update((s) => ({ ...s, status: 'idle' }));
      await this.sync();
    } else {
      update((s) => ({ ...s, status: 'offline' }));
    }
  });

  // NEW: Subscribe to auth state changes
  authSyncUnsubscribe = this.subscribeToAuth();

  // Set initial status based on connection
  if (!connection.isOnline()) {
    update((s) => ({ ...s, status: 'offline' }));
  }
}
```

**Update destroy() method:**

```typescript
let authSyncUnsubscribe: (() => void) | null = null;

destroy(): void {
  if (autoSyncUnsubscribe) {
    autoSyncUnsubscribe();
    autoSyncUnsubscribe = null;
  }
  if (authSyncUnsubscribe) {
    authSyncUnsubscribe();
    authSyncUnsubscribe = null;
  }
}
```

---

### Phase 3: Fix Seed Data Behavior (Priority: High)

Only seed mock data for unauthenticated users.

**File:** `src/lib/stores/habits.ts`

**Update initializeDatabase to be auth-aware:**

```typescript
import { get } from 'svelte/store';
import { isAuthenticated } from '$lib/stores/auth';

async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;

  // Check if user is authenticated
  const authenticated = get(isAuthenticated);

  if (authenticated) {
    // Authenticated users should NOT get seeded with mock data
    // Their data comes from sync
    console.log('[habits] Authenticated user - skipping seed, waiting for sync');
    isInitialized = true;
    return;
  }

  // Only seed for unauthenticated/demo users
  const seedData: CreateHabitInput[] = mockHabits.map((h) => ({
    name: h.name,
    emoji: h.emoji,
    color: h.color,
    reminderTime: h.reminderTime ?? undefined
  }));

  const result = await seedHabitsIfEmpty(seedData);
  if (result.seeded) {
    console.log(`[habits] Seeded database with ${result.count} habits (unauthenticated user)`);
  }
  isInitialized = true;
}
```

---

### Phase 4: Add Sync Debouncing (Priority: Medium)

Prevent excessive sync calls during rapid auth state changes.

**File:** `src/lib/sync/sync.ts`

**Add debounce logic:**

```typescript
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 500;

/**
 * Debounced sync - prevents multiple rapid sync calls
 */
async syncDebounced(): Promise<void> {
  if (syncDebounceTimer) {
    clearTimeout(syncDebounceTimer);
  }

  syncDebounceTimer = setTimeout(async () => {
    syncDebounceTimer = null;
    await this.sync();
  }, SYNC_DEBOUNCE_MS);
}
```

---

## Implementation Order

| Order | Phase                       | Files Changed            | Risk Level | Time Est. |
| ----- | --------------------------- | ------------------------ | ---------- | --------- |
| 1     | Phase 1: Clear DB on Logout | db.ts, index.ts, auth.ts | Low        | 30 min    |
| 2     | Phase 2: Auth-Aware Sync    | sync.ts                  | Medium     | 1 hour    |
| 3     | Phase 3: Fix Seed Data      | habits.ts                | Medium     | 45 min    |
| 4     | Phase 4: Debouncing         | sync.ts                  | Low        | 30 min    |

**Recommended Order Rationale:**

1. **Phase 1 first** - Prevents data contamination immediately, low risk
2. **Phase 2 second** - Core fix for the sync timing issue
3. **Phase 3 third** - Prevents conflicts, depends on sync working
4. **Phase 4 last** - Optimization, not critical for correctness

---

## Testing Strategy

### Unit Tests

**File:** `src/lib/db/db.spec.ts` (new file)

```typescript
describe('clearAllUserData', () => {
  it('should clear all tables', async () => {
    await createHabit({ name: 'Test', emoji: '🧪', color: '#000' });
    await logHabitCompletion(1, getTodayDate());

    await clearAllUserData();

    expect(await db.habits.count()).toBe(0);
    expect(await db.logs.count()).toBe(0);
    expect(await db.syncQueue.count()).toBe(0);
  });
});
```

### Integration Tests

**Multi-Device Simulation Test:**

1. Device A: Login → Create habit "Morning Run"
2. Device A: Sync completes → Verify in Supabase
3. Device B: Login (same account)
4. Device B: Verify "Morning Run" appears after sync
5. Device B: Create habit "Evening Walk"
6. Device A: Trigger sync → Verify "Evening Walk" appears

**User Switch Test:**

1. Device A: User 1 login → Create habits
2. Device A: Logout → Verify IndexedDB is empty
3. Device A: User 2 login → Verify User 2 sees own data (not User 1's)

### Manual Testing Checklist

- [ ] Login on Device A → Create habit → Logout
- [ ] Login on Device B (same account) → Habit appears
- [ ] Offline on Device B → Create habit → Go online → Habit syncs
- [ ] Login on Device A → New habit from Device B appears
- [ ] Logout on Device A → Login as different user → No old data visible
- [ ] Fresh browser (no cache) → Login → Data loads from server
- [ ] Rapid login/logout → No duplicate syncs or errors

---

## Edge Cases

### 1. Network Failure During Initial Sync

**Scenario:** User logs in, initial sync starts, network drops mid-sync.

**Handling:**

```typescript
async sync(): Promise<boolean> {
  try {
    await this.processQueue(currentUserId);
    await this.pullRemoteChanges(currentUserId);
    // ...
  } catch (error) {
    update((s) => ({ ...s, status: 'error', error: message }));

    // Schedule retry after delay
    setTimeout(() => {
      if (connection.isOnline()) {
        this.sync();
      }
    }, 5000);

    return false;
  }
}
```

### 2. Rapid Login/Logout

**Scenario:** User logs in/out quickly multiple times.

**Handling:** The debounce mechanism (Phase 4) prevents this. Additionally:

```typescript
subscribeToAuth(): () => void {
  let previousUserId: string | null = null;

  const unsubscribe = userId.subscribe(async (currentUserId) => {
    // Only act on actual user ID changes
    if (currentUserId === previousUserId) return;

    if (currentUserId) {
      // Debounced sync on login
      this.syncDebounced();
    }
    // On logout (null), clearAllUserData is called by auth store

    previousUserId = currentUserId;
  });

  return unsubscribe;
}
```

### 3. Session Expiry Mid-Use

**Scenario:** User's session expires while using the app.

**Handling:** Supabase's `onAuthStateChange` fires with `SIGNED_OUT` event:

```typescript
// In auth.ts
onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    // Clear local data
    clearAllUserData();
  }
});
```

### 4. Conflicting Data From Multiple Devices

**Scenario:** User edits same habit on two devices while offline.

**Handling:** Existing `last-write-wins` conflict resolution in `src/lib/sync/conflicts.ts`:

```typescript
export function resolveHabitConflict(local: Habit, remote: RemoteHabit): ConflictResult {
  const localTime = local.updatedAt;
  const remoteTime = new Date(remote.updated_at).getTime();

  if (remoteTime > localTime) {
    return { resolution: 'remote', data: remote };
  }
  return { resolution: 'local', data: local };
}
```

### 5. First-Time User (No Server Data)

**Scenario:** Brand new user signs up, has no data in Supabase.

**Handling:**

```typescript
async function initializeDatabase(): Promise<void> {
  const authenticated = get(isAuthenticated);

  if (authenticated) {
    // Don't seed - wait for sync
    // If sync returns empty, user sees empty habits list (correct!)
    return;
  }

  // Only unauthenticated users get demo data
  await seedHabitsIfEmpty(mockHabits);
}
```

---

## Rollback Plan

### If Issues Arise After Deployment

**Immediate Rollback:**

1. Revert commit(s) via `git revert`
2. Deploy previous version

**Partial Rollback by Feature:**

| Feature            | Rollback Method                                   |
| ------------------ | ------------------------------------------------- |
| DB Clear on Logout | Remove `clearAllUserData()` call from `signOut()` |
| Auth-Aware Sync    | Remove `subscribeToAuth()` from `init()`          |
| Seed Data Fix      | Revert `initializeDatabase()` changes             |
| Debouncing         | Remove debounce logic (harmless to leave)         |

**Data Recovery:**

- User data is preserved in Supabase (server-authoritative)
- Rolling back does NOT delete server data
- Users can manually sync to restore data

---

## Performance Considerations

### Avoiding Excessive Sync Calls

1. **Debouncing** - 500ms delay before sync (Phase 4)
2. **Guard Flag** - `syncInProgress` prevents concurrent syncs
3. **Auth Tracking** - Only sync on actual user ID changes

### Memory and Bundle Impact

| Change               | Bundle Impact | Memory Impact   |
| -------------------- | ------------- | --------------- |
| `clearAllUserData()` | +50 bytes     | None            |
| `subscribeToAuth()`  | +200 bytes    | +1 subscription |
| `syncDebounced()`    | +100 bytes    | +1 timer ref    |
| Seed data check      | +100 bytes    | None            |

**Total:** ~450 bytes additional bundle size (negligible)

### Sync Performance

- **Full sync** fetches all habits and logs (acceptable for <1000 items)
- **Future optimization:** Add `updated_since` parameter to API for incremental sync

---

## Acceptance Criteria

- [ ] User logs in on Device A → Creates habit → Appears on Device B after login
- [ ] User logs out → All local data cleared → Login as different user shows correct data
- [ ] App loads with existing session → Automatic sync pulls latest data
- [ ] Offline changes → Go online → Sync happens automatically
- [ ] No mock data appears for authenticated users
- [ ] Network failure during sync → Retry scheduled → Eventually succeeds
- [ ] Rapid login/logout → No duplicate syncs or errors
- [ ] All existing tests pass
- [ ] No performance regression (sync < 2s on 3G)

---

## Related Documentation

- [offline-sync.md](./offline-sync.md) - Core sync architecture
- [API.md](../API.md) - Data models and sync strategy
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System design
