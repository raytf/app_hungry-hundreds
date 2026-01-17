/**
 * Conflict Resolution
 *
 * Implements last-write-wins conflict resolution strategy for sync.
 * Compares local and remote timestamps to determine which version to keep.
 *
 * @see docs/API.md for sync documentation
 */
import { db, type Habit, type HabitLog } from '$lib/db';
import type { HabitRow, HabitLogRow } from '$lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type ConflictResolution = 'local' | 'remote' | 'merge';

export interface ConflictResult<T> {
	resolution: ConflictResolution;
	data: T;
	localUpdatedAt: number;
	remoteUpdatedAt: number;
}

// ============================================================================
// Habit Conflict Resolution
// ============================================================================

/**
 * Resolve conflict between local and remote habit using last-write-wins
 */
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

/**
 * Apply remote habit data to local database
 */
export async function applyRemoteHabit(
	localId: number,
	remote: HabitRow
): Promise<void> {
	await db.habits.update(localId, {
		name: remote.name,
		emoji: remote.emoji,
		color: remote.color,
		reminderTime: remote.reminder_time ?? undefined,
		serverId: remote.id,
		updatedAt: new Date(remote.updated_at).getTime()
	});
}

/**
 * Create local habit from remote data
 */
export async function createLocalHabitFromRemote(remote: HabitRow): Promise<number> {
	return await db.habits.add({
		name: remote.name,
		emoji: remote.emoji,
		color: remote.color,
		reminderTime: remote.reminder_time ?? undefined,
		serverId: remote.id,
		createdAt: new Date(remote.created_at).getTime(),
		updatedAt: new Date(remote.updated_at).getTime()
	});
}

// ============================================================================
// HabitLog Conflict Resolution
// ============================================================================

/**
 * Resolve conflict between local and remote habit log
 * For logs, we use existence as the source of truth:
 * - If both exist, keep both (idempotent)
 * - If only remote exists, create local
 * - If only local exists, sync to remote
 */
export function resolveLogConflict(
	local: HabitLog | undefined,
	remote: HabitLogRow | undefined
): ConflictResolution {
	if (local && remote) {
		// Both exist - already in sync
		return 'merge';
	} else if (remote && !local) {
		// Remote exists, local doesn't - pull from remote
		return 'remote';
	} else {
		// Local exists, remote doesn't - push to remote
		return 'local';
	}
}

/**
 * Create local habit log from remote data
 */
export async function createLocalLogFromRemote(
	remote: HabitLogRow,
	habitLocalId: number
): Promise<number> {
	return await db.logs.add({
		habitId: habitLocalId,
		date: remote.logged_date,
		completedAt: new Date(remote.logged_at).getTime(),
		serverId: remote.id,
		synced: true
	});
}

/**
 * Mark local log as synced with server ID
 */
export async function markLogSynced(localId: number, serverId: string): Promise<void> {
	await db.logs.update(localId, {
		serverId,
		synced: true
	});
}

// ============================================================================
// Deletion Handling
// ============================================================================

/**
 * Handle remote deletion of a habit
 * Removes local habit and all its logs
 */
export async function handleRemoteHabitDeletion(localId: number): Promise<void> {
	await db.transaction('rw', [db.habits, db.logs], async () => {
		await db.logs.where('habitId').equals(localId).delete();
		await db.habits.delete(localId);
	});
}

/**
 * Handle remote deletion of a log
 */
export async function handleRemoteLogDeletion(localId: number): Promise<void> {
	await db.logs.delete(localId);
}

