/**
 * Stats Store
 *
 * Computes weekly statistics from actual HabitLog data.
 * Provides reactive weekly chart data and completion rates.
 *
 * @see docs/API.md for data model documentation
 */
import { derived, readable, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { liveQuery } from 'dexie';
import { db, type HabitLog, type Habit } from '$lib/db';
import { habits } from './habits';

// ============================================================================
// Types
// ============================================================================

export interface WeeklyDataPoint {
	day: string;
	completed: number;
	total: number;
}

export interface Stats {
	completionRate: number;
	weeklyData: WeeklyDataPoint[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get date string in YYYY-MM-DD format
 */
function formatDate(date: Date): string {
	return date.toISOString().split('T')[0];
}

/**
 * Get the start of the current week (Monday)
 */
function getWeekStart(): Date {
	const now = new Date();
	const day = now.getDay();
	const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
	const monday = new Date(now);
	monday.setDate(diff);
	monday.setHours(0, 0, 0, 0);
	return monday;
}

/**
 * Get array of dates for the current week (Mon-Sun)
 */
function getWeekDates(): { date: Date; dayName: string }[] {
	const monday = getWeekStart();
	const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

	return days.map((dayName, i) => {
		const date = new Date(monday);
		date.setDate(monday.getDate() + i);
		return { date, dayName };
	});
}

// ============================================================================
// Refresh Trigger
// ============================================================================

const statsRefreshTrigger = writable(0);

export function refreshStats() {
	statsRefreshTrigger.update((n) => n + 1);
}

// ============================================================================
// Weekly Logs Store
// ============================================================================

/**
 * Raw logs from the current week
 *
 * Uses a derived store from statsRefreshTrigger to ensure dates are recalculated
 * when the refresh is triggered (e.g., on app load or day change).
 */
const weeklyLogs = derived<typeof statsRefreshTrigger, HabitLog[]>(
	statsRefreshTrigger,
	($trigger, set) => {
		if (!browser) {
			set([]);
			return () => { };
		}

		// Recalculate dates each time the trigger fires
		const weekStart = formatDate(getWeekStart());
		const today = formatDate(new Date());

		const subscription = liveQuery(() =>
			db.logs.filter((log) => log.date >= weekStart && log.date <= today).toArray()
		).subscribe({
			next: (logs) => set(logs),
			error: (err) => console.error('[stats] Weekly logs error:', err)
		});

		return () => subscription.unsubscribe();
	},
	[]
);

// ============================================================================
// Stats Store
// ============================================================================

/**
 * Reactive stats store derived from habits and weekly logs
 */
export const stats = derived<
	[typeof habits, typeof weeklyLogs, typeof statsRefreshTrigger],
	Stats
>([habits, weeklyLogs, statsRefreshTrigger], ([$habits, $weeklyLogs]) => {
	const weekDates = getWeekDates();
	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const totalHabits = $habits.length;

	// Create a set of completed (habitId, date) pairs for fast lookup
	const completedSet = new Set($weeklyLogs.map((log) => `${log.habitId}:${log.date}`));

	// Build weekly data
	const weeklyData: WeeklyDataPoint[] = weekDates.map(({ date, dayName }) => {
		const dateStr = formatDate(date);

		// Only count days up to and including today
		if (date > today) {
			return { day: dayName, completed: 0, total: 0 };
		}

		// Count completions for this date
		const completed = $habits.filter((h) => completedSet.has(`${h.id}:${dateStr}`)).length;

		return {
			day: dayName,
			completed,
			total: totalHabits
		};
	});

	// Calculate overall completion rate for the week
	const daysWithData = weeklyData.filter((d) => d.total > 0);
	const totalPossible = daysWithData.reduce((sum, d) => sum + d.total, 0);
	const totalCompleted = daysWithData.reduce((sum, d) => sum + d.completed, 0);
	const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

	return {
		completionRate,
		weeklyData
	};
});

/**
 * Just the weekly data for the chart
 */
export const weeklyData = derived(stats, ($stats) => $stats.weeklyData);

/**
 * Just the completion rate
 */
export const completionRate = derived(stats, ($stats) => $stats.completionRate);

