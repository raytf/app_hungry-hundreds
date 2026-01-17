/**
 * Sync Module Index
 *
 * Re-exports all sync functionality for convenient imports.
 *
 * Usage:
 *   import { syncStore, connection, isOnline } from '$lib/sync';
 */

// Connection detection
export {
	connection,
	isOnline,
	timeSinceOnline,
	waitForConnection,
	type ConnectionState,
	type ConnectionEventHandler
} from './detector';

// Sync queue operations
export {
	queueOperation,
	queueHabitCreate,
	queueHabitUpdate,
	queueHabitDelete,
	queueLogCreate,
	queueLogDelete,
	getPendingOperations,
	getPendingCount,
	removeFromQueue,
	incrementRetry,
	clearQueue,
	removeFailedOperations,
	type SyncAction,
	type SyncTable,
	type QueuedHabitPayload,
	type QueuedLogPayload,
	type SyncPayload
} from './queue';

// Conflict resolution
export {
	resolveHabitConflict,
	resolveLogConflict,
	applyRemoteHabit,
	createLocalHabitFromRemote,
	createLocalLogFromRemote,
	markLogSynced,
	handleRemoteHabitDeletion,
	handleRemoteLogDeletion,
	type ConflictResolution,
	type ConflictResult
} from './conflicts';

// Core sync logic
export {
	syncStore,
	isSyncing,
	hasPendingChanges,
	syncStatusText,
	type SyncStatus,
	type SyncState
} from './sync';

