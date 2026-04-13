import { describe, expect, it } from 'vitest';
import type { Habit, HabitLog } from '$lib/db';
import type { PeriodRange } from '$lib/stores/periodStats';
import { buildHabitChartData, deriveIntervalWindows } from './habitHistory';

function createHabit(overrides: Partial<Habit> = {}): Habit {
	return {
		id: 1,
		name: 'Test Habit',
		emoji: '🧪',
		color: '#000',
		schedule: { type: 'daily' },
		createdAt: 1,
		updatedAt: 1,
		...overrides
	};
}

function createLog(date: string, overrides: Partial<HabitLog> = {}): HabitLog {
	return {
		habitId: 1,
		date,
		completedAt: new Date(date + 'T12:00:00').getTime(),
		completionType: 'full',
		synced: false,
		...overrides
	};
}

describe('habitHistory helpers', () => {
	const period: PeriodRange = {
		preset: 'custom',
		start: '2026-04-01',
		end: '2026-04-10'
	};

	it('builds daily chart points for a multi-completion habit', () => {
		const habit = createHabit({ frequencyType: 'daily', frequencyTarget: 3 });
		const logs = [
			createLog('2026-04-02'),
			createLog('2026-04-02', { completedAt: 2 }),
			createLog('2026-04-04'),
			createLog('2026-04-04', { completedAt: 3 }),
			createLog('2026-04-04', { completedAt: 4 })
		];

		const points = buildHabitChartData(habit, logs, period);

		expect(points).toHaveLength(10);
		expect(points.find((point) => point.date === '2026-04-02')).toMatchObject({
			completed: 2,
			total: 3
		});
		expect(points.find((point) => point.date === '2026-04-04')).toMatchObject({
			completed: 3,
			total: 3
		});
	});

	it('builds weekly chart points using the habit target', () => {
		const habit = createHabit({
			frequencyType: 'weekly',
			frequencyTarget: 3,
			weekStartsOn: 1,
			schedule: { type: 'weekly', timesPerWeek: 3 }
		});
		const logs = [
			createLog('2026-04-01'),
			createLog('2026-04-02'),
			createLog('2026-04-08')
		];

		const points = buildHabitChartData(habit, logs, period);

		expect(points).toHaveLength(2);
		expect(points[0]).toMatchObject({ completed: 2, total: 3 });
		expect(points[1]).toMatchObject({ completed: 1, total: 3 });
	});

	it('derives completed and active interval windows using per-log interval snapshots', () => {
		const habit = createHabit({ schedule: { type: 'every-x-days', intervalDays: 7 } });
		const logs = [
			createLog('2026-04-01', { windowIntervalDays: 3 }),
			createLog('2026-04-03', { windowIntervalDays: 5 }),
			createLog('2026-04-08', { windowIntervalDays: 5, completionType: 'partial' })
		];

		const windows = deriveIntervalWindows(habit, logs, period, '2026-04-10');

		expect(windows).toEqual([
			{
				start: '2026-04-01',
				due: '2026-04-04',
				completedAt: '2026-04-03',
				intervalDays: 3,
				status: 'completed',
				completionType: 'full'
			},
			{
				start: '2026-04-03',
				due: '2026-04-08',
				completedAt: '2026-04-08',
				intervalDays: 5,
				status: 'completed',
				completionType: 'full'
			},
			{
				start: '2026-04-08',
				due: '2026-04-13',
				intervalDays: 5,
				status: 'active',
				completionType: 'partial'
			}
		]);
	});

	it('marks the last interval window missed once the due date passes', () => {
		const habit = createHabit({ schedule: { type: 'every-x-days', intervalDays: 4 } });
		const logs = [createLog('2026-04-01', { windowIntervalDays: 4 })];

		const windows = deriveIntervalWindows(habit, logs, period, '2026-04-10');

		expect(windows[0]).toMatchObject({
			start: '2026-04-01',
			due: '2026-04-05',
			status: 'missed'
		});
	});
});