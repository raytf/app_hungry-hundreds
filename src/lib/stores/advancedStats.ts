/**
 * Advanced Statistics Store
 *
 * Computes six behavioral analytics metrics from local Dexie data.
 * All computation is client-side for offline-first architecture.
 *
 * @see docs/features/advanced-statistics-dashboard.md
 */
import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { liveQuery } from 'dexie';
import { db, formatDateLocal, type Habit, type HabitLog } from '$lib/db';
import { habits } from './habits';

// ============================================================================
// Types
// ============================================================================

export interface DayPattern {
	day: string;
	completionRate: number;
	avgCompletionHour: number;
	totalCompletions: number;
}

export interface DayTimeInsight {
	bestDay: string;
	worstDay: string;
	bestTimeWindow: 'morning' | 'afternoon' | 'evening' | 'night';
	insightText: string;
}

export interface RecoveryMetric {
	averageRecoveryDays: number;
	trend: 'improving' | 'steady' | 'declining';
	totalMisses: number;
	totalRecoveries: number;
}

export interface ConsistencyMetric {
	score: number;
	breakdown: {
		recency: number;
		frequency: number;
		regularity: number;
	};
	label: string;
}

export interface TrendMetric {
	direction: 'improving' | 'steady' | 'declining';
	percentageChange: number;
	recentRate: number;
	previousRate: number;
	arrow: '↗' | '→' | '↘';
}

export interface TimeToCompleteMetric {
	averageDelayMinutes: number;
	trend: 'faster' | 'stable' | 'slower';
	recentAvgMinutes: number;
	previousAvgMinutes: number;
	applicableHabits: number;
}

export interface NeverMissTwiceMetric {
	currentStreak: number;
	bestStreak: number;
	isActive: boolean;
}

export interface AdvancedStats {
	dayPatterns: { patterns: DayPattern[]; insight: DayTimeInsight };
	recoverySpeed: RecoveryMetric;
	consistencyScore: ConsistencyMetric;
	trendDirection: TrendMetric;
	timeToComplete: TimeToCompleteMetric;
	neverMissTwice: NeverMissTwiceMetric;
	isLoading: boolean;
	hasEnoughData: boolean;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultDayPatterns: DayPattern[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
	(day) => ({
		day,
		completionRate: 0,
		avgCompletionHour: 12,
		totalCompletions: 0
	})
);

const defaultInsight: DayTimeInsight = {
	bestDay: '',
	worstDay: '',
	bestTimeWindow: 'morning',
	insightText: 'Complete habits for a week to see patterns'
};

const defaultStats: AdvancedStats = {
	dayPatterns: { patterns: defaultDayPatterns, insight: defaultInsight },
	recoverySpeed: { averageRecoveryDays: 0, trend: 'steady', totalMisses: 0, totalRecoveries: 0 },
	consistencyScore: {
		score: 0,
		breakdown: { recency: 0, frequency: 0, regularity: 0 },
		label: 'Needs Work'
	},
	trendDirection: {
		direction: 'steady',
		percentageChange: 0,
		recentRate: 0,
		previousRate: 0,
		arrow: '→'
	},
	timeToComplete: {
		averageDelayMinutes: 0,
		trend: 'stable',
		recentAvgMinutes: 0,
		previousAvgMinutes: 0,
		applicableHabits: 0
	},
	neverMissTwice: { currentStreak: 0, bestStreak: 0, isActive: false },
	isLoading: true,
	hasEnoughData: false
};

// ============================================================================
// Metric Calculation Functions
// ============================================================================

function classifyTimeWindow(hour: number): 'morning' | 'afternoon' | 'evening' | 'night' {
	if (hour >= 5 && hour <= 11) return 'morning';
	if (hour >= 12 && hour <= 16) return 'afternoon';
	if (hour >= 17 && hour <= 20) return 'evening';
	return 'night';
}

function calculateDayPatterns(
	logs: HabitLog[],
	habitList: Habit[]
): { patterns: DayPattern[]; insight: DayTimeInsight } {
	const now = new Date();
	const thirtyDaysAgo = new Date(now);
	thirtyDaysAgo.setDate(now.getDate() - 30);
	const cutoff = formatDateLocal(thirtyDaysAgo);

	const recentLogs = logs.filter((log) => log.date >= cutoff);
	if (recentLogs.length < 7 || habitList.length === 0) {
		return { patterns: defaultDayPatterns, insight: defaultInsight };
	}

	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const dayBuckets: Map<number, { completions: number; hours: number[]; possibleDays: number }> =
		new Map();
	for (let i = 0; i < 7; i++) {
		dayBuckets.set(i, { completions: 0, hours: [], possibleDays: 0 });
	}

	// Count possible days per day-of-week in the 30-day window
	const checkDate = new Date(thirtyDaysAgo);
	while (checkDate <= now) {
		const bucket = dayBuckets.get(checkDate.getDay())!;
		bucket.possibleDays++;
		checkDate.setDate(checkDate.getDate() + 1);
	}

	// Aggregate completions by day-of-week
	for (const log of recentLogs) {
		const logDate = new Date(log.date + 'T00:00:00');
		const dayOfWeek = logDate.getDay();
		const bucket = dayBuckets.get(dayOfWeek)!;
		bucket.completions++;
		const hour = new Date(log.completedAt).getHours();
		bucket.hours.push(hour);
	}

	const patterns: DayPattern[] = [1, 2, 3, 4, 5, 6, 0].map((dayIdx) => {
		const bucket = dayBuckets.get(dayIdx)!;
		const possible = bucket.possibleDays * habitList.length;
		return {
			day: dayNames[dayIdx],
			completionRate: possible > 0 ? Math.round((bucket.completions / possible) * 100) : 0,
			avgCompletionHour:
				bucket.hours.length > 0
					? Math.round(bucket.hours.reduce((a, b) => a + b, 0) / bucket.hours.length)
					: 12,
			totalCompletions: bucket.completions
		};
	});

	// Find best/worst
	const sorted = [...patterns].sort((a, b) => b.completionRate - a.completionRate);
	const bestDay = sorted[0].day;
	const worstDay = sorted[sorted.length - 1].day;

	// Dominant time window from all hours
	const allHours = recentLogs.map((l) => new Date(l.completedAt).getHours());
	const windowCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
	for (const h of allHours) {
		windowCounts[classifyTimeWindow(h)]++;
	}
	const bestTimeWindow = (
		Object.entries(windowCounts) as [keyof typeof windowCounts, number][]
	).sort((a, b) => b[1] - a[1])[0][0];

	const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
	const isWeekdayStronger =
		patterns.filter((p) => weekdays.includes(p.day)).reduce((s, p) => s + p.completionRate, 0) / 5 >
		patterns.filter((p) => !weekdays.includes(p.day)).reduce((s, p) => s + p.completionRate, 0) / 2;

	const dayPart = isWeekdayStronger ? 'weekday' : 'weekend';
	const insightText = `You're strongest on ${dayPart} ${bestTimeWindow}s`;

	return {
		patterns,
		insight: { bestDay, worstDay, bestTimeWindow, insightText }
	};
}

function calculateRecoverySpeed(logs: HabitLog[], habitList: Habit[]): RecoveryMetric {
	if (habitList.length === 0) {
		return { averageRecoveryDays: 0, trend: 'steady', totalMisses: 0, totalRecoveries: 0 };
	}

	const now = new Date();
	const sixtyDaysAgo = new Date(now);
	sixtyDaysAgo.setDate(now.getDate() - 60);
	const cutoff = formatDateLocal(sixtyDaysAgo);
	const todayStr = formatDateLocal(now);

	const recentLogs = logs.filter((log) => log.date >= cutoff);
	if (recentLogs.length === 0) {
		return { averageRecoveryDays: 0, trend: 'steady', totalMisses: 0, totalRecoveries: 0 };
	}

	// Build completion dates set for each habit
	const completionsByHabit = new Map<number, Set<string>>();
	for (const log of recentLogs) {
		if (!completionsByHabit.has(log.habitId)) {
			completionsByHabit.set(log.habitId, new Set());
		}
		completionsByHabit.get(log.habitId)!.add(log.date);
	}

	let totalMisses = 0;
	let totalRecoveries = 0;
	const recoveryGaps: number[] = [];
	const recentRecoveryGaps: number[] = []; // last 14 days
	const previousRecoveryGaps: number[] = []; // 14-28 days ago

	const fourteenDaysAgo = new Date(now);
	fourteenDaysAgo.setDate(now.getDate() - 14);
	const fourteenDaysCutoff = formatDateLocal(fourteenDaysAgo);
	const twentyEightDaysAgo = new Date(now);
	twentyEightDaysAgo.setDate(now.getDate() - 28);
	const twentyEightDaysCutoff = formatDateLocal(twentyEightDaysAgo);

	for (const habit of habitList) {
		if (!habit.id) continue;
		const dates = completionsByHabit.get(habit.id) || new Set<string>();
		const startDate = new Date(Math.max(habit.createdAt, sixtyDaysAgo.getTime()));
		const checkDate = new Date(startDate);
		let gapLength = 0;

		while (formatDateLocal(checkDate) <= todayStr) {
			const dateStr = formatDateLocal(checkDate);
			if (!dates.has(dateStr)) {
				gapLength++;
				totalMisses++;
			} else if (gapLength > 0) {
				// Recovery found
				totalRecoveries++;
				recoveryGaps.push(gapLength);
				if (dateStr >= fourteenDaysCutoff) {
					recentRecoveryGaps.push(gapLength);
				} else if (dateStr >= twentyEightDaysCutoff) {
					previousRecoveryGaps.push(gapLength);
				}
				gapLength = 0;
			} else {
				gapLength = 0;
			}
			checkDate.setDate(checkDate.getDate() + 1);
		}
	}

	const averageRecoveryDays =
		recoveryGaps.length > 0
			? Math.round((recoveryGaps.reduce((a, b) => a + b, 0) / recoveryGaps.length) * 10) / 10
			: 0;

	// Determine trend
	let trend: 'improving' | 'steady' | 'declining' = 'steady';
	if (recentRecoveryGaps.length > 0 && previousRecoveryGaps.length > 0) {
		const recentAvg = recentRecoveryGaps.reduce((a, b) => a + b, 0) / recentRecoveryGaps.length;
		const prevAvg = previousRecoveryGaps.reduce((a, b) => a + b, 0) / previousRecoveryGaps.length;
		if (recentAvg < prevAvg - 0.3) trend = 'improving';
		else if (recentAvg > prevAvg + 0.3) trend = 'declining';
	}

	return { averageRecoveryDays, trend, totalMisses, totalRecoveries };
}

function calculateConsistencyScore(logs: HabitLog[], totalHabits: number): ConsistencyMetric {
	if (totalHabits === 0) {
		return {
			score: 0,
			breakdown: { recency: 0, frequency: 0, regularity: 0 },
			label: 'Needs Work'
		};
	}

	const now = new Date();
	const twentyEightDaysAgo = new Date(now);
	twentyEightDaysAgo.setDate(now.getDate() - 28);
	const cutoff = formatDateLocal(twentyEightDaysAgo);
	const todayStr = formatDateLocal(now);

	const recentLogs = logs.filter((log) => log.date >= cutoff && log.date <= todayStr);

	// Check minimum data
	const uniqueDates = new Set(recentLogs.map((l) => l.date));
	if (uniqueDates.size < 7) {
		return {
			score: 0,
			breakdown: { recency: 0, frequency: 0, regularity: 0 },
			label: 'Needs Work'
		};
	}

	// RECENCY (0-40 points): Weighted by week
	const weekCompletions = [0, 0, 0, 0]; // [most recent, ..., oldest]
	const weekPossible = [0, 0, 0, 0];
	for (let i = 0; i < 28; i++) {
		const d = new Date(now);
		d.setDate(now.getDate() - i);
		const dateStr = formatDateLocal(d);
		const weekIdx = Math.floor(i / 7);
		weekPossible[weekIdx] += totalHabits;
		const dayCompletions = recentLogs.filter((l) => l.date === dateStr).length;
		weekCompletions[weekIdx] += Math.min(dayCompletions, totalHabits);
	}

	const weights = [4, 3, 2, 1];
	let weightedSum = 0;
	let weightedPossible = 0;
	for (let i = 0; i < 4; i++) {
		if (weekPossible[i] > 0) {
			weightedSum += (weekCompletions[i] / weekPossible[i]) * weights[i];
			weightedPossible += weights[i];
		}
	}
	const recency = weightedPossible > 0 ? Math.round((weightedSum / weightedPossible) * 40) : 0;

	// FREQUENCY (0-35 points): Overall completion rate
	const totalPossible = 28 * totalHabits;
	const totalCompleted = Math.min(recentLogs.length, totalPossible);
	const frequency = totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 35) : 0;

	// REGULARITY (0-25 points): Low variance = higher score
	const dailyCounts: number[] = [];
	for (let i = 0; i < 28; i++) {
		const d = new Date(now);
		d.setDate(now.getDate() - i);
		const dateStr = formatDateLocal(d);
		dailyCounts.push(recentLogs.filter((l) => l.date === dateStr).length);
	}

	const mean = dailyCounts.reduce((a, b) => a + b, 0) / dailyCounts.length;
	const variance = dailyCounts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / dailyCounts.length;
	const stddev = Math.sqrt(variance);
	const regularity = Math.max(0, Math.round(25 - stddev * 10));

	const score = Math.min(100, recency + frequency + regularity);

	let label: string;
	if (score >= 90) label = 'Excellent';
	else if (score >= 70) label = 'Good';
	else if (score >= 40) label = 'Building';
	else label = 'Needs Work';

	return { score, breakdown: { recency, frequency, regularity }, label };
}

function calculateTrendDirection(logs: HabitLog[], totalHabits: number): TrendMetric {
	const defaultTrend: TrendMetric = {
		direction: 'steady',
		percentageChange: 0,
		recentRate: 0,
		previousRate: 0,
		arrow: '→'
	};
	if (totalHabits === 0) return defaultTrend;

	const now = new Date();
	const todayStr = formatDateLocal(now);

	// Recent period: last 14 days
	const fourteenDaysAgo = new Date(now);
	fourteenDaysAgo.setDate(now.getDate() - 13);
	const recentStart = formatDateLocal(fourteenDaysAgo);

	// Previous period: 14-27 days ago
	const twentyEightDaysAgo = new Date(now);
	twentyEightDaysAgo.setDate(now.getDate() - 27);
	const prevStart = formatDateLocal(twentyEightDaysAgo);

	const recentLogs = logs.filter((l) => l.date >= recentStart && l.date <= todayStr);
	const previousLogs = logs.filter((l) => l.date >= prevStart && l.date < recentStart);

	const recentPossible = 14 * totalHabits;
	const previousPossible = 14 * totalHabits;

	const recentRate =
		recentPossible > 0
			? Math.round((Math.min(recentLogs.length, recentPossible) / recentPossible) * 100)
			: 0;
	const previousRate =
		previousPossible > 0
			? Math.round((Math.min(previousLogs.length, previousPossible) / previousPossible) * 100)
			: 0;

	const percentageChange = recentRate - previousRate;
	let direction: 'improving' | 'steady' | 'declining';
	let arrow: '↗' | '→' | '↘';

	if (percentageChange > 5) {
		direction = 'improving';
		arrow = '↗';
	} else if (percentageChange < -5) {
		direction = 'declining';
		arrow = '↘';
	} else {
		direction = 'steady';
		arrow = '→';
	}

	return { direction, percentageChange, recentRate, previousRate, arrow };
}

function calculateTimeToComplete(logs: HabitLog[], habitList: Habit[]): TimeToCompleteMetric {
	const defaultMetric: TimeToCompleteMetric = {
		averageDelayMinutes: 0,
		trend: 'stable',
		recentAvgMinutes: 0,
		previousAvgMinutes: 0,
		applicableHabits: 0
	};

	// Filter habits with reminderTime
	const reminderHabits = habitList.filter((h) => h.reminderTime);
	if (reminderHabits.length === 0) return defaultMetric;

	const reminderHabitIds = new Set(reminderHabits.map((h) => h.id));
	const reminderTimeMap = new Map<number, string>();
	for (const h of reminderHabits) {
		if (h.id !== undefined) reminderTimeMap.set(h.id, h.reminderTime!);
	}

	const now = new Date();
	const fourteenDaysAgo = new Date(now);
	fourteenDaysAgo.setDate(now.getDate() - 14);
	const sevenDaysAgo = new Date(now);
	sevenDaysAgo.setDate(now.getDate() - 7);

	const cutoff = formatDateLocal(fourteenDaysAgo);
	const sevenDayCutoff = formatDateLocal(sevenDaysAgo);

	const relevantLogs = logs.filter((l) => l.date >= cutoff && reminderHabitIds.has(l.habitId));
	if (relevantLogs.length === 0)
		return { ...defaultMetric, applicableHabits: reminderHabits.length };

	const allDelays: number[] = [];
	const recentDelays: number[] = [];
	const previousDelays: number[] = [];

	for (const log of relevantLogs) {
		const reminderTime = reminderTimeMap.get(log.habitId);
		if (!reminderTime) continue;

		const [rHour, rMin] = reminderTime.split(':').map(Number);
		const reminderMinutes = rHour * 60 + rMin;

		const completedDate = new Date(log.completedAt);
		const completedMinutes = completedDate.getHours() * 60 + completedDate.getMinutes();

		let delay = completedMinutes - reminderMinutes;
		if (delay < 0) delay = 0; // Completed before reminder
		if (delay > 720) continue; // Skip next-day completions (>12hrs)

		allDelays.push(delay);
		if (log.date >= sevenDayCutoff) {
			recentDelays.push(delay);
		} else {
			previousDelays.push(delay);
		}
	}

	if (allDelays.length === 0) return { ...defaultMetric, applicableHabits: reminderHabits.length };

	const averageDelayMinutes = Math.round(allDelays.reduce((a, b) => a + b, 0) / allDelays.length);
	const recentAvgMinutes =
		recentDelays.length > 0
			? Math.round(recentDelays.reduce((a, b) => a + b, 0) / recentDelays.length)
			: averageDelayMinutes;
	const previousAvgMinutes =
		previousDelays.length > 0
			? Math.round(previousDelays.reduce((a, b) => a + b, 0) / previousDelays.length)
			: averageDelayMinutes;

	let trend: 'faster' | 'stable' | 'slower' = 'stable';
	if (recentDelays.length > 0 && previousDelays.length > 0) {
		if (recentAvgMinutes < previousAvgMinutes - 5) trend = 'faster';
		else if (recentAvgMinutes > previousAvgMinutes + 5) trend = 'slower';
	}

	return {
		averageDelayMinutes,
		trend,
		recentAvgMinutes,
		previousAvgMinutes,
		applicableHabits: reminderHabits.length
	};
}

function calculateNeverMissTwice(logs: HabitLog[], habitList: Habit[]): NeverMissTwiceMetric {
	if (habitList.length === 0) {
		return { currentStreak: 0, bestStreak: 0, isActive: false };
	}

	const now = new Date();
	const todayStr = formatDateLocal(now);

	// Cap analysis at 365 days for performance
	const maxDaysAgo = new Date(now);
	maxDaysAgo.setDate(now.getDate() - 365);

	// Build completion dates set for each habit
	const completionsByHabit = new Map<number, Set<string>>();
	for (const log of logs) {
		if (!completionsByHabit.has(log.habitId)) {
			completionsByHabit.set(log.habitId, new Set());
		}
		completionsByHabit.get(log.habitId)!.add(log.date);
	}

	// Find the earliest habit creation date (capped at 365 days ago)
	const earliestStart = Math.max(
		Math.min(...habitList.map((h) => h.createdAt)),
		maxDaysAgo.getTime()
	);

	const startDate = new Date(earliestStart);
	startDate.setHours(0, 0, 0, 0);

	let currentStreak = 0;
	let bestStreak = 0;
	let streak = 0;

	const checkDate = new Date(startDate);
	// Need at least 2 days to check "missed twice"
	checkDate.setDate(checkDate.getDate() + 1);

	while (formatDateLocal(checkDate) <= todayStr) {
		const dateStr = formatDateLocal(checkDate);
		const prevDate = new Date(checkDate);
		prevDate.setDate(prevDate.getDate() - 1);
		const prevDateStr = formatDateLocal(prevDate);

		let missedTwice = false;

		for (const habit of habitList) {
			if (!habit.id) continue;
			// Only count days after habit creation
			if (habit.createdAt > checkDate.getTime()) continue;

			// For weekly habits, skip daily checking
			if (habit.frequencyType === 'weekly') continue;

			const dates = completionsByHabit.get(habit.id) || new Set<string>();
			if (!dates.has(dateStr) && !dates.has(prevDateStr)) {
				missedTwice = true;
				break;
			}
		}

		if (missedTwice) {
			bestStreak = Math.max(bestStreak, streak);
			streak = 0;
		} else {
			streak++;
		}

		checkDate.setDate(checkDate.getDate() + 1);
	}

	bestStreak = Math.max(bestStreak, streak);
	currentStreak = streak;

	return {
		currentStreak,
		bestStreak,
		isActive: currentStreak > 0
	};
}

// ============================================================================
// Orchestrator: Compute all metrics from a single data fetch
// ============================================================================

function computeAllMetrics(logs: HabitLog[], habitList: Habit[]): AdvancedStats {
	const dayPatterns = calculateDayPatterns(logs, habitList);
	const recoverySpeed = calculateRecoverySpeed(logs, habitList);
	const consistencyScore = calculateConsistencyScore(logs, habitList.length);
	const trendDirection = calculateTrendDirection(logs, habitList.length);
	const timeToComplete = calculateTimeToComplete(logs, habitList);
	const neverMissTwice = calculateNeverMissTwice(logs, habitList);

	return {
		dayPatterns,
		recoverySpeed,
		consistencyScore,
		trendDirection,
		timeToComplete,
		neverMissTwice,
		isLoading: false,
		hasEnoughData: logs.length >= 7
	};
}

// ============================================================================
// Store Definition
// ============================================================================

const advancedStatsRefreshTrigger = writable(0);

export function refreshAdvancedStats() {
	advancedStatsRefreshTrigger.update((n) => n + 1);
}

/**
 * Reactive store for all logs in the last 60 days.
 * Uses liveQuery for automatic Dexie reactivity.
 */
const recentLogs = derived<typeof advancedStatsRefreshTrigger, HabitLog[]>(
	advancedStatsRefreshTrigger,
	($trigger, set) => {
		if (!browser) {
			set([]);
			return () => {};
		}

		const now = new Date();
		const sixtyDaysAgo = new Date(now);
		sixtyDaysAgo.setDate(now.getDate() - 60);
		const startDate = formatDateLocal(sixtyDaysAgo);
		const endDate = formatDateLocal(now);

		const subscription = liveQuery(() =>
			db.logs.where('date').between(startDate, endDate, true, true).toArray()
		).subscribe({
			next: (logs) => set(logs),
			error: (err) => console.error('[advancedStats] Logs query error:', err)
		});

		return () => subscription.unsubscribe();
	},
	[]
);

/**
 * Main advanced stats derived store.
 * Computes all 6 metrics from habits + recent logs.
 * Debounced to avoid rapid recomputation.
 */
export const advancedStats = derived<
	[typeof habits, typeof recentLogs, typeof advancedStatsRefreshTrigger],
	AdvancedStats
>(
	[habits, recentLogs, advancedStatsRefreshTrigger],
	([$habits, $recentLogs], set) => {
		if (!browser || $habits.length === 0) {
			set(defaultStats);
			return;
		}

		// Debounce computation by 300ms
		const timeout = setTimeout(() => {
			try {
				const result = computeAllMetrics($recentLogs, $habits);
				set(result);
			} catch (err) {
				console.error('[advancedStats] Computation error:', err);
				set({ ...defaultStats, isLoading: false });
			}
		}, 300);

		return () => clearTimeout(timeout);
	},
	defaultStats
);
