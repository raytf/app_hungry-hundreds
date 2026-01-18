/**
 * Sync Queue Operations
 *
 * Manages the queue of pending operations for offline sync.
 * Local changes are queued here and processed when online.
 *
 * @see docs/API.md for sync documentation
 */
// Import directly from db.ts to avoid circular dependency with habits.ts/habitLogs.ts
import { db, now, type SyncQueue, type Habit, type HabitLog } from '$lib/db/db';

// ============================================================================
// Types
// ============================================================================

export type SyncAction = 'create' | 'update' | 'delete';
export type SyncTable = 'habits' | 'logs';

export interface QueuedHabitPayload {
	localId: number;
	serverId?: string;
	data?: Partial<Habit>;
}

export interface QueuedLogPayload {
	localId: number;
	serverId?: string;
	habitLocalId: number;
	habitServerId?: string;
	date: string;
}

export type SyncPayload = QueuedHabitPayload | QueuedLogPayload;

// ============================================================================
// Queue Change Notification
// ============================================================================

type QueueChangeHandler = () => void;
const queueChangeHandlers: Set<QueueChangeHandler> = new Set();

/**
 * Register a handler to be called when the queue changes
 * Used by syncStore to trigger sync after local changes
 * @returns Unsubscribe function
 */
export function onQueueChange(handler: QueueChangeHandler): () => void {
	queueChangeHandlers.add(handler);
	return () => queueChangeHandlers.delete(handler);
}

/**
 * Notify all handlers that the queue has changed
 */
function notifyQueueChange(): void {
	queueChangeHandlers.forEach((handler) => handler());
}

// ============================================================================
// Queue Operations
// ============================================================================

/**
 * Add an operation to the sync queue
 */
export async function queueOperation(
	action: SyncAction,
	table: SyncTable,
	payload: SyncPayload
): Promise<number> {
	const entry: SyncQueue = {
		action,
		table,
		payload,
		timestamp: now(),
		retries: 0
	};

	const id = await db.syncQueue.add(entry);

	// Notify listeners that queue has changed
	notifyQueueChange();

	return id;
}

/**
 * Queue a habit creation for sync
 */
export async function queueHabitCreate(localId: number, data: Partial<Habit>): Promise<number> {
	return await queueOperation('create', 'habits', {
		localId,
		data
	});
}

/**
 * Queue a habit update for sync
 */
export async function queueHabitUpdate(
	localId: number,
	serverId: string | undefined,
	data: Partial<Habit>
): Promise<number> {
	return await queueOperation('update', 'habits', {
		localId,
		serverId,
		data
	});
}

/**
 * Queue a habit deletion for sync
 */
export async function queueHabitDelete(
	localId: number,
	serverId: string | undefined
): Promise<number> {
	return await queueOperation('delete', 'habits', {
		localId,
		serverId
	});
}

/**
 * Queue a habit log creation for sync
 */
export async function queueLogCreate(
	localId: number,
	habitLocalId: number,
	habitServerId: string | undefined,
	date: string
): Promise<number> {
	return await queueOperation('create', 'logs', {
		localId,
		habitLocalId,
		habitServerId,
		date
	});
}

/**
 * Queue a habit log deletion for sync
 */
export async function queueLogDelete(
	localId: number,
	serverId: string | undefined,
	habitLocalId: number,
	habitServerId: string | undefined,
	date: string
): Promise<number> {
	return await queueOperation('delete', 'logs', {
		localId,
		serverId,
		habitLocalId,
		habitServerId,
		date
	});
}

// ============================================================================
// Queue Management
// ============================================================================

/**
 * Get all pending operations, ordered by timestamp
 */
export async function getPendingOperations(): Promise<SyncQueue[]> {
	return await db.syncQueue.orderBy('timestamp').toArray();
}

/**
 * Get the count of pending operations
 */
export async function getPendingCount(): Promise<number> {
	return await db.syncQueue.count();
}

/**
 * Remove an operation from the queue after successful sync
 */
export async function removeFromQueue(id: number): Promise<void> {
	await db.syncQueue.delete(id);
}

/**
 * Increment retry count for a failed operation
 */
export async function incrementRetry(id: number): Promise<void> {
	await db.syncQueue.update(id, {
		retries: (await db.syncQueue.get(id))?.retries ?? 0 + 1
	});
}

/**
 * Clear all operations from the queue (use with caution)
 */
export async function clearQueue(): Promise<void> {
	await db.syncQueue.clear();
}

/**
 * Remove operations that have exceeded max retries
 */
export async function removeFailedOperations(maxRetries: number = 5): Promise<number> {
	const failed = await db.syncQueue.filter((op) => op.retries >= maxRetries).toArray();

	for (const op of failed) {
		if (op.id) await db.syncQueue.delete(op.id);
	}

	return failed.length;
}
