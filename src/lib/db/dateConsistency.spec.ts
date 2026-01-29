/**
 * Date Consistency Tests
 *
 * Ensures that the date used for habit tracking and streaks
 * matches the date displayed in the UI. This prevents timezone
 * bugs where habits reset at the wrong time.
 *
 * The bug: Using toISOString() returns UTC dates, but the UI
 * displays local dates. At midnight local time, these can differ
 * by up to a full day depending on timezone.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db, getTodayDate } from './db';
import { createHabit } from './habits';
import {
	logHabitCompletion,
	isHabitCompletedOnDate,
	calculateStreak,
	getCompletedTodayMap
} from './habitLogs';

/**
 * Helper to format a Date the same way the UI does for comparison
 * This extracts just the day number from the locale string
 */
function getUIDate(date: Date): { year: number; month: number; day: number } {
	return {
		year: date.getFullYear(),
		month: date.getMonth() + 1,
		day: date.getDate()
	};
}

/**
 * Parse YYYY-MM-DD string into components
 */
function parseYMD(dateStr: string): { year: number; month: number; day: number } {
	const [year, month, day] = dateStr.split('-').map(Number);
	return { year, month, day };
}

describe('Date Consistency', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('getTodayDate matches UI date', () => {
		it('should return the same date as displayed in UI at noon', () => {
			// Noon - should be unambiguous in any timezone
			const testDate = new Date(2025, 5, 15, 12, 0, 0); // June 15, 2025 at noon
			vi.setSystemTime(testDate);

			const dbDate = parseYMD(getTodayDate());
			const uiDate = getUIDate(testDate);

			expect(dbDate.year).toBe(uiDate.year);
			expect(dbDate.month).toBe(uiDate.month);
			expect(dbDate.day).toBe(uiDate.day);
		});

		it('should return the same date as displayed in UI at midnight', () => {
			// Midnight - the critical edge case
			const testDate = new Date(2025, 5, 15, 0, 0, 0); // June 15, 2025 at midnight
			vi.setSystemTime(testDate);

			const dbDate = parseYMD(getTodayDate());
			const uiDate = getUIDate(testDate);

			expect(dbDate.year).toBe(uiDate.year);
			expect(dbDate.month).toBe(uiDate.month);
			expect(dbDate.day).toBe(uiDate.day);
		});

		it('should return the same date as displayed in UI at 11:59 PM', () => {
			// Just before midnight - another edge case
			const testDate = new Date(2025, 5, 15, 23, 59, 59); // June 15, 2025 at 11:59:59 PM
			vi.setSystemTime(testDate);

			const dbDate = parseYMD(getTodayDate());
			const uiDate = getUIDate(testDate);

			expect(dbDate.year).toBe(uiDate.year);
			expect(dbDate.month).toBe(uiDate.month);
			expect(dbDate.day).toBe(uiDate.day);
		});

		it('should return the same date as displayed in UI at 12:01 AM', () => {
			// Just after midnight
			const testDate = new Date(2025, 5, 15, 0, 1, 0); // June 15, 2025 at 12:01 AM
			vi.setSystemTime(testDate);

			const dbDate = parseYMD(getTodayDate());
			const uiDate = getUIDate(testDate);

			expect(dbDate.year).toBe(uiDate.year);
			expect(dbDate.month).toBe(uiDate.month);
			expect(dbDate.day).toBe(uiDate.day);
		});
	});

	describe('getTodayDate format', () => {
		it('should return date in YYYY-MM-DD format', () => {
			const testDate = new Date(2025, 0, 5, 12, 0, 0); // Jan 5, 2025
			vi.setSystemTime(testDate);

			const result = getTodayDate();

			expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
			expect(result).toBe('2025-01-05');
		});

		it('should zero-pad single digit months', () => {
			const testDate = new Date(2025, 2, 15, 12, 0, 0); // March 15, 2025
			vi.setSystemTime(testDate);

			const result = getTodayDate();

			expect(result).toBe('2025-03-15');
		});

		it('should zero-pad single digit days', () => {
			const testDate = new Date(2025, 11, 7, 12, 0, 0); // Dec 7, 2025
			vi.setSystemTime(testDate);

			const result = getTodayDate();

			expect(result).toBe('2025-12-07');
		});
	});

	describe('Year boundary handling', () => {
		it('should handle New Years Eve at 11:59 PM correctly', () => {
			const testDate = new Date(2025, 11, 31, 23, 59, 59); // Dec 31, 2025 at 11:59:59 PM
			vi.setSystemTime(testDate);

			const dbDate = parseYMD(getTodayDate());
			const uiDate = getUIDate(testDate);

			expect(dbDate.year).toBe(2025);
			expect(dbDate.month).toBe(12);
			expect(dbDate.day).toBe(31);
			expect(dbDate).toEqual(uiDate);
		});

		it('should handle New Years Day at 12:01 AM correctly', () => {
			const testDate = new Date(2026, 0, 1, 0, 1, 0); // Jan 1, 2026 at 12:01 AM
			vi.setSystemTime(testDate);

			const dbDate = parseYMD(getTodayDate());
			const uiDate = getUIDate(testDate);

			expect(dbDate.year).toBe(2026);
			expect(dbDate.month).toBe(1);
			expect(dbDate.day).toBe(1);
			expect(dbDate).toEqual(uiDate);
		});
	});
});

describe('Habit Completion Date Consistency', () => {
	let habitId: number;

	beforeEach(async () => {
		vi.useRealTimers();
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
		habitId = await createHabit({ name: 'Test Habit', emoji: '🧪', color: '#000' });
	});

	afterEach(async () => {
		vi.useRealTimers();
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
	});

	describe('Habit completion at midnight boundary', () => {
		it('should mark habit as completed today when logged at midnight', async () => {
			// Set time to midnight
			const midnight = new Date(2025, 5, 15, 0, 0, 0);
			vi.setSystemTime(midnight);

			// Log completion (uses getTodayDate internally)
			await logHabitCompletion(habitId);

			// Check it's completed for today's date
			const isCompleted = await isHabitCompletedOnDate(habitId);
			expect(isCompleted).toBe(true);

			// Verify the logged date matches what UI would show
			const uiDate = getUIDate(midnight);
			const expectedDateStr = `${uiDate.year}-${String(uiDate.month).padStart(2, '0')}-${String(uiDate.day).padStart(2, '0')}`;
			const isCompletedForUIDate = await isHabitCompletedOnDate(habitId, expectedDateStr);
			expect(isCompletedForUIDate).toBe(true);
		});

		it('should mark habit as completed today when logged at 11:59 PM', async () => {
			const lateNight = new Date(2025, 5, 15, 23, 59, 59);
			vi.setSystemTime(lateNight);

			await logHabitCompletion(habitId);

			const isCompleted = await isHabitCompletedOnDate(habitId);
			expect(isCompleted).toBe(true);

			// Verify the logged date matches what UI would show
			const uiDate = getUIDate(lateNight);
			const expectedDateStr = `${uiDate.year}-${String(uiDate.month).padStart(2, '0')}-${String(uiDate.day).padStart(2, '0')}`;
			const isCompletedForUIDate = await isHabitCompletedOnDate(habitId, expectedDateStr);
			expect(isCompletedForUIDate).toBe(true);
		});
	});

	describe('Streak calculation at midnight boundary', () => {
		it('should count streak correctly when checking at midnight', async () => {
			// Log completions for 3 consecutive days
			vi.setSystemTime(new Date(2025, 5, 13, 12, 0, 0));
			await logHabitCompletion(habitId);

			vi.setSystemTime(new Date(2025, 5, 14, 12, 0, 0));
			await logHabitCompletion(habitId);

			vi.setSystemTime(new Date(2025, 5, 15, 12, 0, 0));
			await logHabitCompletion(habitId);

			// Check streak at midnight of the 15th (should still be 3)
			vi.setSystemTime(new Date(2025, 5, 15, 0, 0, 1));
			// Note: We logged at noon on the 15th, so at midnight the 15th isn't logged yet
			// Let's re-log at midnight
			await db.logs.clear();
			await db.syncQueue.clear();

			vi.setSystemTime(new Date(2025, 5, 13, 0, 0, 1));
			await logHabitCompletion(habitId);

			vi.setSystemTime(new Date(2025, 5, 14, 0, 0, 1));
			await logHabitCompletion(habitId);

			vi.setSystemTime(new Date(2025, 5, 15, 0, 0, 1));
			await logHabitCompletion(habitId);

			const streak = await calculateStreak(habitId);
			expect(streak).toBe(3);
		});

		it('should reset streak at midnight when day changes', async () => {
			// Log completion on June 14
			vi.setSystemTime(new Date(2025, 5, 14, 23, 59, 0));
			await logHabitCompletion(habitId);

			// Check streak at 11:59 PM on June 14 - should be 1
			let streak = await calculateStreak(habitId);
			expect(streak).toBe(1);

			// Move to midnight June 15 - streak should still be 1 (yesterday counts)
			vi.setSystemTime(new Date(2025, 5, 15, 0, 0, 1));
			streak = await calculateStreak(habitId);
			expect(streak).toBe(1);

			// Move to midnight June 16 without logging on June 15 - streak should be 0
			vi.setSystemTime(new Date(2025, 5, 16, 0, 0, 1));
			streak = await calculateStreak(habitId);
			expect(streak).toBe(0);
		});
	});

	describe('getCompletedTodayMap at midnight boundary', () => {
		it('should correctly identify completed habits at midnight', async () => {
			// Set to midnight
			vi.setSystemTime(new Date(2025, 5, 15, 0, 0, 1));

			// Log completion
			await logHabitCompletion(habitId);

			// Check completed today map
			const completedMap = await getCompletedTodayMap([habitId]);
			expect(completedMap.get(habitId)).toBe(true);
		});

		it('should not show yesterdays completion as completed today', async () => {
			// Log completion on June 14 at 11:59 PM
			vi.setSystemTime(new Date(2025, 5, 14, 23, 59, 0));
			await logHabitCompletion(habitId);

			// Move to June 15 at 12:01 AM
			vi.setSystemTime(new Date(2025, 5, 15, 0, 1, 0));

			// Should NOT be completed today
			const completedMap = await getCompletedTodayMap([habitId]);
			expect(completedMap.get(habitId)).toBe(false);
		});
	});
});
