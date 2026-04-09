/**
 * Period Stats Store
 *
 * Provides reactive habit completion statistics for a user-selected date range.
 * Defaults to the last 7 days. Supports Yesterday, 7 Days, 30 Days, and Custom presets.
 *
 * @see docs/features/journey-period-filter.md
 */
import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { liveQuery } from 'dexie';
import { db, formatDateLocal, type Habit, type HabitLog } from '$lib/db';
import { habits } from './habits';

// ============================================================================
// Types
// ============================================================================

export type PeriodPreset = 'day' | '7days' | '30days' | 'custom';

export interface PeriodRange {
	preset: PeriodPreset;
	start: string; // YYYY-MM-DD
	end: string; // YYYY-MM-DD
}

export interface PeriodDataPoint {
	label: string;
	completed: number;
	total: number;
	date: string; // YYYY-MM-DD
}

export interface PeriodStats {
	chartData: PeriodDataPoint[];
	completionRate: number;
	totalCompleted: number;
	totalPossible: number;
	daysInRange: number;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Compute the start/end date strings for a given preset (relative to today).
 * 'custom' is not handled here – callers must supply their own dates.
 */
export function getPresetRange(preset: Exclude<PeriodPreset, 'custom'>): {
	start: string;
	end: string;
} {
	const today = new Date();
	const end = formatDateLocal(today);

	if (preset === 'day') {
		const d = new Date(today);
		d.setDate(d.getDate() - 1);
		const start = formatDateLocal(d);
		return { start, end: start };
	}

	const daysBack = preset === '7days' ? 6 : 29;
	const d = new Date(today);
	d.setDate(d.getDate() - daysBack);
	return { start: formatDateLocal(d), end };
}

function buildChartData(
	logs: HabitLog[],
	habitList: Habit[],
	start: string,
	end: string
): PeriodDataPoint[] {
	const startDate = new Date(start + 'T00:00:00');
	const endDate = new Date(end + 'T00:00:00');
	const dayCount =
		Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	const totalHabits = habitList.length;
	const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	// date → set of habitIds completed on that day
	const completedByDate = new Map<string, Set<number>>();
	for (const log of logs) {
		if (!completedByDate.has(log.date)) completedByDate.set(log.date, new Set());
		completedByDate.get(log.date)!.add(log.habitId);
	}

	if (dayCount <= 31) {
		// One bar per day
		return Array.from({ length: dayCount }, (_, i) => {
			const d = new Date(startDate);
			d.setDate(d.getDate() + i);
			const date = formatDateLocal(d);
			const completed = completedByDate.get(date)?.size ?? 0;
			const label = dayCount <= 7 ? DAY_NAMES[d.getDay()] : String(d.getDate());
			return { label, completed, total: totalHabits, date };
		});
	}

	// One bar per calendar week
	const points: PeriodDataPoint[] = [];
	const cursor = new Date(startDate);
	while (cursor <= endDate) {
		const weekEnd = new Date(cursor);
		weekEnd.setDate(cursor.getDate() + 6);
		if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());

		let weekCompleted = 0;
		let weekPossible = 0;
		const inner = new Date(cursor);
		while (inner <= weekEnd) {
			const date = formatDateLocal(inner);
			weekCompleted += completedByDate.get(date)?.size ?? 0;
			weekPossible += totalHabits;
			inner.setDate(inner.getDate() + 1);
		}

		const label = `${cursor.getMonth() + 1}/${cursor.getDate()}`;
		points.push({ label, completed: weekCompleted, total: weekPossible, date: formatDateLocal(cursor) });
		cursor.setDate(cursor.getDate() + 7);
	}
	return points;
}

// ============================================================================
// Stores
// ============================================================================

const defaultPreset = getPresetRange('7days');

/** The active period. Update this to change what all period-derived stores compute. */
export const selectedPeriod = writable<PeriodRange>({ preset: '7days', ...defaultPreset });

/** Raw logs for the selected period, reactively updated via Dexie liveQuery. */
const periodLogs = derived<typeof selectedPeriod, HabitLog[]>(
	selectedPeriod,
	($period, set) => {
		if (!browser) {
			set([]);
			return () => {};
		}
		const subscription = liveQuery(() =>
			db.logs.filter((log) => log.date >= $period.start && log.date <= $period.end).toArray()
		).subscribe({
			next: (logs) => set(logs),
			error: (err) => console.error('[periodStats] LiveQuery error:', err)
		});
		return () => subscription.unsubscribe();
	},
	[]
);

/** Computed stats for the selected period. */
export const periodStats = derived<
	[typeof periodLogs, typeof habits, typeof selectedPeriod],
	PeriodStats
>([periodLogs, habits, selectedPeriod], ([$periodLogs, $habits, $period]) => {
	const chartData = buildChartData($periodLogs, $habits, $period.start, $period.end);
	const totalCompleted = chartData.reduce((s, d) => s + d.completed, 0);
	const totalPossible = chartData.reduce((s, d) => s + d.total, 0);
	const completionRate = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;
	const startDate = new Date($period.start + 'T00:00:00');
	const endDate = new Date($period.end + 'T00:00:00');
	const daysInRange =
		Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	return { chartData, completionRate, totalCompleted, totalPossible, daysInRange };
});
