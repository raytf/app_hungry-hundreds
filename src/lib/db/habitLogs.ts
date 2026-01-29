/**
 * HabitLog Operations
 *
 * Handles habit completion tracking and streak calculation.
 * All operations are local-first and queue changes for sync to Supabase.
 *
 * @see docs/API.md for data model documentation
 */
import { db, formatDateLocal, getTodayDate, now, type HabitLog } from './db';
import { queueLogCreate, queueLogDelete } from '$lib/sync/queue';

// ============================================================================
// Create/Toggle Operations
// ============================================================================

/**
 * Log a habit completion for a specific date
 * @returns The ID of the created log
 */
export async function logHabitCompletion(habitId: number, date?: string): Promise<number> {
	const logDate = date ?? getTodayDate();
	const log: HabitLog = {
		habitId,
		date: logDate,
		completedAt: now(),
		synced: false
	};

	return await db.logs.add(log);
}

/**
 * Remove a habit completion for a specific date
 * @returns Number of records deleted
 */
export async function removeHabitCompletion(habitId: number, date?: string): Promise<number> {
	const logDate = date ?? getTodayDate();
	return await db.logs.where('[habitId+date]').equals([habitId, logDate]).delete();
}

/**
 * Toggle habit completion for a date
 * If completed, removes it. If not completed, adds it.
 * @returns Whether the habit is now completed
 */
export async function toggleHabitCompletion(habitId: number, date?: string): Promise<boolean> {
	const logDate = date ?? getTodayDate();
	const existing = await db.logs.where('[habitId+date]').equals([habitId, logDate]).first();

	// Get the habit to access serverId for sync queue
	const habit = await db.habits.get(habitId);

	if (existing) {
		await db.logs.delete(existing.id!);

		// Queue deletion for sync to Supabase
		await queueLogDelete(existing.id!, existing.serverId, habitId, habit?.serverId, logDate);

		return false;
	} else {
		const logId = await logHabitCompletion(habitId, logDate);

		// Queue creation for sync to Supabase
		await queueLogCreate(logId, habitId, habit?.serverId, logDate);

		return true;
	}
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Check if a habit was completed on a specific date
 */
export async function isHabitCompletedOnDate(habitId: number, date?: string): Promise<boolean> {
	const logDate = date ?? getTodayDate();
	const count = await db.logs.where('[habitId+date]').equals([habitId, logDate]).count();
	return count > 0;
}

/**
 * Get all completion dates for a habit
 */
export async function getHabitCompletionDates(habitId: number): Promise<string[]> {
	const logs = await db.logs.where('habitId').equals(habitId).toArray();
	return logs.map((log) => log.date).sort();
}

/**
 * Get completions for a habit within a date range
 */
export async function getHabitLogsInRange(
	habitId: number,
	startDate: string,
	endDate: string
): Promise<HabitLog[]> {
	return await db.logs
		.where('habitId')
		.equals(habitId)
		.filter((log) => log.date >= startDate && log.date <= endDate)
		.toArray();
}

// ============================================================================
// Streak Calculation
// ============================================================================

/**
 * Calculate the current streak for a habit
 * Streak = consecutive days completed ending today (or yesterday if not done today)
 */
export async function calculateStreak(habitId: number): Promise<number> {
	const dates = await getHabitCompletionDates(habitId);
	if (dates.length === 0) return 0;

	const today = getTodayDate();
	const dateSet = new Set(dates);

	// Start from today and count backwards
	let streak = 0;
	const checkDate = new Date(today + 'T00:00:00'); // Parse as local time, not UTC

	// If not completed today, start checking from yesterday
	if (!dateSet.has(today)) {
		checkDate.setDate(checkDate.getDate() - 1);
		// If yesterday also not done, streak is 0
		if (!dateSet.has(formatDateLocal(checkDate))) {
			return 0;
		}
	}

	// Count consecutive days
	while (dateSet.has(formatDateLocal(checkDate))) {
		streak++;
		checkDate.setDate(checkDate.getDate() - 1);
	}

	return streak;
}

/**
 * Get streaks for multiple habits at once (more efficient)
 */
export async function calculateStreaksForHabits(habitIds: number[]): Promise<Map<number, number>> {
	const streakMap = new Map<number, number>();
	await Promise.all(
		habitIds.map(async (id) => {
			const streak = await calculateStreak(id);
			streakMap.set(id, streak);
		})
	);
	return streakMap;
}

/**
 * Check which habits are completed today
 */
export async function getCompletedTodayMap(habitIds: number[]): Promise<Map<number, boolean>> {
	const today = getTodayDate();
	const completedMap = new Map<number, boolean>();

	await Promise.all(
		habitIds.map(async (id) => {
			const completed = await isHabitCompletedOnDate(id, today);
			completedMap.set(id, completed);
		})
	);

	return completedMap;
}
