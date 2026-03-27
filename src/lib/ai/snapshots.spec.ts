/**
 * Unit Tests — Snapshot Builders
 *
 * Tests buildHabitSnapshot and buildGlobalSnapshot transformers.
 * No DOM, no IndexedDB — pure function tests.
 *
 * @see src/lib/ai/snapshots.ts
 * @see docs/RULE_ENGINE_SPEC.md §1.4, §4.1
 */
import { describe, it, expect } from 'vitest';
import { buildHabitSnapshot, buildGlobalSnapshot } from './snapshots';
import type { HabitWithStatus } from '$lib/stores/habits';
import type { GonnState, HabitSnapshot, EvolutionStage } from '$lib/types/mascot';

// ============================================================================
// Test Fixtures
// ============================================================================

function makeHabitWithStatus(overrides: Partial<HabitWithStatus> = {}): HabitWithStatus {
	return {
		id: 1,
		name: 'Morning Run',
		emoji: '🏃',
		color: '#22c55e',
		schedule: { type: 'daily' },
		createdAt: Date.now(),
		updatedAt: Date.now(),
		streak: 5,
		completedToday: false,
		periodProgress: 0,
		periodTarget: 1,
		periodType: 'day',
		totalCompletions: 10,
		completionType: null,
		...overrides
	};
}

function makeGonn(overrides: Partial<GonnState> = {}): GonnState {
	return {
		id: 'gonn',
		satiation: 50,
		evolutionStage: 3 as EvolutionStage,
		peakStage: 3 as EvolutionStage,
		lastFedAt: new Date().toISOString(),
		daysSinceLastFed: 0,
		expectedDailyFeeds: 1,
		totalCompletions: 50,
		...overrides
	};
}

// ============================================================================
// buildHabitSnapshot
// ============================================================================

describe('buildHabitSnapshot', () => {
	it('maps habit ID to string', () => {
		const habit = makeHabitWithStatus({ id: 42 });
		const snap = buildHabitSnapshot(habit);
		expect(snap.habitId).toBe('42');
	});

	it('maps habit name', () => {
		const habit = makeHabitWithStatus({ name: 'Read 30 mins' });
		const snap = buildHabitSnapshot(habit);
		expect(snap.habitName).toBe('Read 30 mins');
	});

	it('defaults flavorTag to mystery-meal', () => {
		const snap = buildHabitSnapshot(makeHabitWithStatus());
		expect(snap.flavorTag).toBe('mystery-meal');
	});

	it('maps totalCompletions to completionCount', () => {
		const habit = makeHabitWithStatus({ totalCompletions: 42 });
		const snap = buildHabitSnapshot(habit);
		expect(snap.completionCount).toBe(42);
	});

	it('hitCompletion100 is true at exactly 100 completions', () => {
		const habit = makeHabitWithStatus({ totalCompletions: 100 });
		const snap = buildHabitSnapshot(habit);
		expect(snap.hitCompletion100).toBe(true);
	});

	it('hitCompletion100 is false below 100', () => {
		const habit = makeHabitWithStatus({ totalCompletions: 99 });
		const snap = buildHabitSnapshot(habit);
		expect(snap.hitCompletion100).toBe(false);
	});

	it('hitCompletion100 is false above 100', () => {
		const habit = makeHabitWithStatus({ totalCompletions: 101 });
		const snap = buildHabitSnapshot(habit);
		expect(snap.hitCompletion100).toBe(false);
	});

	it('maps completedToday', () => {
		const completed = makeHabitWithStatus({ completedToday: true });
		const notCompleted = makeHabitWithStatus({ completedToday: false });
		expect(buildHabitSnapshot(completed).completedToday).toBe(true);
		expect(buildHabitSnapshot(notCompleted).completedToday).toBe(false);
	});

	describe('streakHealth', () => {
		it('returns broken for streak <= 0', () => {
			const habit = makeHabitWithStatus({ streak: 0 });
			expect(buildHabitSnapshot(habit).streakHealth).toBe('broken');
		});

		it('returns fragile for short streak, not completed today', () => {
			const habit = makeHabitWithStatus({ streak: 2, completedToday: false });
			expect(buildHabitSnapshot(habit).streakHealth).toBe('fragile');
		});

		it('returns steady for short streak, completed today', () => {
			const habit = makeHabitWithStatus({ streak: 2, completedToday: true });
			expect(buildHabitSnapshot(habit).streakHealth).toBe('steady');
		});

		it('returns strong for streak >= 14', () => {
			const habit = makeHabitWithStatus({ streak: 14 });
			expect(buildHabitSnapshot(habit).streakHealth).toBe('strong');
		});
	});

	describe('danger zones', () => {
		it('first-week cliff: completions 4–10', () => {
			const snap4 = buildHabitSnapshot(makeHabitWithStatus({ totalCompletions: 4 }));
			const snap10 = buildHabitSnapshot(makeHabitWithStatus({ totalCompletions: 10 }));
			expect(snap4.dangerZone).toBe(true);
			expect(snap4.dangerZoneLabel).toBe('first-week cliff');
			expect(snap10.dangerZone).toBe(true);
		});

		it('motivation plateau: completions 18–24', () => {
			const snap = buildHabitSnapshot(makeHabitWithStatus({ totalCompletions: 20 }));
			expect(snap.dangerZone).toBe(true);
			expect(snap.dangerZoneLabel).toBe('motivation plateau');
		});

		it('mid-term crisis: completions 35–45', () => {
			const snap = buildHabitSnapshot(makeHabitWithStatus({ totalCompletions: 40 }));
			expect(snap.dangerZone).toBe(true);
			expect(snap.dangerZoneLabel).toBe('mid-term crisis');
		});

		it('automaticity gap: completions 55–65', () => {
			const snap = buildHabitSnapshot(makeHabitWithStatus({ totalCompletions: 60 }));
			expect(snap.dangerZone).toBe(true);
			expect(snap.dangerZoneLabel).toBe('automaticity gap');
		});

		it('is not in danger zone outside defined ranges', () => {
			const snap3 = buildHabitSnapshot(makeHabitWithStatus({ totalCompletions: 3 }));
			const snap11 = buildHabitSnapshot(makeHabitWithStatus({ totalCompletions: 11 }));
			const snap100 = buildHabitSnapshot(makeHabitWithStatus({ totalCompletions: 100 }));
			expect(snap3.dangerZone).toBe(false);
			expect(snap11.dangerZone).toBe(false);
			expect(snap100.dangerZone).toBe(false);
		});
	});

	describe('window status — daily', () => {
		it('isScheduledToday is true for daily habits', () => {
			const habit = makeHabitWithStatus({ schedule: { type: 'daily' } });
			const snap = buildHabitSnapshot(habit);
			expect(snap.window.isScheduledToday).toBe(true);
		});

		it('windowMet when periodProgress >= periodTarget', () => {
			const habit = makeHabitWithStatus({ periodProgress: 1, periodTarget: 1 });
			const snap = buildHabitSnapshot(habit);
			expect(snap.window.windowMet).toBe(true);
		});

		it('windowProgress is clamped to 0–1', () => {
			const habit = makeHabitWithStatus({ periodProgress: 5, periodTarget: 1 });
			const snap = buildHabitSnapshot(habit);
			expect(snap.window.windowProgress).toBeLessThanOrEqual(1);
		});
	});

	describe('window status — every-x-days', () => {
		it('isScheduledToday when dueInDays <= 0', () => {
			const habit = makeHabitWithStatus({
				schedule: { type: 'every-x-days', intervalDays: 3 },
				dueInDays: 0
			});
			const snap = buildHabitSnapshot(habit);
			expect(snap.window.isScheduledToday).toBe(true);
		});

		it('not scheduledToday when dueInDays > 0', () => {
			const habit = makeHabitWithStatus({
				schedule: { type: 'every-x-days', intervalDays: 3 },
				dueInDays: 2
			});
			const snap = buildHabitSnapshot(habit);
			expect(snap.window.isScheduledToday).toBe(false);
		});
	});
});

// ============================================================================
// buildGlobalSnapshot
// ============================================================================

describe('buildGlobalSnapshot', () => {
	function makeSnap(overrides: Partial<HabitSnapshot> = {}): HabitSnapshot {
		return {
			habitId: '1',
			habitName: 'Test',
			flavorTag: 'mystery-meal',
			schedule: { type: 'daily' },
			streakLength: 5,
			streakHealth: 'steady',
			completionCount: 10,
			hitCompletion100: false,
			window: {
				windowMet: false,
				completionsInWindow: 0,
				targetForWindow: 1,
				windowProgress: 0,
				windowDeadline: new Date().toISOString(),
				daysRemaining: 0,
				isScheduledToday: true
			},
			completedToday: false,
			dangerZone: false,
			missedWindows: 0,
			lastCompletionTime: new Date().toISOString(),
			...overrides
		};
	}

	it('totalHabits equals the number of habit snapshots', () => {
		const snaps = [makeSnap(), makeSnap({ habitId: '2' })];
		const global = buildGlobalSnapshot(snaps, makeGonn());
		expect(global.totalHabits).toBe(2);
	});

	it('scheduledTodayCount counts habits scheduled today', () => {
		const snaps = [
			makeSnap({
				window: {
					isScheduledToday: true,
					windowMet: false,
					completionsInWindow: 0,
					targetForWindow: 1,
					windowProgress: 0,
					windowDeadline: '',
					daysRemaining: 0
				}
			}),
			makeSnap({
				habitId: '2',
				window: {
					isScheduledToday: false,
					windowMet: true,
					completionsInWindow: 1,
					targetForWindow: 1,
					windowProgress: 1,
					windowDeadline: '',
					daysRemaining: 3
				}
			})
		];
		const global = buildGlobalSnapshot(snaps, makeGonn());
		expect(global.scheduledTodayCount).toBe(1);
	});

	it('completedTodayCount counts habits completed today', () => {
		const snaps = [
			makeSnap({ completedToday: true }),
			makeSnap({ habitId: '2', completedToday: false })
		];
		const global = buildGlobalSnapshot(snaps, makeGonn());
		expect(global.completedTodayCount).toBe(1);
	});

	it('allCompletedToday is true when all scheduled habits are done', () => {
		const snaps = [makeSnap({ completedToday: true })];
		const global = buildGlobalSnapshot(snaps, makeGonn());
		expect(global.allCompletedToday).toBe(true);
	});

	it('allCompletedToday is false when any scheduled habit is not done', () => {
		const snaps = [makeSnap({ completedToday: false })];
		const global = buildGlobalSnapshot(snaps, makeGonn());
		expect(global.allCompletedToday).toBe(false);
	});

	it('anyInDangerZone is true when a scheduled habit is in danger zone', () => {
		const snaps = [makeSnap({ dangerZone: true })];
		const global = buildGlobalSnapshot(snaps, makeGonn());
		expect(global.anyInDangerZone).toBe(true);
	});

	it('anyBroken is true when any habit has broken streak', () => {
		const snaps = [makeSnap({ streakHealth: 'broken' })];
		const global = buildGlobalSnapshot(snaps, makeGonn());
		expect(global.anyBroken).toBe(true);
	});

	it('pendingFeast contains habits with hitCompletion100', () => {
		const snaps = [makeSnap({ hitCompletion100: true }), makeSnap({ habitId: '2' })];
		const global = buildGlobalSnapshot(snaps, makeGonn());
		expect(global.pendingFeast).toHaveLength(1);
		expect(global.pendingFeast[0].hitCompletion100).toBe(true);
	});

	it('pendingEvolution is true when stage increased', () => {
		const global = buildGlobalSnapshot([makeSnap()], makeGonn({ evolutionStage: 4 }), 3);
		expect(global.pendingEvolution).toBe(true);
		expect(global.pendingRegression).toBe(false);
	});

	it('pendingRegression is true when stage decreased', () => {
		const global = buildGlobalSnapshot([makeSnap()], makeGonn({ evolutionStage: 2 }), 3);
		expect(global.pendingRegression).toBe(true);
		expect(global.pendingEvolution).toBe(false);
	});

	it('neither pending when stage unchanged', () => {
		const global = buildGlobalSnapshot([makeSnap()], makeGonn({ evolutionStage: 3 }), 3);
		expect(global.pendingEvolution).toBe(false);
		expect(global.pendingRegression).toBe(false);
	});

	it('neither pending when no previousStage provided', () => {
		const global = buildGlobalSnapshot([makeSnap()], makeGonn());
		expect(global.pendingEvolution).toBe(false);
		expect(global.pendingRegression).toBe(false);
	});
});
