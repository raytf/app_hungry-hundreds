/**
 * HabitLog Operations
 *
 * Handles habit completion tracking and streak calculation.
 * All operations are local-first and queue changes for sync to Supabase.
 *
 * @see docs/API.md for data model documentation
 * @see docs/features/flexible-streaks.md for flexible streak feature
 */
import {
	db,
	formatDateLocal,
	getTodayDate,
	now,
	type Habit,
	type HabitLog,
	type CompletionType
} from './db';
import { queueHabitUpdate, queueLogCreate, queueLogDelete } from '$lib/sync/queue';

function sortLogsNewestFirst(a: HabitLog, b: HabitLog): number {
	if (a.date === b.date) {
		return b.completedAt - a.completedAt;
	}

	return b.date.localeCompare(a.date);
}

function uniqueLogsByDateNewestFirst(logs: HabitLog[]): HabitLog[] {
	const logsByDate = new Map<string, HabitLog>();

	for (const log of logs) {
		const existing = logsByDate.get(log.date);
		if (!existing) {
			logsByDate.set(log.date, log);
			continue;
		}

		const shouldReplace =
			(existing.completionType !== 'full' && log.completionType === 'full') ||
			(existing.completionType === log.completionType && log.completedAt > existing.completedAt);

		if (shouldReplace) {
			logsByDate.set(log.date, log);
		}
	}

	return [...logsByDate.values()].sort(sortLogsNewestFirst);
}

export function resolveWindowInterval(habit: Habit): number | undefined {
	if (habit.schedule?.type !== 'every-x-days') return undefined;
	return habit.pendingIntervalDays ?? habit.schedule.intervalDays;
}

async function consumePendingIntervalIfNeeded(habitId: number, habit: Habit): Promise<void> {
	if (habit.pendingIntervalDays === undefined) return;

	const nextSchedule = {
		type: 'every-x-days' as const,
		intervalDays: habit.pendingIntervalDays
	};

	await db.habits.update(habitId, {
		schedule: nextSchedule,
		pendingIntervalDays: undefined,
		updatedAt: now()
	});
	await queueHabitUpdate(habitId, habit.serverId, {
		schedule: nextSchedule,
		pendingIntervalDays: undefined
	});
}

export async function getLatestLogForHabit(habitId: number): Promise<HabitLog | undefined> {
	const logs = await db.logs.where('habitId').equals(habitId).toArray();
	return [...logs].sort(sortLogsNewestFirst)[0];
}

// ============================================================================
// Create/Toggle Operations
// ============================================================================

/**
 * Log a habit completion for a specific date
 * @param habitId - The ID of the habit
 * @param date - Optional date in YYYY-MM-DD format (defaults to today)
 * @param completionType - 'full' or 'partial' completion (defaults to 'full')
 * @returns The ID of the created log
 */
export async function logHabitCompletion(
	habitId: number,
	date?: string,
	completionType: CompletionType = 'full',
	windowIntervalDays?: number
): Promise<number> {
	const logDate = date ?? getTodayDate();
	const log: HabitLog = {
		habitId,
		date: logDate,
		completedAt: now(),
		completionType,
		windowIntervalDays,
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
 * Behavior depends on the habit's frequency configuration:
 * - Single-completion daily habits (frequencyTarget = 1): toggle on/off
 * - Multi-completion daily habits (frequencyTarget > 1): add completion up to target, then toggle off
 * - Weekly habits: add completion (allows multiple per day)
 * @param habitId - The ID of the habit
 * @param date - Optional date in YYYY-MM-DD format (defaults to today)
 * @param completionType - 'full' or 'partial' completion (defaults to 'full')
 * @returns Whether the habit's target is now met for the period
 */
export async function toggleHabitCompletion(
	habitId: number,
	date?: string,
	completionType: CompletionType = 'full'
): Promise<boolean> {
	const logDate = date ?? getTodayDate();

	// Get the habit to access frequencyTarget and serverId
	const habit = await db.habits.get(habitId);
	if (!habit) return false;

	const windowIntervalDays = resolveWindowInterval(habit);
	const target = habit.frequencyType === 'daily' ? (habit.frequencyTarget ?? 1) : 1;
	const existingLogs = await db.logs.where('[habitId+date]').equals([habitId, logDate]).toArray();
	const currentCount = existingLogs.length;

	// Check if already has a full completion today (for partial completion upgrade logic)
	const hasFullCompletion = existingLogs.some((log) => log.completionType === 'full');

	if (habit.schedule?.type === 'every-x-days') {
		if (currentCount > 0) {
			if (completionType === 'partial' && hasFullCompletion) {
				return true;
			}

			if (completionType === 'full' && !hasFullCompletion) {
				const existing = existingLogs.sort((a, b) => b.completedAt - a.completedAt)[0];
				await db.logs.delete(existing.id!);
				await queueLogDelete(existing.id!, existing.serverId, habitId, habit.serverId, logDate);

				const logId = await logHabitCompletion(habitId, logDate, 'full', windowIntervalDays);
				await queueLogCreate(logId, habitId, habit.serverId, logDate, 'full', windowIntervalDays);
				await consumePendingIntervalIfNeeded(habitId, habit);
				return true;
			}

			const existing = existingLogs.sort((a, b) => b.completedAt - a.completedAt)[0];
			await db.logs.delete(existing.id!);
			await queueLogDelete(existing.id!, existing.serverId, habitId, habit.serverId, logDate);
			return false;
		}

		const logId = await logHabitCompletion(habitId, logDate, completionType, windowIntervalDays);
		await queueLogCreate(
			logId,
			habitId,
			habit.serverId,
			logDate,
			completionType,
			windowIntervalDays
		);

		await consumePendingIntervalIfNeeded(habitId, habit);

		return true;
	}

	if (habit.frequencyType === 'daily' && target === 1) {
		// Single-completion daily habit: simple toggle
		if (currentCount > 0) {
			// If adding partial but already have full, don't downgrade
			if (completionType === 'partial' && hasFullCompletion) {
				return true; // Already fully completed, don't add partial
			}
			// If adding full and have partial, upgrade to full
			if (completionType === 'full' && !hasFullCompletion) {
				// Remove partial and add full
				const existing = existingLogs[0];
				await db.logs.delete(existing.id!);
				await queueLogDelete(existing.id!, existing.serverId, habitId, habit.serverId, logDate);
				const logId = await logHabitCompletion(habitId, logDate, 'full');
				await queueLogCreate(logId, habitId, habit.serverId, logDate, 'full');
				return true;
			}
			// Remove the existing log (toggle off)
			const existing = existingLogs[0];
			await db.logs.delete(existing.id!);
			await queueLogDelete(existing.id!, existing.serverId, habitId, habit.serverId, logDate);
			return false;
		} else {
			// Add a new log
			const logId = await logHabitCompletion(habitId, logDate, completionType);
			await queueLogCreate(logId, habitId, habit.serverId, logDate, completionType);
			return true;
		}
	} else if (habit.frequencyType === 'daily' && target > 1) {
		// Multi-completion daily habit
		if (currentCount >= target) {
			// Target already met - remove the most recent log to allow toggle off
			const mostRecent = existingLogs.sort((a, b) => b.completedAt - a.completedAt)[0];
			await db.logs.delete(mostRecent.id!);
			await queueLogDelete(mostRecent.id!, mostRecent.serverId, habitId, habit.serverId, logDate);
			return currentCount - 1 >= target;
		} else {
			// Add another completion
			const logId = await logHabitCompletion(habitId, logDate, completionType);
			await queueLogCreate(logId, habitId, habit.serverId, logDate, completionType);
			return currentCount + 1 >= target;
		}
	} else {
		// Weekly habit: simple toggle for individual completions
		if (currentCount > 0) {
			const existing = existingLogs[0];
			await db.logs.delete(existing.id!);
			await queueLogDelete(existing.id!, existing.serverId, habitId, habit.serverId, logDate);
			return false;
		} else {
			const logId = await logHabitCompletion(habitId, logDate, completionType);
			await queueLogCreate(logId, habitId, habit.serverId, logDate, completionType);
			return true;
		}
	}
}

/**
 * Mark a habit as partially completed for a date
 * If the habit already has a full completion, this does nothing.
 * If the habit has no completion, it adds a partial completion.
 * @param habitId - The ID of the habit
 * @param date - Optional date in YYYY-MM-DD format (defaults to today)
 * @returns Whether the habit now has any completion (full or partial)
 */
export async function markPartialCompletion(habitId: number, date?: string): Promise<boolean> {
	return toggleHabitCompletion(habitId, date, 'partial');
}

/**
 * Check if a habit has a partial completion on a specific date
 */
export async function hasPartialCompletionOnDate(habitId: number, date?: string): Promise<boolean> {
	const logDate = date ?? getTodayDate();
	const logs = await db.logs.where('[habitId+date]').equals([habitId, logDate]).toArray();
	return logs.some((log) => log.completionType === 'partial');
}

/**
 * Get the completion type for a habit on a specific date
 * Returns 'full' if any full completion exists, 'partial' if only partial, or null if none
 */
export async function getCompletionTypeForDate(
	habitId: number,
	date?: string
): Promise<CompletionType | null> {
	const logDate = date ?? getTodayDate();
	const logs = await db.logs.where('[habitId+date]').equals([habitId, logDate]).toArray();
	if (logs.length === 0) return null;
	// If any log is full, return full (full takes priority)
	if (logs.some((log) => log.completionType === 'full')) return 'full';
	return 'partial';
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

/**
 * Get all logs for a habit, sorted by date ascending
 */
export async function getAllLogsForHabit(habitId: number): Promise<HabitLog[]> {
	return db.logs.where('habitId').equals(habitId).sortBy('date');
}

/**
 * Get all logs across all habits within a date range (inclusive)
 * Uses the standalone date index added in Dexie v5
 */
export async function getLogsBetweenDates(startDate: string, endDate: string): Promise<HabitLog[]> {
	return db.logs.where('date').between(startDate, endDate, true, true).toArray();
}

// ============================================================================
// Streak Calculation
// ============================================================================

/**
 * Get all completion logs for a habit with their completion types
 * Returns a map of date -> CompletionType ('full' takes priority over 'partial')
 */
async function getCompletionTypesByDate(habitId: number): Promise<Map<string, CompletionType>> {
	const logs = await db.logs.where('habitId').equals(habitId).toArray();
	const dateTypeMap = new Map<string, CompletionType>();

	for (const log of logs) {
		const existing = dateTypeMap.get(log.date);
		// Full takes priority over partial
		if (!existing || log.completionType === 'full') {
			dateTypeMap.set(log.date, log.completionType);
		}
	}

	return dateTypeMap;
}

/**
 * Calculate the current streak for a habit
 *
 * Streak calculation with partial completions:
 * - Consecutive days with ANY completion (full OR partial) maintain the streak
 * - Only FULL completions increment the streak counter
 * - Partial completions prevent streak breaks but do NOT add to the count
 *
 * Example:
 * Day 1: Full    → Streak = 1
 * Day 2: Partial → Streak = 1 (preserved, not incremented)
 * Day 3: Full    → Streak = 2
 * Day 4: None    → Streak = 0 (broken)
 */
export async function calculateStreak(habitId: number): Promise<number> {
	const dateTypeMap = await getCompletionTypesByDate(habitId);
	if (dateTypeMap.size === 0) return 0;

	const today = getTodayDate();
	const checkDate = new Date(today + 'T00:00:00'); // Parse as local time, not UTC

	// If not completed today (neither full nor partial), start checking from yesterday
	if (!dateTypeMap.has(today)) {
		checkDate.setDate(checkDate.getDate() - 1);
		// If yesterday also not done, streak is 0
		if (!dateTypeMap.has(formatDateLocal(checkDate))) {
			return 0;
		}
	}

	// Count full completions in consecutive days (including partials for continuity)
	let streak = 0;
	while (dateTypeMap.has(formatDateLocal(checkDate))) {
		const completionType = dateTypeMap.get(formatDateLocal(checkDate));
		// Only full completions increment the streak counter
		if (completionType === 'full') {
			streak++;
		}
		// Both full and partial maintain continuity - keep checking
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
	periodProgress: number; // Completions in current period (0-N for daily, 0-7 for weekly)
	periodTarget: number; // Target for current period (1-10 for daily, 1-7 for weekly)
	periodType: 'day' | 'week';
	totalCompletions: number; // Lifetime completion count
	dueInDays?: number; // Only for 'every-x-days' habits: days until next due (negative = overdue)
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
 * Get full completions count within a date range (excludes partial)
 */
export async function getFullCompletionsInRange(
	habitId: number,
	startDate: string,
	endDate: string
): Promise<number> {
	return await db.logs
		.where('habitId')
		.equals(habitId)
		.filter((log) => log.date >= startDate && log.date <= endDate && log.completionType === 'full')
		.count();
}

/**
 * Check if a date range has any completion (full or partial) for continuity
 */
async function hasAnyCompletionInRange(
	habitId: number,
	startDate: string,
	endDate: string
): Promise<boolean> {
	const count = await getCompletionsInRange(habitId, startDate, endDate);
	return count > 0;
}

/**
 * Get total lifetime completions for a habit
 */
export async function getTotalCompletions(habitId: number): Promise<number> {
	return await db.logs.where('habitId').equals(habitId).count();
}

/**
 * Get completions count for a specific date
 */
export async function getCompletionsForDate(habitId: number, date: string): Promise<number> {
	return await db.logs
		.where('habitId')
		.equals(habitId)
		.filter((log) => log.date === date)
		.count();
}

/**
 * Get full completions count for a specific date (excludes partial)
 */
export async function getFullCompletionsForDate(habitId: number, date: string): Promise<number> {
	return await db.logs
		.where('habitId')
		.equals(habitId)
		.filter((log) => log.date === date && log.completionType === 'full')
		.count();
}

/**
 * Check if a date has any completion (full or partial) for continuity
 */
async function hasAnyCompletionForDate(habitId: number, date: string): Promise<boolean> {
	const count = await db.logs
		.where('habitId')
		.equals(habitId)
		.filter((log) => log.date === date)
		.count();
	return count > 0;
}

/**
 * Calculate consecutive successful days for a daily habit with multi-completion support
 *
 * For partial completion support:
 * - A day with ANY completion (full or partial) maintains streak continuity
 * - Only days where FULL completions >= target increment the streak
 * - Partial completions prevent streak breaks but don't count toward target
 */
export async function calculateDayStreak(habitId: number, target: number): Promise<number> {
	const today = getTodayDate();
	let streak = 0;
	const checkDate = new Date(today + 'T00:00:00');

	// Check if today has any completion for continuity
	const hasTodayCompletion = await hasAnyCompletionForDate(habitId, today);

	// If no completion today, start from yesterday
	if (!hasTodayCompletion) {
		checkDate.setDate(checkDate.getDate() - 1);
		// Check if yesterday has any completion
		if (!(await hasAnyCompletionForDate(habitId, formatDateLocal(checkDate)))) {
			return 0; // No continuity - streak is broken
		}
	}

	// Count consecutive days with completions, but only count full completion days toward streak
	while (await hasAnyCompletionForDate(habitId, formatDateLocal(checkDate))) {
		// Only count if full completions meet target
		const fullCompletions = await getFullCompletionsForDate(habitId, formatDateLocal(checkDate));
		if (fullCompletions >= target) {
			streak++;
		}
		// Continue checking for continuity regardless
		checkDate.setDate(checkDate.getDate() - 1);
	}

	return streak;
}

/**
 * Calculate consecutive successful weeks for a weekly habit
 *
 * For partial completion support:
 * - A week with ANY completion (full or partial) maintains streak continuity
 * - Only weeks where FULL completions >= target increment the streak
 * - Partial completions prevent streak breaks but don't count toward target
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

	// Check if current week has any completion for continuity
	const hasCurrentWeekCompletion = await hasAnyCompletionInRange(
		habitId,
		weekBounds.start,
		weekBounds.end
	);

	// If no completion this week, start from previous week
	if (!hasCurrentWeekCompletion) {
		currentWeek.setDate(currentWeek.getDate() - 7);
		weekBounds = getWeekBounds(currentWeek, weekStartsOn);
		// Check if previous week has any completion
		if (!(await hasAnyCompletionInRange(habitId, weekBounds.start, weekBounds.end))) {
			return 0; // No continuity - streak is broken
		}
	}

	// Count consecutive weeks with completions, but only count full completion weeks toward streak
	while (await hasAnyCompletionInRange(habitId, weekBounds.start, weekBounds.end)) {
		// Only count if full completions meet target
		const fullCompletions = await getFullCompletionsInRange(
			habitId,
			weekBounds.start,
			weekBounds.end
		);
		if (fullCompletions >= target) {
			streak++;
		}
		// Continue checking for continuity regardless
		currentWeek.setDate(currentWeek.getDate() - 7);
		weekBounds = getWeekBounds(currentWeek, weekStartsOn);
	}

	return streak;
}

/**
 * Calculate streak and due-date for every-x-days interval habits.
 *
 * Streak logic:
 * - Each completion starts a new window of `intervalDays` days
 * - A window is "on time" if the next completion came within that window
 * - Any completion (full or partial) preserves continuity
 * - Only full completions increment the streak counter
 * - If the current window is overdue (dueInDays < 0), streak resets to 0
 *
 * dueInDays:
 * - Positive: completed this interval, X days left until next is due
 * - Zero: due today (not yet done)
 * - Negative: overdue by |dueInDays| days
 */
async function calculateIntervalStreak(habit: Habit): Promise<FlexibleStreakResult> {
	const habitId = habit.id!;
	const totalCompletions = await getTotalCompletions(habitId);

	// Get unique completion logs (any completion type preserves interval continuity)
	const allLogs = await db.logs.where('habitId').equals(habitId).toArray();
	const uniqueLogs = uniqueLogsByDateNewestFirst(allLogs);

	const today = getTodayDate();
	const todayMs = new Date(today + 'T00:00:00').getTime();
	const msPerDay = 24 * 60 * 60 * 1000;

	if (uniqueLogs.length === 0) {
		// No completions yet — due immediately
		return {
			streak: 0,
			periodProgress: 0,
			periodTarget: 1,
			periodType: 'day',
			totalCompletions,
			dueInDays: 0
		};
	}

	// Calculate next due date from last completion
	const latestLog = uniqueLogs[0];
	const lastMs = new Date(latestLog.date + 'T00:00:00').getTime();
	const latestIntervalDays = latestLog.windowIntervalDays ?? habit.schedule?.intervalDays ?? 7;
	const nextDueMs = lastMs + latestIntervalDays * msPerDay;
	const dueInDays = Math.round((nextDueMs - todayMs) / msPerDay);

	// completedThisInterval: already done and still within the window
	const completedThisInterval = dueInDays > 0;

	// Calculate streak of consecutive on-time completions
	let streak = 0;
	if (dueInDays < 0) {
		// Overdue — streak is broken
		streak = 0;
	} else if (uniqueLogs.length > 0) {
		// Count starting from most recent completion, with partials preserving continuity
		streak = latestLog.completionType === 'full' ? 1 : 0;
		for (let i = 0; i < uniqueLogs.length - 1; i++) {
			const newerLog = uniqueLogs[i];
			const olderLog = uniqueLogs[i + 1];
			const newerMs = new Date(newerLog.date + 'T00:00:00').getTime();
			const olderMs = new Date(olderLog.date + 'T00:00:00').getTime();
			const gapDays = Math.round((newerMs - olderMs) / msPerDay);
			const governingIntervalDays =
				olderLog.windowIntervalDays ?? habit.schedule?.intervalDays ?? 7;
			if (gapDays <= governingIntervalDays) {
				if (olderLog.completionType === 'full') {
					streak++;
				}
			} else {
				break; // Gap too large — consecutive chain broken
			}
		}
	}

	return {
		streak,
		periodProgress: completedThisInterval ? 1 : 0,
		periodTarget: 1,
		periodType: 'day',
		totalCompletions,
		dueInDays
	};
}

/**
 * Calculate flexible streak for a habit based on its frequency type
 * @param habit - The habit to calculate streak for (must have id)
 * @returns FlexibleStreakResult with all streak metrics
 */
export async function calculateFlexibleStreak(habit: Habit): Promise<FlexibleStreakResult> {
	const habitId = habit.id!;

	// every-x-days schedule: use interval-based calculation
	if (habit.schedule?.type === 'every-x-days') {
		return calculateIntervalStreak(habit);
	}

	// Determine effective frequency type (schedule takes precedence for backward compat)
	const effectiveType =
		habit.frequencyType ?? (habit.schedule?.type === 'weekly' ? 'weekly' : 'daily');
	const target = habit.frequencyTarget ?? habit.schedule?.timesPerWeek ?? 1;

	// Get total completions (works for both daily and weekly)
	const totalCompletions = await getTotalCompletions(habitId);

	if (effectiveType === 'daily') {
		const today = getTodayDate();

		// For multi-completion daily habits (target > 1)
		if (target > 1) {
			// Get completions for today
			const periodProgress = await getCompletionsForDate(habitId, today);

			// Calculate consecutive successful days (where target was met)
			const streak = await calculateDayStreak(habitId, target);

			return {
				streak,
				periodProgress,
				periodTarget: target,
				periodType: 'day',
				totalCompletions
			};
		} else {
			// Single-completion daily habits (backward compatible behavior)
			const streak = await calculateStreak(habitId);
			const completedToday = await isHabitCompletedOnDate(habitId, today);

			return {
				streak,
				periodProgress: completedToday ? 1 : 0,
				periodTarget: 1,
				periodType: 'day',
				totalCompletions
			};
		}
	} else {
		// Weekly habits: consecutive successful weeks
		const weekStartsOn = habit.weekStartsOn ?? 1;

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
