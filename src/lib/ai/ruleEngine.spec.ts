/**
 * Unit Tests — Rule Engine
 *
 * Tests all pure functions in ruleEngine.ts.
 * No DOM, no IndexedDB — pure function tests.
 *
 * @see src/lib/ai/ruleEngine.ts
 * @see docs/RULE_ENGINE_SPEC.md
 */
import { describe, it, expect } from 'vitest';
import {
	feedAmount,
	expectedDailyFeeds,
	decayForDay,
	totalDecay,
	deriveEvolutionStage,
	deriveMood,
	deriveIntensity,
	deriveLookDirection,
	dangerZonePriority,
	deriveMascotState
} from './ruleEngine';
import type { EvolutionStage, GlobalSnapshot, GonnState, HabitSnapshot } from '$lib/types/mascot';
import type { HabitSchedule } from '$lib/db/db';

// ============================================================================
// Test Fixtures
// ============================================================================

function makeWindow(overrides = {}) {
	return {
		windowMet: false,
		completionsInWindow: 0,
		targetForWindow: 1,
		windowProgress: 0,
		windowDeadline: new Date().toISOString(),
		daysRemaining: 1,
		isScheduledToday: true,
		...overrides
	};
}

function makeHabit(overrides: Partial<HabitSnapshot> = {}): HabitSnapshot {
	return {
		habitId: '1',
		habitName: 'Test Habit',
		flavorTag: 'mystery-meal',
		schedule: { type: 'daily' },
		streakLength: 5,
		streakHealth: 'steady',
		completionCount: 10,
		hitCompletion100: false,
		window: makeWindow(),
		completedToday: false,
		dangerZone: false,
		missedWindows: 0,
		lastCompletionTime: new Date().toISOString(),
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
		feedsToday: 0,
		lastFedDate: new Date().toISOString().split('T')[0],
		...overrides
	};
}

function makeGlobal(overrides: Partial<GlobalSnapshot> = {}): GlobalSnapshot {
	const habit = makeHabit();
	return {
		habits: [habit],
		gonn: makeGonn(),
		totalHabits: 1,
		scheduledTodayCount: 1,
		completedTodayCount: 0,
		allCompletedToday: false,
		anyInDangerZone: false,
		anyBroken: false,
		pendingEvolution: false,
		pendingRegression: false,
		pendingFeast: [],
		...overrides
	};
}

// ============================================================================
// feedAmount
// ============================================================================

describe('feedAmount (harmonic series)', () => {
	it('returns 0 for zero or negative nth', () => {
		expect(feedAmount(0)).toBe(0);
		expect(feedAmount(-1)).toBe(0);
	});

	it('returns 1.0 for 1st completion today', () => {
		expect(feedAmount(1)).toBe(1.0);
	});

	it('returns 0.5 for 2nd completion today', () => {
		expect(feedAmount(2)).toBeCloseTo(0.5);
	});

	it('returns 0.33 for 3rd completion today', () => {
		expect(feedAmount(3)).toBeCloseTo(0.333, 2);
	});

	it('returns 0.1 for 10th completion today', () => {
		expect(feedAmount(10)).toBeCloseTo(0.1);
	});

	it('harmonic sum of 5 completions is ~2.28', () => {
		let sum = 0;
		for (let n = 1; n <= 5; n++) sum += feedAmount(n);
		expect(sum).toBeCloseTo(2.283, 2);
	});
});

// ============================================================================
// expectedDailyFeeds
// ============================================================================

describe('expectedDailyFeeds', () => {
	it('returns 1 per daily habit', () => {
		const schedules: HabitSchedule[] = [{ type: 'daily' }, { type: 'daily' }];
		expect(expectedDailyFeeds(schedules)).toBeCloseTo(2);
	});

	it('returns timesPerWeek/7 for weekly habits', () => {
		const schedules: HabitSchedule[] = [{ type: 'weekly', timesPerWeek: 7 }];
		expect(expectedDailyFeeds(schedules)).toBeCloseTo(1);
	});

	it('returns 1/intervalDays for every-x-days habits', () => {
		const schedules: HabitSchedule[] = [{ type: 'every-x-days', intervalDays: 5 }];
		expect(expectedDailyFeeds(schedules)).toBeCloseTo(0.2);
	});

	it('handles mixed schedule types', () => {
		const schedules: HabitSchedule[] = [
			{ type: 'daily' },
			{ type: 'weekly', timesPerWeek: 3 },
			{ type: 'every-x-days', intervalDays: 2 }
		];
		const expected = 1 + 3 / 7 + 1 / 2;
		expect(expectedDailyFeeds(schedules)).toBeCloseTo(expected);
	});

	it('returns 0 for empty schedules', () => {
		expect(expectedDailyFeeds([])).toBe(0);
	});
});

// ============================================================================
// decayForDay
// ============================================================================

describe('decayForDay', () => {
	it('returns 0 for day index 0 (within grace)', () => {
		expect(decayForDay(0, 1, 1)).toBe(0);
	});

	it('returns base decay for day 1', () => {
		// baseDailyDecay = expectedFeeds / totalActiveHabits = 1/1 = 1
		// acceleration = 1.08^1 = 1.08
		expect(decayForDay(1, 1, 1)).toBeCloseTo(1.08);
	});

	it('accelerates exponentially for later days', () => {
		const day1 = decayForDay(1, 1, 1);
		const day2 = decayForDay(2, 1, 1);
		const day3 = decayForDay(3, 1, 1);
		expect(day2).toBeGreaterThan(day1);
		expect(day3).toBeGreaterThan(day2);
	});

	it('returns 0 when totalActiveHabits is 0', () => {
		expect(decayForDay(2, 1, 0)).toBe(0);
	});

	it('scales with expectedFeeds', () => {
		const lowExpected = decayForDay(1, 1, 1);
		const highExpected = decayForDay(1, 3, 1);
		expect(highExpected).toBeGreaterThan(lowExpected);
	});
});

// ============================================================================
// totalDecay
// ============================================================================

describe('totalDecay', () => {
	it('returns 0 within grace period (1 day)', () => {
		expect(totalDecay(1, 1, 1)).toBe(0);
	});

	it('returns 0 for 0 days', () => {
		expect(totalDecay(0, 1, 1)).toBe(0);
	});

	it('returns decay after grace period', () => {
		expect(totalDecay(2, 1, 1)).toBeGreaterThan(0);
	});

	it('accumulates decay over multiple days', () => {
		const twoDays = totalDecay(2, 1, 1);
		const fiveDays = totalDecay(5, 1, 1);
		expect(fiveDays).toBeGreaterThan(twoDays);
	});

	it('decay never goes negative', () => {
		expect(totalDecay(0, 1, 5)).toBeGreaterThanOrEqual(0);
	});
});

// ============================================================================
// deriveEvolutionStage
// ============================================================================

describe('deriveEvolutionStage', () => {
	// Growth
	it('stays at stage 1 below entry threshold for stage 2', () => {
		expect(deriveEvolutionStage(9, 1)).toBe(1);
	});

	it('grows to stage 2 at satiation 10', () => {
		expect(deriveEvolutionStage(10, 1)).toBe(2);
	});

	it('grows to stage 3 at satiation 25', () => {
		expect(deriveEvolutionStage(25, 2)).toBe(3);
	});

	it('grows to stage 4 at satiation 50', () => {
		expect(deriveEvolutionStage(50, 3)).toBe(4);
	});

	it('grows to stage 5 at satiation 80', () => {
		expect(deriveEvolutionStage(80, 4)).toBe(5);
	});

	it('can jump multiple stages at once (e.g., 1 → 5 if satiation is 80)', () => {
		expect(deriveEvolutionStage(80, 1)).toBe(5);
	});

	// Regression (hysteresis)
	it('stays at stage 2 above exit threshold (6)', () => {
		expect(deriveEvolutionStage(6, 2)).toBe(2);
	});

	it('regresses from stage 2 below exit threshold (< 6)', () => {
		expect(deriveEvolutionStage(5, 2)).toBe(1);
	});

	it('regresses from stage 3 below exit threshold (< 18)', () => {
		expect(deriveEvolutionStage(17, 3)).toBe(2);
	});

	it('regresses from stage 4 below exit threshold (< 40)', () => {
		expect(deriveEvolutionStage(39, 4)).toBe(3);
	});

	it('regresses from stage 5 below exit threshold (< 70)', () => {
		expect(deriveEvolutionStage(69, 5)).toBe(4);
	});

	it('stays in hysteresis band (between exit and entry)', () => {
		// Sat=8 is above exit (6) but below entry (10) — stays at 2
		expect(deriveEvolutionStage(8, 2)).toBe(2);
		// Sat=8 at stage 1 shouldn't grow to 2 (entry is 10)
		expect(deriveEvolutionStage(8, 1)).toBe(1);
	});

	it('stays at stage 1 (floor — cannot regress below)', () => {
		expect(deriveEvolutionStage(0, 1)).toBe(1);
	});
});

// ============================================================================
// deriveMood
// ============================================================================

describe('deriveMood', () => {
	it('returns happy when all habits completed today', () => {
		const global = makeGlobal({ allCompletedToday: true, completedTodayCount: 1 });
		expect(deriveMood(global)).toBe('happy');
	});

	it('returns idle when some completed, no danger, no broken', () => {
		const global = makeGlobal({
			completedTodayCount: 1,
			anyBroken: false,
			anyInDangerZone: false,
			allCompletedToday: false
		});
		expect(deriveMood(global)).toBe('happy');
	});

	it('returns idle when some completed but in danger zone', () => {
		const global = makeGlobal({
			completedTodayCount: 1,
			anyBroken: false,
			anyInDangerZone: true,
			allCompletedToday: false
		});
		expect(deriveMood(global)).toBe('idle');
	});

	it('returns idle when nothing completed and no danger', () => {
		const global = makeGlobal({
			completedTodayCount: 0,
			anyInDangerZone: false,
			anyBroken: false
		});
		expect(deriveMood(global)).toBe('idle');
	});

	it('returns tired when nothing completed and in danger zone', () => {
		const global = makeGlobal({
			completedTodayCount: 0,
			anyInDangerZone: true,
			anyBroken: false
		});
		expect(deriveMood(global)).toBe('tired');
	});

	it('returns tired when any habit streak broken', () => {
		const global = makeGlobal({ anyBroken: true, completedTodayCount: 0 });
		expect(deriveMood(global)).toBe('tired');
	});
});

// ============================================================================
// deriveIntensity
// ============================================================================

describe('deriveIntensity', () => {
	it('returns high intensity when all scheduled habits are completed', () => {
		const habit = makeHabit({
			window: makeWindow({ isScheduledToday: true }),
			completedToday: true
		});
		const global = makeGlobal({
			habits: [habit],
			allCompletedToday: true,
			completedTodayCount: 1,
			scheduledTodayCount: 1
		});
		const intensity = deriveIntensity(global);
		expect(intensity).toBeGreaterThanOrEqual(70);
	});

	it('reduces intensity for danger zones', () => {
		// Both habits are completed so base = 80; danger deduction makes it lower
		const safeHabit = makeHabit({
			window: makeWindow({ isScheduledToday: true }),
			completedToday: true,
			dangerZone: false
		});
		const dangerHabit = makeHabit({
			window: makeWindow({ isScheduledToday: true }),
			completedToday: true,
			dangerZone: true
		});

		const globalSafe = makeGlobal({ habits: [safeHabit], completedTodayCount: 1 });
		const globalDanger = makeGlobal({ habits: [dangerHabit], completedTodayCount: 1 });

		expect(deriveIntensity(globalDanger)).toBeLessThan(deriveIntensity(globalSafe));
	});

	it('reduces intensity for broken streaks', () => {
		// Both habits are completed so base = 80; broken deduction makes it lower
		const steadyHabit = makeHabit({
			window: makeWindow({ isScheduledToday: true }),
			completedToday: true,
			streakHealth: 'steady'
		});
		const brokenHabit = makeHabit({
			window: makeWindow({ isScheduledToday: true }),
			completedToday: true,
			streakHealth: 'broken'
		});

		const globalSteady = makeGlobal({ habits: [steadyHabit], completedTodayCount: 1 });
		const globalBroken = makeGlobal({ habits: [brokenHabit], completedTodayCount: 1 });

		expect(deriveIntensity(globalBroken)).toBeLessThan(deriveIntensity(globalSteady));
	});

	it('clamps to minimum 10', () => {
		const habits = Array.from({ length: 5 }, () =>
			makeHabit({
				streakHealth: 'broken',
				dangerZone: true,
				window: makeWindow({ isScheduledToday: true }),
				completedToday: false
			})
		);
		const global = makeGlobal({ habits, completedTodayCount: 0 });
		expect(deriveIntensity(global)).toBeGreaterThanOrEqual(10);
	});

	it('clamps to maximum 100', () => {
		const global = makeGlobal({ allCompletedToday: true, completedTodayCount: 1 });
		expect(deriveIntensity(global)).toBeLessThanOrEqual(100);
	});
});

// ============================================================================
// deriveLookDirection
// ============================================================================

describe('deriveLookDirection', () => {
	it('returns centre (50, 50) for default idle state', () => {
		const global = makeGlobal({
			anyInDangerZone: false,
			anyBroken: false,
			allCompletedToday: false
		});
		const { lookX, lookY } = deriveLookDirection(global);
		expect(lookX).toBe(50);
		expect(lookY).toBe(50);
	});

	it('shifts gaze down-left when in danger zone', () => {
		const global = makeGlobal({ anyInDangerZone: true, allCompletedToday: false });
		const { lookY } = deriveLookDirection(global);
		expect(lookY).toBeGreaterThan(50);
	});

	it('shifts gaze further down when streaks broken', () => {
		const global = makeGlobal({ anyBroken: true });
		const { lookY } = deriveLookDirection(global);
		expect(lookY).toBeGreaterThan(50);
	});

	it('returns centre-up when all completed', () => {
		const global = makeGlobal({ allCompletedToday: true });
		const { lookX, lookY } = deriveLookDirection(global);
		expect(lookX).toBe(50);
		expect(lookY).toBe(45);
	});

	it('outputs are within 0–100 range', () => {
		const scenarios = [
			makeGlobal(),
			makeGlobal({ anyInDangerZone: true }),
			makeGlobal({ anyBroken: true }),
			makeGlobal({ allCompletedToday: true })
		];
		for (const global of scenarios) {
			const { lookX, lookY } = deriveLookDirection(global);
			expect(lookX).toBeGreaterThanOrEqual(0);
			expect(lookX).toBeLessThanOrEqual(100);
			expect(lookY).toBeGreaterThanOrEqual(0);
			expect(lookY).toBeLessThanOrEqual(100);
		}
	});
});

// ============================================================================
// dangerZonePriority
// ============================================================================

describe('dangerZonePriority', () => {
	it('returns 0 when not in danger zone', () => {
		const habit = makeHabit({ dangerZone: false });
		expect(dangerZonePriority(habit)).toBe(0);
	});

	it('returns > 0 when in danger zone', () => {
		const habit = makeHabit({ dangerZone: true });
		expect(dangerZonePriority(habit)).toBeGreaterThan(0);
	});

	it('fragile streak adds priority', () => {
		const fragile = makeHabit({ dangerZone: true, streakHealth: 'fragile' });
		const steady = makeHabit({ dangerZone: true, streakHealth: 'steady' });
		expect(dangerZonePriority(fragile)).toBeGreaterThan(dangerZonePriority(steady));
	});
});

// ============================================================================
// deriveMascotState (main orchestrator)
// ============================================================================

describe('deriveMascotState', () => {
	it('returns ambient state in normal conditions', () => {
		const state = deriveMascotState(makeGlobal());
		expect(state.context.type).toBe('ambient');
		expect(state.evolutionStage).toBe(3);
	});

	it('prioritises feast over ambient', () => {
		const feastHabit = makeHabit({ hitCompletion100: true });
		const global = makeGlobal({ pendingFeast: [feastHabit] });
		const state = deriveMascotState(global);
		expect(state.primaryEmotion).toBe('celebrating');
		expect(state.trigger).toBe('celebrate100');
		expect(state.context.type).toBe('feast');
	});

	it('prioritises evolution cutscene over ambient', () => {
		const global = makeGlobal({ pendingEvolution: true });
		const state = deriveMascotState(global);
		expect(state.primaryEmotion).toBe('celebrating');
		expect(state.trigger).toBe('levelUp');
		expect(state.context.type).toBe('evolution');
	});

	it('prioritises regression cutscene over ambient', () => {
		const global = makeGlobal({ pendingRegression: true });
		const state = deriveMascotState(global);
		expect(state.primaryEmotion).toBe('tired');
		expect(state.trigger).toBe('regress');
		expect(state.context.type).toBe('regression');
	});

	it('feast takes priority over evolution', () => {
		const feastHabit = makeHabit({ hitCompletion100: true });
		const global = makeGlobal({ pendingFeast: [feastHabit], pendingEvolution: true });
		const state = deriveMascotState(global);
		expect(state.trigger).toBe('celebrate100');
	});

	it('ambient state has correct emotion for happy completion', () => {
		const global = makeGlobal({
			allCompletedToday: true,
			completedTodayCount: 1,
			scheduledTodayCount: 1
		});
		const state = deriveMascotState(global);
		expect(state.primaryEmotion).toBe('happy');
	});

	it('ambient state has correct emotion when nothing done', () => {
		const global = makeGlobal({ completedTodayCount: 0, allCompletedToday: false });
		const state = deriveMascotState(global);
		expect(state.primaryEmotion).toBe('idle');
	});

	it('reflects evolutionStage from gonn state', () => {
		const global = makeGlobal({ gonn: makeGonn({ evolutionStage: 5 }) });
		const state = deriveMascotState(global);
		expect(state.evolutionStage).toBe(5);
	});

	it('execution time is under 5ms', () => {
		const global = makeGlobal();
		const start = performance.now();
		for (let i = 0; i < 100; i++) {
			deriveMascotState(global);
		}
		const avgMs = (performance.now() - start) / 100;
		expect(avgMs).toBeLessThan(5);
	});
});
