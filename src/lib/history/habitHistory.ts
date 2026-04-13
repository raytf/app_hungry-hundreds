import { formatDateLocal, getWeekBounds, type Habit, type HabitLog } from '$lib/db';
import type { PeriodRange } from '$lib/stores/periodStats';

export type IntervalWindowStatus = 'completed' | 'active' | 'missed';

export interface HabitChartPoint {
	label: string;
	completed: number;
	total: number;
	date: string;
	status?: IntervalWindowStatus;
}

export interface IntervalWindow {
	start: string;
	due: string;
	completedAt?: string;
	intervalDays: number;
	status: IntervalWindowStatus;
	completionType: HabitLog['completionType'];
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function addDays(date: string, days: number): string {
	const value = new Date(date + 'T00:00:00');
	value.setDate(value.getDate() + days);
	return formatDateLocal(value);
}

function overlapsPeriod(start: string, end: string, period: PeriodRange): boolean {
	return !(end < period.start || start > period.end);
}

function sortLogsOldestFirst(a: HabitLog, b: HabitLog): number {
	if (a.date === b.date) {
		return a.completedAt - b.completedAt;
	}

	return a.date.localeCompare(b.date);
}

function uniqueLogsByDateOldestFirst(logs: HabitLog[]): HabitLog[] {
	const logsByDate = new Map<string, HabitLog>();

	for (const log of [...logs].sort(sortLogsOldestFirst)) {
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

	return [...logsByDate.values()].sort(sortLogsOldestFirst);
}

function formatPointLabel(date: Date, count: number): string {
	if (count <= 7) return DAY_NAMES[date.getDay()];
	if (count <= 31) return String(date.getDate());
	return `${date.getMonth() + 1}/${date.getDate()}`;
}

function getLogsInPeriod(logs: HabitLog[], period: PeriodRange): HabitLog[] {
	return logs.filter((log) => log.date >= period.start && log.date <= period.end);
}

export function deriveIntervalWindows(
	habit: Habit,
	logs: HabitLog[],
	period: PeriodRange,
	today = formatDateLocal(new Date())
): IntervalWindow[] {
	if (habit.schedule.type !== 'every-x-days') return [];

	const intervalFallback = habit.schedule.intervalDays ?? 7;
	const uniqueLogs = uniqueLogsByDateOldestFirst(logs);

	return uniqueLogs
		.map((log, index) => {
			const intervalDays = log.windowIntervalDays ?? intervalFallback;
			const due = addDays(log.date, intervalDays);
			const nextLog = uniqueLogs[index + 1];

			if (nextLog && nextLog.date <= due) {
				return {
					start: log.date,
					due,
					completedAt: nextLog.date,
					intervalDays,
					status: 'completed' as const,
					completionType: log.completionType
				};
			}

			return {
				start: log.date,
				due,
				intervalDays,
				status: nextLog || due < today ? ('missed' as const) : ('active' as const),
				completionType: log.completionType
			};
		})
		.filter((window) => overlapsPeriod(window.start, window.due, period));
}

export function buildHabitChartData(
	habit: Habit,
	logs: HabitLog[],
	period: PeriodRange,
	today = formatDateLocal(new Date())
): HabitChartPoint[] {
	if (habit.schedule.type === 'every-x-days') {
		return deriveIntervalWindows(habit, logs, period, today).map((window) => ({
			label: window.start.slice(5),
			completed: 1,
			total: 1,
			date: window.start,
			status: window.status
		}));
	}

	if (habit.frequencyType === 'weekly' || habit.schedule.type === 'weekly') {
		const target = habit.frequencyTarget ?? habit.schedule.timesPerWeek ?? 1;
		const periodLogs = getLogsInPeriod(logs, period);
		const points: HabitChartPoint[] = [];
		const endDate = new Date(period.end + 'T00:00:00');
		let cursor = new Date(period.start + 'T00:00:00');

		while (cursor <= endDate) {
			const weekBounds = getWeekBounds(cursor, habit.weekStartsOn ?? 1);
			const bucketStart = weekBounds.start < period.start ? period.start : weekBounds.start;
			const bucketEnd = weekBounds.end > period.end ? period.end : weekBounds.end;
			const completed = periodLogs.filter(
				(log) => log.date >= bucketStart && log.date <= bucketEnd
			).length;

			points.push({
				label: weekBounds.start.slice(5),
				completed,
				total: target,
				date: bucketStart
			});

			cursor = new Date(bucketEnd + 'T00:00:00');
			cursor.setDate(cursor.getDate() + 1);
		}

		return points;
	}

	const target = habit.frequencyTarget ?? 1;
	const startDate = new Date(period.start + 'T00:00:00');
	const endDate = new Date(period.end + 'T00:00:00');
	const dayCount =
		Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
	const completionsByDate = new Map<string, number>();

	for (const log of getLogsInPeriod(logs, period)) {
		completionsByDate.set(log.date, (completionsByDate.get(log.date) ?? 0) + 1);
	}

	return Array.from({ length: dayCount }, (_, index) => {
		const date = new Date(startDate);
		date.setDate(date.getDate() + index);
		const dateString = formatDateLocal(date);
		return {
			label: formatPointLabel(date, dayCount),
			completed: completionsByDate.get(dateString) ?? 0,
			total: target,
			date: dateString
		};
	});
}