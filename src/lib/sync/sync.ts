/**
 * Core Sync Logic
 *
 * Handles synchronization between local Dexie.js database and Supabase.
 * Processes the sync queue and handles push/pull operations.
 *
 * @see docs/API.md for sync documentation
 */
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { db, type Habit, type HabitLog, type SyncQueue } from '$lib/db';
import {
	fetchHabits,
	fetchHabitLogs,
	createRemoteHabit,
	updateRemoteHabit,
	deleteRemoteHabit,
	createRemoteHabitLog,
	updateRemoteHabitLog,
	deleteRemoteHabitLog
} from '$lib/supabase';
import { auth, userId } from '$lib/stores/auth';
import { onAuthStateChange } from '$lib/supabase';
import { connection, isOnline } from './detector';
import {
	getPendingOperations,
	removeFromQueue,
	incrementRetry,
	onQueueChange,
	queueOperation,
	type QueuedHabitPayload,
	type QueuedLogPayload
} from './queue';
import {
	resolveHabitConflict,
	applyRemoteHabit,
	createLocalHabitFromRemote,
	createLocalLogFromRemote,
	markLogSynced,
	handleRemoteHabitDeletion
} from './conflicts';

// ============================================================================
// Types
// ============================================================================

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncState {
	status: SyncStatus;
	lastSync: number | null;
	pendingCount: number;
	error: string | null;
}

// ============================================================================
// Sync Store
// ============================================================================

// Debounce delay for sync calls (prevents rapid fire during auth changes)
const SYNC_DEBOUNCE_MS = 300;

function createSyncStore() {
	const { subscribe, set, update } = writable<SyncState>({
		status: 'idle',
		lastSync: null,
		pendingCount: 0,
		error: null
	});

	let syncInProgress = false;
	let needsResync = false; // Track if we need to sync again after current sync completes
	let autoSyncUnsubscribe: (() => void) | null = null;
	let authUnsubscribe: (() => void) | null = null;
	let queueChangeUnsubscribe: (() => void) | null = null;
	let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

	return {
		subscribe,

		/**
		 * Debounced sync - prevents excessive sync calls during rapid auth changes
		 */
		debouncedSync(): void {
			if (syncDebounceTimer) {
				clearTimeout(syncDebounceTimer);
			}
			syncDebounceTimer = setTimeout(() => {
				syncDebounceTimer = null;
				this.sync();
			}, SYNC_DEBOUNCE_MS);
		},

		/**
		 * Initialize sync - set up auto-sync on connection restore and auth changes
		 */
		init(): void {
			if (!browser) return;

			// Update pending count on init
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

			// Listen for auth state changes - sync when user signs in
			authUnsubscribe = onAuthStateChange(async (event, session) => {
				if (event === 'SIGNED_IN' && session) {
					// Use debounced sync to prevent rapid fire during auth flow
					this.debouncedSync();
				}
			});

			// Listen for queue changes - sync when local changes are queued
			queueChangeUnsubscribe = onQueueChange(() => {
				// Update pending count immediately
				this.updatePendingCount();
				// Trigger debounced sync to push changes
				this.debouncedSync();
			});

			// Set initial status based on connection
			if (!connection.isOnline()) {
				update((s) => ({ ...s, status: 'offline' }));
			}
		},

		/**
		 * Clean up sync listeners
		 */
		destroy(): void {
			if (autoSyncUnsubscribe) {
				autoSyncUnsubscribe();
				autoSyncUnsubscribe = null;
			}
			if (authUnsubscribe) {
				authUnsubscribe();
				authUnsubscribe = null;
			}
			if (queueChangeUnsubscribe) {
				queueChangeUnsubscribe();
				queueChangeUnsubscribe = null;
			}
			if (syncDebounceTimer) {
				clearTimeout(syncDebounceTimer);
				syncDebounceTimer = null;
			}
		},

		/**
		 * Update the pending operation count
		 */
		async updatePendingCount(): Promise<void> {
			const count = await db.syncQueue.count();
			update((s) => ({ ...s, pendingCount: count }));
		},

		/**
		 * Perform a full sync operation
		 */
		async sync(): Promise<boolean> {
			// Guard against concurrent syncs - but mark that we need to resync
			if (syncInProgress) {
				needsResync = true;
				return false;
			}

			// Check if online and authenticated
			if (!connection.isOnline()) {
				update((s) => ({ ...s, status: 'offline' }));
				return false;
			}

			const currentUserId = get(userId);
			if (!currentUserId) {
				update((s) => ({ ...s, status: 'idle', error: 'Not authenticated' }));
				return false;
			}

			syncInProgress = true;
			needsResync = false; // Reset the flag at start of sync
			update((s) => ({ ...s, status: 'syncing', error: null }));

			try {
				// Queue any local habits that haven't been synced yet
				await this.queueUnsyncedHabits();

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

				await this.updatePendingCount();
				return true;
			} catch (error) {
				console.error('[sync] Sync error:', error);
				const message = error instanceof Error ? error.message : 'Sync failed';
				update((s) => ({ ...s, status: 'error', error: message }));
				return false;
			} finally {
				syncInProgress = false;
				// If changes were queued during sync, trigger another sync
				if (needsResync) {
					needsResync = false;
					this.debouncedSync();
				}
			}
		},

		/**
		 * Queue any local habits that don't have a serverId
		 * This handles habits created before sync was properly wired up
		 */
		async queueUnsyncedHabits(): Promise<void> {
			const habits = await db.habits.filter((h) => !h.serverId).toArray();

			for (const habit of habits) {
				// Check if already queued
				const existingOp = await db.syncQueue
					.filter(
						(op) =>
							op.table === 'habits' &&
							op.action === 'create' &&
							(op.payload as QueuedHabitPayload).localId === habit.id
					)
					.first();

				if (!existingOp) {
					await queueOperation('create', 'habits', {
						localId: habit.id,
						data: habit
					} as QueuedHabitPayload);
				}
			}
		},

		/**
		 * Process pending queue operations
		 */
		async processQueue(currentUserId: string): Promise<void> {
			const operations = await getPendingOperations();

			for (const op of operations) {
				try {
					await this.processOperation(op, currentUserId);
					if (op.id) await removeFromQueue(op.id);
				} catch (error) {
					console.error('[sync] Operation failed:', op, error);
					if (op.id) await incrementRetry(op.id);
				}
			}
		},

		/**
		 * Process a single queue operation
		 */
		async processOperation(op: SyncQueue, userId: string): Promise<void> {
			if (op.table === 'habits') {
				await this.processHabitOperation(op, userId);
			} else if (op.table === 'logs') {
				await this.processLogOperation(op, userId);
			}
		},

		/**
		 * Process a habit operation from the queue
		 */
		async processHabitOperation(op: SyncQueue, userId: string): Promise<void> {
			const payload = op.payload as QueuedHabitPayload;

			if (op.action === 'create') {
				const habit = await db.habits.get(payload.localId);
				if (!habit) {
					// Habit was deleted locally before sync completed
					return;
				}

				const { data, error } = await createRemoteHabit(
					{
						name: habit.name,
						emoji: habit.emoji,
						color: habit.color,
						reminder_time: habit.reminderTime,
						schedule: habit.schedule as unknown as import('$lib/supabase/types').Json,
						pending_interval_days: habit.pendingIntervalDays ?? null
					},
					userId
				);

				if (error) {
					console.error('[sync] Failed to create habit:', error);
					throw error;
				}
				if (data) {
					// Update local record with server ID
					await db.habits.update(payload.localId, { serverId: data.id });
				}
			} else if (op.action === 'update') {
				if (!payload.serverId) {
					console.warn('[sync] Cannot update habit without serverId');
					return;
				}

				const remoteUpdates: import('$lib/supabase').HabitUpdate = {
					name: payload.data?.name,
					emoji: payload.data?.emoji,
					color: payload.data?.color,
					reminder_time: payload.data?.reminderTime,
					schedule: payload.data?.schedule as unknown as import('$lib/supabase/types').Json
				};

				if (payload.data && 'pendingIntervalDays' in payload.data) {
					remoteUpdates.pending_interval_days = payload.data.pendingIntervalDays ?? null;
				}

				const { error } = await updateRemoteHabit(payload.serverId, remoteUpdates);

				if (error) throw error;
			} else if (op.action === 'delete') {
				if (!payload.serverId) {
					// Never synced to server, nothing to delete
					return;
				}

				const { error } = await deleteRemoteHabit(payload.serverId);
				if (error) throw error;
			}
		},

		/**
		 * Process a log operation from the queue
		 */
		async processLogOperation(op: SyncQueue, userId: string): Promise<void> {
			const payload = op.payload as QueuedLogPayload;

			// Look up current habitServerId from local DB (in case habit was synced after log was queued)
			let habitServerId = payload.habitServerId;
			if (!habitServerId && payload.habitLocalId) {
				const habit = await db.habits.get(payload.habitLocalId);
				habitServerId = habit?.serverId;
			}

			if (op.action === 'create') {
				if (!habitServerId) {
					console.warn(
						'[sync] Cannot create log without habitServerId, will retry after habit syncs'
					);
					// Don't remove from queue - leave it for next sync attempt after habit is synced
					await incrementRetry(op.id!);
					return;
				}

				const { data, error } = await createRemoteHabitLog(
					{
						habit_id: habitServerId,
						logged_date: payload.date,
						completion_type: payload.completionType ?? 'full',
						window_interval_days: payload.windowIntervalDays ?? null
					},
					userId
				);

				if (error) throw error;
				if (data) {
					await markLogSynced(payload.localId, data.id);
				}
			} else if (op.action === 'update') {
				let logServerId = payload.serverId;
				if (!logServerId) {
					const log = await db.logs.get(payload.localId);
					logServerId = log?.serverId;
				}

				if (!logServerId) {
					console.warn('[sync] Cannot update log without serverId, will retry after log syncs');
					await incrementRetry(op.id!);
					return;
				}

				const { error } = await updateRemoteHabitLog(logServerId, {
					completion_type: payload.completionType,
					window_interval_days: payload.windowIntervalDays ?? null
				});

				if (error) throw error;
				await db.logs.update(payload.localId, { synced: true });
			} else if (op.action === 'delete') {
				if (!habitServerId) {
					// For deletes without habitServerId, we can safely remove from queue
					// The habit might have been deleted too
					console.warn('[sync] Skipping log delete without habitServerId');
					return;
				}

				const { error } = await deleteRemoteHabitLog(habitServerId, payload.date);
				if (error) throw error;
			}
		},

		/**
		 * Pull remote changes and merge with local data
		 */
		async pullRemoteChanges(userId: string): Promise<void> {
			// Fetch all remote habits
			const { data: remoteHabits, error: habitsError } = await fetchHabits();
			if (habitsError) throw habitsError;

			// Fetch all remote logs
			const { data: remoteLogs, error: logsError } = await fetchHabitLogs();
			if (logsError) throw logsError;

			// Get all local habits
			const localHabits = await db.habits.toArray();

			// Create a map of server ID to local habit
			const serverIdToLocal = new Map<string, Habit>();
			for (const habit of localHabits) {
				if (habit.serverId) {
					serverIdToLocal.set(habit.serverId, habit);
				}
			}

			// Process remote habits
			for (const remote of remoteHabits || []) {
				const local = serverIdToLocal.get(remote.id);

				if (local) {
					// Habit exists locally - resolve conflicts
					const result = resolveHabitConflict(local, remote);
					if (result.resolution === 'remote' && local.id) {
						await applyRemoteHabit(local.id, remote);
					}
				} else {
					// New remote habit - create locally
					await createLocalHabitFromRemote(remote);
				}
			}

			// Handle deleted habits (exist locally but not remotely)
			const remoteHabitIds = new Set((remoteHabits || []).map((h) => h.id));
			for (const local of localHabits) {
				if (local.serverId && !remoteHabitIds.has(local.serverId) && local.id) {
					await handleRemoteHabitDeletion(local.id);
				}
			}

			// Process remote logs
			await this.pullRemoteLogs(remoteLogs || []);
		},

		/**
		 * Pull and merge remote habit logs
		 */
		async pullRemoteLogs(
			remoteLogs: Awaited<ReturnType<typeof fetchHabitLogs>>['data']
		): Promise<void> {
			if (!remoteLogs) return;

			// Get local habits to map server IDs to local IDs
			const localHabits = await db.habits.toArray();
			const serverIdToLocalId = new Map<string, number>();
			for (const h of localHabits) {
				if (h.serverId && h.id) {
					serverIdToLocalId.set(h.serverId, h.id);
				}
			}

			// Get all local logs
			const localLogs = await db.logs.toArray();
			const localLogKeys = new Set(localLogs.map((l) => `${l.habitId}-${l.date}`));

			for (const remote of remoteLogs) {
				const habitLocalId = serverIdToLocalId.get(remote.habit_id);
				if (!habitLocalId) continue;

				const key = `${habitLocalId}-${remote.logged_date}`;
				if (!localLogKeys.has(key)) {
					// Remote log doesn't exist locally - create it
					await createLocalLogFromRemote(remote, habitLocalId);
				}
			}
		}
	};
}

export const syncStore = createSyncStore();

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * Whether sync is currently in progress
 */
export const isSyncing = derived(syncStore, ($sync) => $sync.status === 'syncing');

/**
 * Whether there are pending changes to sync
 */
export const hasPendingChanges = derived(syncStore, ($sync) => $sync.pendingCount > 0);

/**
 * Human-readable sync status
 */
export const syncStatusText = derived(syncStore, ($sync) => {
	switch ($sync.status) {
		case 'idle':
			return $sync.pendingCount > 0 ? `${$sync.pendingCount} pending` : 'Synced';
		case 'syncing':
			return 'Syncing...';
		case 'error':
			return $sync.error || 'Sync error';
		case 'offline':
			return 'Offline';
	}
});
