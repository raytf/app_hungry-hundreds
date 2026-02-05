/**
 * HabitLog Operations
 *
 * Handles habit completion tracking and streak calculation.
 * All operations are local-first and queue changes for sync to Supabase.
 *
 * @see docs/API.md for data model documentation
 * @see docs/features/flexible-streaks.md for flexible streak feature
 */
import { db, formatDateLocal, getTodayDate, now, type Habit, type HabitLog } from './db';
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

// ============================================================================
// Flexible Streak Calculation (Phase 1)
// ============================================================================

/**
 * Result of flexible streak calculation
 */
export interface FlexibleStreakResult {
	streak: number; // Consecutive days (daily) or consecutive successful weeks (weekly)
	periodProgress: number; // Completions in current period (0/1 for daily, 0-7 for weekly)
	periodTarget: number; // Target for current period (1 for daily, user-configured for weekly)
	periodType: 'day' | 'week';
	totalCompletions: number; // Lifetime completion count
}

/**
 * Get the start and end dates of a week containing the given date
 * @param date - The date to find the week for
 * @param weekStartsOn - 0 = Sunday, 1 = Monday
 * @returns { start: string, end: string } in YYYY-MM-DD format
 */
export function getWeekBounds(date: Date, weekStartsOn: 0 | 1): { start: string; end: string } {
	const dayOfWeek = date.getDay(); // 0 = Sunday
	const diff = (dayOfWeek - weekStartsOn + 7) % 7;

	const weekStart = new Date(date);
	weekStart.setDate(date.getDate() - diff);

	const weekEnd = new Date(weekStart);
	weekEnd.setDate(weekStart.getDate() + 6);

	return {
		start: formatDateLocal(weekStart),
		end: formatDateLocal(weekEnd)
	};
}

/**
 * Get completions count within a date range
 */
export async function getCompletionsInRange(
	habitId: number,
	startDate: string,
	endDate: string
): Promise<number> {
	return await db.logs
		.where('habitId')
		.equals(habitId)
		.filter((log) => log.date >= startDate && log.date <= endDate)
		.count();
}

/**
 * Get total lifetime completions for a habit
 */
export async function getTotalCompletions(habitId: number): Promise<number> {
	return await db.logs.where('habitId').equals(habitId).count();
}

/**
 * Calculate consecutive successful weeks for a weekly habit
 * A week is "successful" if completions >= target
 */
export async function calculateWeekStreak(
	habitId: number,
	target: number,
	weekStartsOn: 0 | 1
): Promise<number> {
	const today = new Date();
	let streak = 0;
	let currentWeek = new Date(today);

	// Get current week bounds
	let weekBounds = getWeekBounds(currentWeek, weekStartsOn);
	let completions = await getCompletionsInRange(habitId, weekBounds.start, weekBounds.end);

	// Check if current week target is met
	const isCurrentWeekMet = completions >= target;

	// If current week isn't met yet, that's okay - check if we're still in progress
	// We'll still count previous weeks' streak
	if (isCurrentWeekMet) {
		streak = 1;
		// Move to previous week
		currentWeek.setDate(currentWeek.getDate() - 7);
	} else {
		// Current week not met yet - check previous week
		currentWeek.setDate(currentWeek.getDate() - 7);
	}

	// Count consecutive successful previous weeks
	while (true) {
		weekBounds = getWeekBounds(currentWeek, weekStartsOn);
		completions = await getCompletionsInRange(habitId, weekBounds.start, weekBounds.end);

		if (completions >= target) {
			streak++;
			currentWeek.setDate(currentWeek.getDate() - 7);
		} else {
			break;
		}
	}

	return streak;
}

/**
 * Calculate flexible streak for a habit based on its frequency type
 * @param habit - The habit to calculate streak for (must have id)
 * @returns FlexibleStreakResult with all streak metrics
 */
export async function calculateFlexibleStreak(habit: Habit): Promise<FlexibleStreakResult> {
	const habitId = habit.id!;

	// Get total completions (works for both daily and weekly)
	const totalCompletions = await getTotalCompletions(habitId);

	if (habit.frequencyType === 'daily') {
		// Daily habits: use existing consecutive day streak
		const streak = await calculateStreak(habitId);
		const today = getTodayDate();
		const completedToday = await isHabitCompletedOnDate(habitId, today);

		return {
			streak,
			periodProgress: completedToday ? 1 : 0,
			periodTarget: 1,
			periodType: 'day',
			totalCompletions
		};
	} else {
		// Weekly habits: consecutive successful weeks
		const weekStartsOn = habit.weekStartsOn;
		const target = habit.frequencyTarget;

		// Get current week progress
		const today = new Date();
		const weekBounds = getWeekBounds(today, weekStartsOn);
		const periodProgress = await getCompletionsInRange(habitId, weekBounds.start, weekBounds.end);

		// Calculate consecutive successful weeks
		const streak = await calculateWeekStreak(habitId, target, weekStartsOn);

		return {
			streak,
			periodProgress,
			periodTarget: target,
			periodType: 'week',
			totalCompletions
		};
	}
}

/**
 * Get flexible streak results for multiple habits at once (more efficient)
 */
export async function calculateFlexibleStreaksForHabits(
	habits: Habit[]
): Promise<Map<number, FlexibleStreakResult>> {
	const resultMap = new Map<number, FlexibleStreakResult>();

	await Promise.all(
		habits.map(async (habit) => {
			if (habit.id !== undefined) {
				const result = await calculateFlexibleStreak(habit);
				resultMap.set(habit.id, result);
			}
		})
	);

	return resultMap;
}
