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
	getCompletedTodayMap
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
