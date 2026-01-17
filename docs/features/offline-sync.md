# Feature: Offline-First Sync

## Purpose

The offline-first sync system ensures that Hungry Hundreds works seamlessly regardless of network connectivity. Users can create, update, and delete habits while offline, with all changes automatically synchronizing to Supabase when connectivity is restored.

## User Story

As a habit tracker user, I want my habits and completions to work offline so that I can track my progress anywhere without worrying about internet connectivity.

---

## 1. Technical Architecture Overview

### System Components

The sync system consists of four main modules:

| Module | File | Purpose |
|--------|------|---------|
| Queue | `src/lib/sync/queue.ts` | Manages pending operations |
| Detector | `src/lib/sync/detector.ts` | Monitors network connectivity |
| Sync Engine | `src/lib/sync/sync.ts` | Orchestrates push/pull operations |
| Conflicts | `src/lib/sync/conflicts.ts` | Resolves data conflicts |

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER ACTION                                     │
│                    (Create/Update/Delete Habit or Log)                       │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOCAL STORAGE (Dexie.js)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │   habits    │  │    logs     │  │  syncQueue  │                         │
│  │   table     │  │   table     │  │   table     │                         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                         │
│         │                │                │                                 │
│         └────────────────┴────────────────┘                                 │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CONNECTION DETECTOR                                   │
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   Online?    │────▶│  Trigger     │────▶│   Process    │                │
│  │   Check      │     │  Sync        │     │   Queue      │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SYNC ENGINE                                        │
│                                                                              │
│  ┌─────────────────┐              ┌─────────────────┐                       │
│  │   PUSH LOCAL    │              │   PULL REMOTE   │                       │
│  │   ─────────     │              │   ───────────   │                       │
│  │  • Process      │              │  • Fetch from   │                       │
│  │    queue ops    │              │    Supabase     │                       │
│  │  • Send to      │              │  • Merge with   │                       │
│  │    Supabase     │              │    local data   │                       │
│  │  • Update       │              │  • Resolve      │                       │
│  │    serverIds    │              │    conflicts    │                       │
│  └────────┬────────┘              └────────┬────────┘                       │
│           │                                │                                 │
│           └────────────┬───────────────────┘                                 │
└────────────────────────┼────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SUPABASE (PostgreSQL)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐                     │
│  │   habits    │  │ habit_logs  │  │ Row Level       │                     │
│  │   table     │  │   table     │  │ Security (RLS)  │                     │
│  └─────────────┘  └─────────────┘  └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Step-by-Step Process

#### Step 1: User Performs Action

When a user creates a habit, the operation is saved locally first:

```typescript
// src/lib/db/habits.ts
export async function createHabit(input: CreateHabitInput): Promise<number> {
    const timestamp = now();
    const habit: Habit = {
        name: input.name,
        emoji: input.emoji,
        color: input.color,
        reminderTime: input.reminderTime,
        createdAt: timestamp,
        updatedAt: timestamp  // Key for conflict resolution
    };
    return await db.habits.add(habit);  // Immediate IndexedDB write
}
```

#### Step 2: Queue Operation for Sync

After local storage, the change is queued:

```typescript
// src/lib/sync/queue.ts
export async function queueHabitCreate(localId: number, data: Partial<Habit>): Promise<number> {
    return await queueOperation('create', 'habits', {
        localId,
        data
    });
}
```

The queue entry structure:

```typescript
interface SyncQueue {
    id?: number;           // Auto-incremented ID
    action: 'create' | 'update' | 'delete';
    table: 'habits' | 'logs';
    payload: unknown;      // Operation-specific data
    timestamp: number;     // When operation occurred
    retries: number;       // Failed sync attempts
}
```

#### Step 3: Connection Detection

The detector monitors browser connectivity:

```typescript
// src/lib/sync/detector.ts
if (browser) {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}
```

#### Step 4: Sync Engine Processes Queue

When online, the sync engine:

1. **Pushes local changes** - Processes each queued operation
2. **Pulls remote changes** - Fetches latest from Supabase
3. **Resolves conflicts** - Uses last-write-wins strategy

```typescript
// src/lib/sync/sync.ts
async sync(): Promise<boolean> {
    // Process queue (push local changes)
    await this.processQueue(currentUserId);
    
    // Pull remote changes
    await this.pullRemoteChanges(currentUserId);
    
    update((s) => ({
        ...s,
        status: 'idle',
        lastSync: Date.now(),
        error: null
    }));
    return true;
}
```

---

## 2. State Management & Reactive Stores

### Store Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         REACTIVE STORES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │  connection     │     │   syncStore     │                        │
│  │  ───────────    │     │   ─────────     │                        │
│  │  • online       │     │  • status       │                        │
│  │  • lastOnline   │     │  • lastSync     │                        │
│  │  • lastOffline  │     │  • pendingCount │                        │
│  │                 │     │  • error        │                        │
│  └────────┬────────┘     └────────┬────────┘                        │
│           │                       │                                  │
│           ▼                       ▼                                  │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                    DERIVED STORES                            │    │
│  │  ┌──────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │    │
│  │  │ isOnline │ │ isSyncing  │ │ hasPending │ │ statusText │  │    │
│  │  └──────────┘ └────────────┘ └────────────┘ └────────────┘  │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                              │                                       │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    UI COMPONENTS     │
                    │    (Sync Status)     │
                    └──────────────────────┘
```

### Connection Store

The `connection` store tracks network connectivity:

```typescript
// src/lib/sync/detector.ts
export interface ConnectionState {
    online: boolean;         // Current connectivity status
    lastOnline: number | null;   // Timestamp of last online
    lastOffline: number | null;  // Timestamp of last offline
}

function createConnectionStore() {
    const { subscribe, set, update } = writable<ConnectionState>({
        online: browser ? navigator.onLine : true,
        lastOnline: null,
        lastOffline: null
    });

    return {
        subscribe,
        isOnline(): boolean { /* ... */ },
        onConnectionChange(handler): () => void { /* ... */ },
        async checkConnection(): Promise<boolean> { /* ... */ }
    };
}

export const connection = createConnectionStore();
```

### Sync Store

The `syncStore` manages synchronization state:

```typescript
// src/lib/sync/sync.ts
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
    status: SyncStatus;      // Current sync status
    lastSync: number | null; // Last successful sync timestamp
    pendingCount: number;    // Queued operations count
    error: string | null;    // Error message if any
}

function createSyncStore() {
    const { subscribe, set, update } = writable<SyncState>({
        status: 'idle',
        lastSync: null,
        pendingCount: 0,
        error: null
    });

    return {
        subscribe,
        init(): void { /* Set up auto-sync listeners */ },
        destroy(): void { /* Clean up listeners */ },
        async updatePendingCount(): Promise<void> { /* ... */ },
        async sync(): Promise<boolean> { /* Main sync operation */ },
        // ... internal methods
    };
}

export const syncStore = createSyncStore();
```

### Derived Stores for UI

These provide convenient values for UI components:

```typescript
// src/lib/sync/sync.ts

// Boolean: is currently syncing?
export const isSyncing = derived(syncStore, ($sync) =>
    $sync.status === 'syncing'
);

// Boolean: are there pending changes?
export const hasPendingChanges = derived(syncStore, ($sync) =>
    $sync.pendingCount > 0
);

// String: human-readable status
export const syncStatusText = derived(syncStore, ($sync) => {
    switch ($sync.status) {
        case 'idle':
            return $sync.pendingCount > 0
                ? `${$sync.pendingCount} pending`
                : 'Synced';
        case 'syncing':
            return 'Syncing...';
        case 'error':
            return $sync.error || 'Sync error';
        case 'offline':
            return 'Offline';
    }
});
```

### Using Stores in Svelte Components

```svelte
<script>
    import { isOnline, syncStore, syncStatusText, isSyncing } from '$lib/sync';
</script>

<!-- Status indicator -->
<div class="sync-status" class:offline={!$isOnline}>
    {#if $isSyncing}
        <span class="animate-spin">⟳</span>
    {:else if !$isOnline}
        <span>📴</span>
    {:else}
        <span>✓</span>
    {/if}
    <span>{$syncStatusText}</span>
</div>

<!-- Last sync time -->
{#if $syncStore.lastSync}
    <small>Last synced: {new Date($syncStore.lastSync).toLocaleTimeString()}</small>
{/if}
```

---

## 3. Conflict Resolution Strategy

### Last-Write-Wins Algorithm

The sync system uses timestamp comparison to resolve conflicts:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CONFLICT RESOLUTION FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  LOCAL RECORD                      REMOTE RECORD                     │
│  ┌─────────────────┐              ┌─────────────────┐               │
│  │ id: 1           │              │ id: "uuid-123"  │               │
│  │ name: "Running" │              │ name: "Jogging" │               │
│  │ updatedAt:      │              │ updated_at:     │               │
│  │   1705500000000 │              │   "2026-01-17   │               │
│  │                 │              │    T12:00:00Z"  │               │
│  └────────┬────────┘              └────────┬────────┘               │
│           │                                │                         │
│           └────────────┬───────────────────┘                         │
│                        │                                             │
│                        ▼                                             │
│           ┌────────────────────────┐                                 │
│           │  COMPARE TIMESTAMPS    │                                 │
│           │                        │                                 │
│           │  local: 1705500000000  │                                 │
│           │  remote: 1705579200000 │                                 │
│           └────────────┬───────────┘                                 │
│                        │                                             │
│              ┌─────────┴─────────┐                                   │
│              ▼                   ▼                                   │
│     ┌─────────────────┐ ┌─────────────────┐                         │
│     │ LOCAL WINS      │ │ REMOTE WINS     │                         │
│     │ Push to remote  │ │ Update local    │                         │
│     └─────────────────┘ └─────────────────┘                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Implementation

```typescript
// src/lib/sync/conflicts.ts
export function resolveHabitConflict(
    local: Habit,
    remote: HabitRow
): ConflictResult<Partial<Habit>> {
    const localUpdatedAt = local.updatedAt;
    const remoteUpdatedAt = new Date(remote.updated_at).getTime();

    // Last-write-wins: use whichever was updated more recently
    if (localUpdatedAt > remoteUpdatedAt) {
        return {
            resolution: 'local',
            data: {
                name: local.name,
                emoji: local.emoji,
                color: local.color,
                reminderTime: local.reminderTime,
                updatedAt: localUpdatedAt
            },
            localUpdatedAt,
            remoteUpdatedAt
        };
    } else {
        return {
            resolution: 'remote',
            data: {
                name: remote.name,
                emoji: remote.emoji,
                color: remote.color,
                reminderTime: remote.reminder_time ?? undefined,
                updatedAt: remoteUpdatedAt,
                serverId: remote.id
            },
            localUpdatedAt,
            remoteUpdatedAt
        };
    }
}
```

### Edge Cases

#### Case 1: Deletion Detection

When a habit exists locally but not remotely, it was deleted on another device:

```typescript
// src/lib/sync/sync.ts
const remoteHabitIds = new Set((remoteHabits || []).map((h) => h.id));
for (const local of localHabits) {
    if (local.serverId && !remoteHabitIds.has(local.serverId) && local.id) {
        // Habit was deleted remotely - remove locally
        await handleRemoteHabitDeletion(local.id);
    }
}
```

#### Case 2: New Remote Records

Records that exist on the server but not locally are created:

```typescript
// src/lib/sync/sync.ts
for (const remote of remoteHabits || []) {
    const local = serverIdToLocal.get(remote.id);

    if (!local) {
        // New remote habit - create locally
        await createLocalHabitFromRemote(remote);
    }
}
```

#### Case 3: Habit Logs

For logs, existence is the source of truth (idempotent):

```typescript
// src/lib/sync/conflicts.ts
export function resolveLogConflict(
    local: HabitLog | undefined,
    remote: HabitLogRow | undefined
): ConflictResolution {
    if (local && remote) return 'merge';      // Both exist - in sync
    if (remote && !local) return 'remote';    // Pull from remote
    return 'local';                            // Push to remote
}
```

---

## 4. Error Handling & Retry Logic

### Retry Mechanism

Failed operations stay in the queue with incremented retry count:

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ERROR HANDLING FLOW                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐                                                     │
│  │  Process    │                                                     │
│  │  Operation  │                                                     │
│  └──────┬──────┘                                                     │
│         │                                                            │
│         ▼                                                            │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │    SUCCESS?     │────▶│ Remove from     │                        │
│  │                 │ YES │ Queue           │                        │
│  └────────┬────────┘     └─────────────────┘                        │
│           │ NO                                                       │
│           ▼                                                          │
│  ┌─────────────────┐                                                 │
│  │ Increment       │                                                 │
│  │ retries++       │                                                 │
│  └────────┬────────┘                                                 │
│           │                                                          │
│           ▼                                                          │
│  ┌─────────────────┐     ┌─────────────────┐                        │
│  │ retries >= 5?   │────▶│ Remove (give    │                        │
│  │                 │ YES │ up on this op)  │                        │
│  └────────┬────────┘     └─────────────────┘                        │
│           │ NO                                                       │
│           ▼                                                          │
│  ┌─────────────────┐                                                 │
│  │ Keep in queue   │                                                 │
│  │ for next sync   │                                                 │
│  └─────────────────┘                                                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Queue Processing with Error Handling

```typescript
// src/lib/sync/sync.ts
async processQueue(currentUserId: string): Promise<void> {
    const operations = await getPendingOperations();

    for (const op of operations) {
        try {
            await this.processOperation(op, currentUserId);
            if (op.id) await removeFromQueue(op.id);  // Success
        } catch (error) {
            console.error('[sync] Operation failed:', op, error);
            if (op.id) await incrementRetry(op.id);   // Failure
        }
    }
}
```

### Retry Counter

```typescript
// src/lib/sync/queue.ts
export async function incrementRetry(id: number): Promise<void> {
    await db.syncQueue.update(id, {
        retries: (await db.syncQueue.get(id))?.retries ?? 0 + 1
    });
}
```

### Cleanup Failed Operations

Operations that exceed the maximum retry count can be removed:

```typescript
// src/lib/sync/queue.ts
export async function removeFailedOperations(maxRetries: number = 5): Promise<number> {
    const failed = await db.syncQueue.filter((op) =>
        op.retries >= maxRetries
    ).toArray();

    for (const op of failed) {
        if (op.id) await db.syncQueue.delete(op.id);
    }

    return failed.length;
}
```

### Error States

The sync store tracks error state for UI feedback:

```typescript
// Error is captured and stored
catch (error) {
    const message = error instanceof Error ? error.message : 'Sync failed';
    update((s) => ({ ...s, status: 'error', error: message }));
    return false;
}
```

### Sync Status Values

| Status | Meaning | UI Indication |
|--------|---------|---------------|
| `idle` | No sync in progress | ✓ Synced / X pending |
| `syncing` | Sync currently running | ⟳ Syncing... |
| `error` | Last sync failed | ⚠ Error message |
| `offline` | No network connection | 📴 Offline |

---

## 5. Manual Testing Strategy

### Test Environment Setup

#### Prerequisites

```bash
# 1. Start the development server
pnpm dev

# 2. Open browser at http://localhost:5173

# 3. Open DevTools (F12 or Cmd+Option+I)
```

#### DevTools Configuration

**Chrome/Edge:**
1. Open DevTools → Network tab
2. Find "Offline" checkbox in toolbar
3. Check to simulate offline, uncheck for online

**Firefox:**
1. Open DevTools → Network tab
2. Click "No throttling" dropdown
3. Select "Offline" to simulate

### Test Case Categories

### Category A: Offline Operations

#### Test A1: Create Habit While Offline

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app, wait for load | App displays existing habits |
| 2 | Enable offline mode in DevTools | Network indicator shows offline |
| 3 | Click "Add Habit" | Form opens |
| 4 | Enter name "Offline Habit", select emoji | Form accepts input |
| 5 | Save habit | Habit appears in list immediately |
| 6 | Open DevTools → Application → IndexedDB | - |
| 7 | Expand HungryHundreds → habits | New habit visible with `id`, no `serverId` |
| 8 | Check syncQueue table | Entry: `action: 'create', table: 'habits'` |

#### Test A2: Complete Habit While Offline

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | While offline, tap habit to complete | Checkmark appears |
| 2 | Check IndexedDB → logs | New entry with `synced: false` |
| 3 | Check syncQueue | Entry: `action: 'create', table: 'logs'` |

#### Test A3: Edit Habit While Offline

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | While offline, edit habit name | Change saves immediately |
| 2 | Check IndexedDB → habits | `updatedAt` is updated |
| 3 | Check syncQueue | Entry: `action: 'update'` |

#### Test A4: Delete Habit While Offline

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | While offline, delete a habit | Habit disappears |
| 2 | Check IndexedDB → habits | Record removed |
| 3 | Check IndexedDB → logs | Associated logs removed |
| 4 | Check syncQueue | Entry: `action: 'delete'` |

### Category B: Sync on Reconnect

#### Test B1: Auto-Sync When Online

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Perform 3 offline operations | syncQueue has 3 entries |
| 2 | Disable offline mode | Connection restored |
| 3 | Watch console for `[sync]` logs | Sync starts automatically |
| 4 | Wait for completion | syncStore.status → 'idle' |
| 5 | Check syncQueue | Empty (all processed) |
| 6 | Check habits table | `serverId` populated |

#### Test B2: Manual Sync Trigger

```javascript
// In browser console:
const { syncStore } = await import('$lib/sync');
await syncStore.sync();
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Run sync via console | Status changes to 'syncing' |
| 2 | Wait for completion | Status returns to 'idle' |
| 3 | Check lastSync | Updated timestamp |

### Category C: Conflict Resolution

#### Test C1: Last-Write-Wins (Requires Two Sessions)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open app in Tab A and Tab B | Same data in both |
| 2 | Tab A: Go offline | Tab A shows offline |
| 3 | Tab A: Edit habit to "Edit A" | Saves locally |
| 4 | Tab B: Edit same habit to "Edit B" | Syncs to Supabase |
| 5 | Wait 5+ seconds | Ensures timestamp difference |
| 6 | Tab A: Go back online | Sync triggers |
| 7 | Tab A: Refresh page | Shows "Edit B" (newer) |

### Category D: Error States

#### Test D1: Failed Sync Recovery

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Remove Supabase credentials from .env | Simulate API failure |
| 2 | Restart dev server | - |
| 3 | Create habit online | API call fails |
| 4 | Check syncQueue | Entry with `retries: 1` |
| 5 | Check syncStore.status | 'error' |
| 6 | Check syncStore.error | Error message present |

### Console Commands for Testing

```javascript
// ============================================
// INSPECTION COMMANDS
// ============================================

// View current sync state
(await import('$lib/sync')).syncStore.subscribe(s => console.table(s))();

// View connection state
(await import('$lib/sync')).connection.subscribe(c => console.table(c))();

// View pending operations
console.table(await (await import('$lib/sync')).getPendingOperations());

// View all habits in IndexedDB
console.table(await (await import('$lib/db')).db.habits.toArray());

// View all logs in IndexedDB
console.table(await (await import('$lib/db')).db.logs.toArray());

// View sync queue
console.table(await (await import('$lib/db')).db.syncQueue.toArray());

// ============================================
// ACTION COMMANDS
// ============================================

// Force a sync
await (await import('$lib/sync')).syncStore.sync();

// Clear sync queue (TESTING ONLY)
await (await import('$lib/sync')).clearQueue();

// Remove failed operations
await (await import('$lib/sync')).removeFailedOperations(5);

// Check if online
(await import('$lib/sync')).connection.isOnline();
```

### UI Verification Component

Add this debug component to verify reactive stores work correctly:

```svelte
<!-- src/routes/+layout.svelte (for development only) -->
<script>
    import { dev } from '$app/environment';
    import { isOnline, syncStore, syncStatusText } from '$lib/sync';
</script>

{#if dev}
    <div class="fixed bottom-20 left-4 z-50 rounded bg-black/80 p-3
                font-mono text-xs text-white">
        <div class="grid grid-cols-2 gap-x-4 gap-y-1">
            <span>Online:</span>
            <span>{$isOnline ? '🟢 Yes' : '🔴 No'}</span>

            <span>Status:</span>
            <span>{$syncStore.status}</span>

            <span>Pending:</span>
            <span>{$syncStore.pendingCount}</span>

            <span>Last Sync:</span>
            <span>
                {$syncStore.lastSync
                    ? new Date($syncStore.lastSync).toLocaleTimeString()
                    : 'Never'}
            </span>

            <span>Display:</span>
            <span>{$syncStatusText}</span>

            {#if $syncStore.error}
                <span>Error:</span>
                <span class="text-red-400">{$syncStore.error}</span>
            {/if}
        </div>
    </div>
{/if}
```

### Expected UI States

| Scenario | Online | Status | Pending | Display |
|----------|--------|--------|---------|---------|
| Normal, synced | 🟢 | idle | 0 | "Synced" |
| Pending changes | 🟢 | idle | 3 | "3 pending" |
| Currently syncing | 🟢 | syncing | - | "Syncing..." |
| Offline | 🔴 | offline | - | "Offline" |
| Error | 🟢 | error | - | [error message] |

---

## Acceptance Criteria

- [x] Changes made offline are queued in IndexedDB
- [x] Queue processes automatically when online
- [x] Conflicts are resolved using last-write-wins
- [x] UI can display sync status via reactive stores
- [x] Failed operations are retried with limits
- [x] Works without Supabase (graceful degradation)

---

## Related Files

| File | Purpose |
|------|---------|
| `src/lib/sync/queue.ts` | Queue management operations |
| `src/lib/sync/detector.ts` | Network connectivity detection |
| `src/lib/sync/sync.ts` | Core sync engine and stores |
| `src/lib/sync/conflicts.ts` | Conflict resolution logic |
| `src/lib/sync/index.ts` | Module exports |
| `src/lib/db/db.ts` | Dexie schema with SyncQueue table |
| `src/lib/supabase/api.ts` | Remote API operations |

---

## See Also

- [ROADMAP.md](../ROADMAP.md) - Phase 4 completion details
- [API.md](../API.md) - Data model documentation
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture overview

