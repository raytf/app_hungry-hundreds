import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$app/environment', () => ({ browser: true }));

import {
	db,
	formatDateLocal,
	createHabit,
	getHabitById,
	getLatestLogForHabit,
	logHabitCompletion,
	updateHabit,
	calculateFlexibleStreak
} from '$lib/db';
import { habits } from './habits';

function daysAgo(days: number): string {
	const date = new Date();
	date.setDate(date.getDate() - days);
	return formatDateLocal(date);
}

describe('habits store interval updates', () => {
	beforeEach(async () => {
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
	});

	it('applies overdue interval edits immediately by updating the latest log snapshot', async () => {
		const habitId = await createHabit({
			name: 'Stretch',
			emoji: '🧘',
			color: '#336699',
			schedule: { type: 'every-x-days', intervalDays: 3 }
		});

		await logHabitCompletion(habitId, daysAgo(4), 'full', 3);
		await db.syncQueue.clear();

		await habits.edit(habitId, {
			schedule: { type: 'every-x-days', intervalDays: 5 }
		});

		const habit = await getHabitById(habitId);
		const latestLog = await getLatestLogForHabit(habitId);
		const status = await calculateFlexibleStreak(habit!);

		expect(habit!.schedule).toEqual({ type: 'every-x-days', intervalDays: 5 });
		expect(habit!.pendingIntervalDays).toBeUndefined();
		expect(latestLog!.windowIntervalDays).toBe(5);
		expect(status.dueInDays).toBe(1);
	});

	it('applyIntervalNow updates the latest log snapshot immediately', async () => {
		const habitId = await createHabit({
			name: 'Laundry',
			emoji: '🧺',
			color: '#8844aa',
			schedule: { type: 'every-x-days', intervalDays: 3 }
		});

		await logHabitCompletion(habitId, daysAgo(1), 'full', 3);
		await updateHabit(habitId, { pendingIntervalDays: 5 });
		await db.syncQueue.clear();

		await habits.applyIntervalNow(habitId);

		const habit = await getHabitById(habitId);
		const latestLog = await getLatestLogForHabit(habitId);
		const status = await calculateFlexibleStreak(habit!);

		expect(habit!.schedule).toEqual({ type: 'every-x-days', intervalDays: 5 });
		expect(habit!.pendingIntervalDays).toBeUndefined();
		expect(latestLog!.windowIntervalDays).toBe(5);
		expect(status.dueInDays).toBe(4);
	});
});
