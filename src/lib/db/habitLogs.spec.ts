/**
 * Unit tests for HabitLog operations and streak calculation
 *
 * Uses fake-indexeddb for Node.js testing of Dexie operations.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db, getTodayDate } from './db';
import { createHabit } from './habits';
import {
	logHabitCompletion,
	removeHabitCompletion,
	toggleHabitCompletion,
	isHabitCompletedOnDate,
	getHabitCompletionDates,
	getHabitLogsInRange,
	calculateStreak,
	calculateStreaksForHabits,
	getCompletedTodayMap,
	getCompletionsForDate,
	calculateDayStreak,
	calculateFlexibleStreak
} from './habitLogs';

describe('HabitLog Operations', () => {
	let habitId: number;

	beforeEach(async () => {
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
		// Create a test habit
		habitId = await createHabit({ name: 'Test Habit', emoji: '🧪', color: '#000' });
	});

	afterEach(async () => {
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
	});

	describe('logHabitCompletion', () => {
		it('should create a log entry and return its ID', async () => {
			const id = await logHabitCompletion(habitId, '2024-01-15');

			expect(id).toBeGreaterThan(0);
		});

		it('should store log with correct properties', async () => {
			const id = await logHabitCompletion(habitId, '2024-01-15');
			const log = await db.logs.get(id);

			expect(log).toBeDefined();
			expect(log!.habitId).toBe(habitId);
			expect(log!.date).toBe('2024-01-15');
			expect(log!.completedAt).toBeGreaterThan(0);
			expect(log!.synced).toBe(false);
		});

		it('should use today when no date provided', async () => {
			const id = await logHabitCompletion(habitId);
			const log = await db.logs.get(id);

			expect(log!.date).toBe(getTodayDate());
		});
	});

	describe('removeHabitCompletion', () => {
		it('should remove the log entry', async () => {
			await logHabitCompletion(habitId, '2024-01-15');
			const deleted = await removeHabitCompletion(habitId, '2024-01-15');

			expect(deleted).toBe(1);
			expect(await isHabitCompletedOnDate(habitId, '2024-01-15')).toBe(false);
		});

		it('should return 0 when no matching log exists', async () => {
			const deleted = await removeHabitCompletion(habitId, '2024-01-15');

			expect(deleted).toBe(0);
		});
	});

	describe('toggleHabitCompletion', () => {
		it('should add completion when not exists', async () => {
			const result = await toggleHabitCompletion(habitId, '2024-01-15');

			expect(result).toBe(true);
			expect(await isHabitCompletedOnDate(habitId, '2024-01-15')).toBe(true);
		});

		it('should remove completion when already exists', async () => {
			await logHabitCompletion(habitId, '2024-01-15');
			const result = await toggleHabitCompletion(habitId, '2024-01-15');

			expect(result).toBe(false);
			expect(await isHabitCompletedOnDate(habitId, '2024-01-15')).toBe(false);
		});
	});

	describe('isHabitCompletedOnDate', () => {
		it('should return false when not completed', async () => {
			const result = await isHabitCompletedOnDate(habitId, '2024-01-15');

			expect(result).toBe(false);
		});

		it('should return true when completed', async () => {
			await logHabitCompletion(habitId, '2024-01-15');
			const result = await isHabitCompletedOnDate(habitId, '2024-01-15');

			expect(result).toBe(true);
		});
	});

	describe('getHabitCompletionDates', () => {
		it('should return empty array when no completions', async () => {
			const dates = await getHabitCompletionDates(habitId);

			expect(dates).toEqual([]);
		});

		it('should return sorted dates', async () => {
			await logHabitCompletion(habitId, '2024-01-17');
			await logHabitCompletion(habitId, '2024-01-15');
			await logHabitCompletion(habitId, '2024-01-16');

			const dates = await getHabitCompletionDates(habitId);

			expect(dates).toEqual(['2024-01-15', '2024-01-16', '2024-01-17']);
		});
	});

	describe('getHabitLogsInRange', () => {
		it('should return logs within date range', async () => {
			await logHabitCompletion(habitId, '2024-01-14');
			await logHabitCompletion(habitId, '2024-01-15');
			await logHabitCompletion(habitId, '2024-01-16');
			await logHabitCompletion(habitId, '2024-01-17');

			const logs = await getHabitLogsInRange(habitId, '2024-01-15', '2024-01-16');

			expect(logs).toHaveLength(2);
			expect(logs.map((l) => l.date).sort()).toEqual(['2024-01-15', '2024-01-16']);
		});
	});
});

describe('Streak Calculation', () => {
	let habitId: number;

	// Helper to get date string relative to today
	function daysAgo(days: number): string {
		const date = new Date();
		date.setDate(date.getDate() - days);
		return date.toISOString().split('T')[0];
	}

	beforeEach(async () => {
		await db.habits.clear();
		await db.logs.clear();
		habitId = await createHabit({ name: 'Streak Test', emoji: '🔥', color: '#f00' });
	});

	afterEach(async () => {
		await db.habits.clear();
		await db.logs.clear();
	});

	describe('calculateStreak', () => {
		it('should return 0 when no completions', async () => {
			const streak = await calculateStreak(habitId);

			expect(streak).toBe(0);
		});

		it('should return 1 when only completed today', async () => {
			await logHabitCompletion(habitId, daysAgo(0)); // today

			const streak = await calculateStreak(habitId);

			expect(streak).toBe(1);
		});

		it('should count consecutive days including today', async () => {
			await logHabitCompletion(habitId, daysAgo(2));
			await logHabitCompletion(habitId, daysAgo(1));
			await logHabitCompletion(habitId, daysAgo(0)); // today

			const streak = await calculateStreak(habitId);

			expect(streak).toBe(3);
		});

		it('should start from yesterday if today not completed', async () => {
			await logHabitCompletion(habitId, daysAgo(2));
			await logHabitCompletion(habitId, daysAgo(1)); // yesterday
			// Note: today not completed

			const streak = await calculateStreak(habitId);

			expect(streak).toBe(2);
		});

		it('should return 0 if streak is broken', async () => {
			await logHabitCompletion(habitId, daysAgo(3));
			// Gap on daysAgo(2) and daysAgo(1), and today not completed

			const streak = await calculateStreak(habitId);

			expect(streak).toBe(0);
		});

		it('should handle gaps correctly', async () => {
			await logHabitCompletion(habitId, daysAgo(5)); // old isolated day
			await logHabitCompletion(habitId, daysAgo(1)); // yesterday
			await logHabitCompletion(habitId, daysAgo(0)); // today

			const streak = await calculateStreak(habitId);

			expect(streak).toBe(2); // Only yesterday and today are consecutive
		});
	});

	describe('calculateStreaksForHabits', () => {
		it('should calculate streaks for multiple habits', async () => {
			const habitId2 = await createHabit({ name: 'Second', emoji: '2️⃣', color: '#00f' });

			await logHabitCompletion(habitId, daysAgo(0)); // 1-day streak
			await logHabitCompletion(habitId2, daysAgo(1));
			await logHabitCompletion(habitId2, daysAgo(0)); // 2-day streak

			const streaks = await calculateStreaksForHabits([habitId, habitId2]);

			expect(streaks.get(habitId)).toBe(1);
			expect(streaks.get(habitId2)).toBe(2);
		});
	});

	describe('getCompletedTodayMap', () => {
		it('should return completion status for multiple habits', async () => {
			const habitId2 = await createHabit({ name: 'Second', emoji: '2️⃣', color: '#00f' });
			const today = getTodayDate();

			await logHabitCompletion(habitId, today);
			// habitId2 not completed

			const completedMap = await getCompletedTodayMap([habitId, habitId2]);

			expect(completedMap.get(habitId)).toBe(true);
			expect(completedMap.get(habitId2)).toBe(false);
		});
	});
});

// ============================================================================
// Multi-Completion Daily Habits Tests
// ============================================================================

describe('Multi-Completion Daily Habits', () => {
	// Helper to get date string relative to today
	function daysAgo(days: number): string {
		const date = new Date();
		date.setDate(date.getDate() - days);
		return date.toISOString().split('T')[0];
	}

	beforeEach(async () => {
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
	});

	afterEach(async () => {
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
	});

	describe('getCompletionsForDate', () => {
		it('should return 0 when no completions exist', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 8
			});

			const count = await getCompletionsForDate(habitId, daysAgo(0));

			expect(count).toBe(0);
		});

		it('should count multiple completions on the same date', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 8
			});

			// Log 5 completions for today
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));

			const count = await getCompletionsForDate(habitId, daysAgo(0));

			expect(count).toBe(5);
		});

		it('should only count completions for the specified date', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 8
			});

			// Log completions on different days
			await logHabitCompletion(habitId, daysAgo(0)); // today
			await logHabitCompletion(habitId, daysAgo(0)); // today
			await logHabitCompletion(habitId, daysAgo(1)); // yesterday

			const todayCount = await getCompletionsForDate(habitId, daysAgo(0));
			const yesterdayCount = await getCompletionsForDate(habitId, daysAgo(1));

			expect(todayCount).toBe(2);
			expect(yesterdayCount).toBe(1);
		});
	});

	describe('calculateDayStreak', () => {
		it('should return 0 when no completions exist', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 3
			});

			const streak = await calculateDayStreak(habitId, 3);

			expect(streak).toBe(0);
		});

		it('should return 0 when target not met today or yesterday', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 3
			});

			// Only 2 completions today (target is 3)
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));

			const streak = await calculateDayStreak(habitId, 3);

			expect(streak).toBe(0);
		});

		it('should return 1 when target met only today', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 3
			});

			// 3 completions today (target met)
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));

			const streak = await calculateDayStreak(habitId, 3);

			expect(streak).toBe(1);
		});

		it('should count consecutive days where target was met', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 2
			});

			// Day 0 (today): 2 completions (target met)
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));

			// Day 1 (yesterday): 3 completions (target exceeded)
			await logHabitCompletion(habitId, daysAgo(1));
			await logHabitCompletion(habitId, daysAgo(1));
			await logHabitCompletion(habitId, daysAgo(1));

			// Day 2: 2 completions (target met)
			await logHabitCompletion(habitId, daysAgo(2));
			await logHabitCompletion(habitId, daysAgo(2));

			const streak = await calculateDayStreak(habitId, 2);

			expect(streak).toBe(3);
		});

		it('should break streak when target not met on a day', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 3
			});

			// Day 0 (today): 3 completions (target met)
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));

			// Day 1 (yesterday): only 1 completion (target NOT met - breaks streak)
			await logHabitCompletion(habitId, daysAgo(1));

			// Day 2: 3 completions (target met, but streak already broken)
			await logHabitCompletion(habitId, daysAgo(2));
			await logHabitCompletion(habitId, daysAgo(2));
			await logHabitCompletion(habitId, daysAgo(2));

			const streak = await calculateDayStreak(habitId, 3);

			expect(streak).toBe(1); // Only today counts
		});

		it('should start from yesterday if today target not met', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 2
			});

			// Day 0 (today): only 1 completion (target NOT met)
			await logHabitCompletion(habitId, daysAgo(0));

			// Day 1 (yesterday): 2 completions (target met)
			await logHabitCompletion(habitId, daysAgo(1));
			await logHabitCompletion(habitId, daysAgo(1));

			// Day 2: 2 completions (target met)
			await logHabitCompletion(habitId, daysAgo(2));
			await logHabitCompletion(habitId, daysAgo(2));

			const streak = await calculateDayStreak(habitId, 2);

			expect(streak).toBe(2); // Yesterday and day before
		});
	});

	describe('toggleHabitCompletion for multi-daily habits', () => {
		it('should add completions up to target', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 3
			});
			const today = daysAgo(0);

			// First toggle: 1/3
			const result1 = await toggleHabitCompletion(habitId, today);
			expect(result1).toBe(false); // Target not met yet
			expect(await getCompletionsForDate(habitId, today)).toBe(1);

			// Second toggle: 2/3
			const result2 = await toggleHabitCompletion(habitId, today);
			expect(result2).toBe(false); // Target not met yet
			expect(await getCompletionsForDate(habitId, today)).toBe(2);

			// Third toggle: 3/3
			const result3 = await toggleHabitCompletion(habitId, today);
			expect(result3).toBe(true); // Target met!
			expect(await getCompletionsForDate(habitId, today)).toBe(3);
		});

		it('should remove completion when target already met', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 2
			});
			const today = daysAgo(0);

			// Add 2 completions to meet target
			await toggleHabitCompletion(habitId, today);
			await toggleHabitCompletion(habitId, today);
			expect(await getCompletionsForDate(habitId, today)).toBe(2);

			// Toggle again should remove one
			const result = await toggleHabitCompletion(habitId, today);
			expect(result).toBe(false); // Target no longer met
			expect(await getCompletionsForDate(habitId, today)).toBe(1);
		});

		it('should allow re-adding after removing', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 2
			});
			const today = daysAgo(0);

			// Meet target
			await toggleHabitCompletion(habitId, today);
			await toggleHabitCompletion(habitId, today);

			// Remove one
			await toggleHabitCompletion(habitId, today);
			expect(await getCompletionsForDate(habitId, today)).toBe(1);

			// Add back
			const result = await toggleHabitCompletion(habitId, today);
			expect(result).toBe(true); // Target met again
			expect(await getCompletionsForDate(habitId, today)).toBe(2);
		});
	});

	describe('getCompletedTodayMap for weekly habits', () => {
		it('should return false when weekly habit has week progress but no completion today', async () => {
			// This is the bug scenario: Gym 3x/week with 2/3 completions this week
			// but none of those completions are for today
			const habitId = await createHabit({
				name: 'Gym',
				emoji: '🏋️',
				color: '#22c55e',
				frequencyType: 'weekly',
				frequencyTarget: 3,
				weekStartsOn: 1
			});

			// Add completions for earlier days this week (not today)
			await logHabitCompletion(habitId, daysAgo(1)); // yesterday
			await logHabitCompletion(habitId, daysAgo(2)); // 2 days ago

			const result = await getCompletedTodayMap([habitId]);

			// Should be false because no completion exists for TODAY
			expect(result.get(habitId)).toBe(false);
		});

		it('should return true when weekly habit has completion today', async () => {
			const habitId = await createHabit({
				name: 'Gym',
				emoji: '🏋️',
				color: '#22c55e',
				frequencyType: 'weekly',
				frequencyTarget: 3,
				weekStartsOn: 1
			});

			// Add completions including one for today
			await logHabitCompletion(habitId, daysAgo(1)); // yesterday
			await logHabitCompletion(habitId, daysAgo(0)); // today

			const result = await getCompletedTodayMap([habitId]);

			// Should be true because there IS a completion for today
			expect(result.get(habitId)).toBe(true);
		});

		it('should correctly distinguish daily vs weekly habit completedToday logic', async () => {
			// Daily habit: completedToday = target met for the day
			const dailyHabitId = await createHabit({
				name: 'Meditate',
				emoji: '🧘',
				color: '#8b5cf6',
				frequencyType: 'daily',
				frequencyTarget: 1
			});

			// Weekly habit: completedToday = has log for today (regardless of week progress)
			const weeklyHabitId = await createHabit({
				name: 'Gym',
				emoji: '🏋️',
				color: '#22c55e',
				frequencyType: 'weekly',
				frequencyTarget: 3,
				weekStartsOn: 1
			});

			// Daily habit: not completed today
			// Weekly habit: has week progress but not completed today
			await logHabitCompletion(weeklyHabitId, daysAgo(1));
			await logHabitCompletion(weeklyHabitId, daysAgo(2));

			const result = await getCompletedTodayMap([dailyHabitId, weeklyHabitId]);

			expect(result.get(dailyHabitId)).toBe(false); // No completion today
			expect(result.get(weeklyHabitId)).toBe(false); // Week progress exists but not today
		});
	});

	describe('calculateFlexibleStreak for multi-daily habits', () => {
		it('should return correct periodProgress for today', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 5
			});

			// Add 3 completions today
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));

			const habit = await db.habits.get(habitId);
			const result = await calculateFlexibleStreak(habit!);

			expect(result.periodProgress).toBe(3);
			expect(result.periodTarget).toBe(5);
			expect(result.periodType).toBe('day');
			expect(result.streak).toBe(0); // Target not met today
		});

		it('should calculate streak based on days where target was met', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 2
			});

			// Today: 2 completions (target met)
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));

			// Yesterday: 2 completions (target met)
			await logHabitCompletion(habitId, daysAgo(1));
			await logHabitCompletion(habitId, daysAgo(1));

			const habit = await db.habits.get(habitId);
			const result = await calculateFlexibleStreak(habit!);

			expect(result.streak).toBe(2);
			expect(result.periodProgress).toBe(2);
			expect(result.periodTarget).toBe(2);
		});

		it('should count total completions correctly', async () => {
			const habitId = await createHabit({
				name: 'Water',
				emoji: '💧',
				color: '#00f',
				frequencyType: 'daily',
				frequencyTarget: 3
			});

			// Add completions across multiple days
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(0));
			await logHabitCompletion(habitId, daysAgo(1));
			await logHabitCompletion(habitId, daysAgo(1));
			await logHabitCompletion(habitId, daysAgo(1));
			await logHabitCompletion(habitId, daysAgo(2));

			const habit = await db.habits.get(habitId);
			const result = await calculateFlexibleStreak(habit!);

			expect(result.totalCompletions).toBe(6);
		});
	});
});
