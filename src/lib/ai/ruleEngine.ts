/**
 * Rule Engine Core — Pure Functions
 *
 * All functions are pure: no side effects, no imports beyond types.
 * Performance target: < 5ms for deriveMascotState().
 *
 * @see docs/RULE_ENGINE_SPEC.md — canonical source for all formulas
 */

import type {
	EvolutionStage,
	GonnState,
	GlobalSnapshot,
	HabitSnapshot,
	MascotState,
	PrimaryEmotion
} from '$lib/types/mascot';
import type { HabitSchedule } from '$lib/db/db';

// ============================================================================
// Constants (from RULE_ENGINE_SPEC §2)
// ============================================================================

/** 1-day grace period before decay starts */
const GRACE_DAYS = 1;

/** Exponential acceleration base for starvation */
const DECAY_ACCELERATION = 1.08;

/** Max satiation value */
const SATIATION_MAX = 100;

// ============================================================================
// Hysteresis Thresholds (RULE_ENGINE_SPEC §2.4)
// ============================================================================

interface StageThreshold {
	enter: number; // satiation >= this to grow INTO this stage
	exit: number; // satiation < this to regress OUT of this stage
}

const STAGE_THRESHOLDS: Record<EvolutionStage, StageThreshold> = {
	1: { enter: 0, exit: -Infinity }, // Egg — floor, can't regress below
	2: { enter: 10, exit: 6 },
	3: { enter: 25, exit: 18 },
	4: { enter: 50, exit: 40 },
	5: { enter: 80, exit: 70 }
};

// ============================================================================
// Feeding (RULE_ENGINE_SPEC §2.2)
// ============================================================================

/**
 * How much satiation the nth habit completion today adds.
 * Uses harmonic series (1/n) so:
 *   1st completion: +1.0
 *   2nd completion: +0.5
 *   3rd completion: +0.33
 *
 * 1 habit × 100 days = 100 satiation. Extra habits are diminishing bonuses.
 *
 * @param nthCompletionToday — which completion this is today (1-based)
 */
export function feedAmount(nthCompletionToday: number): number {
	if (nthCompletionToday <= 0) return 0;
	return 1.0 / nthCompletionToday;
}

// ============================================================================
// Expected Daily Feeds (RULE_ENGINE_SPEC §2.3)
// ============================================================================

/**
 * Calculate expected daily feed rate from habit schedules.
 * Used to calibrate decay rate.
 */
export function expectedDailyFeeds(schedules: HabitSchedule[]): number {
	return schedules.reduce((sum, s) => {
		switch (s.type) {
			case 'daily':
				return sum + 1;
			case 'weekly':
				return sum + (s.timesPerWeek ?? 1) / 7;
			case 'every-x-days':
				return sum + 1 / (s.intervalDays ?? 2);
			default:
				return sum + 1;
		}
	}, 0);
}

// ============================================================================
// Decay (RULE_ENGINE_SPEC §2.3)
// ============================================================================

/**
 * Calculate decay for a single day of starvation.
 * daysSinceLastFed is calendar days with zero completions.
 */
export function decayForDay(
	starveDayIndex: number,
	expectedFeeds: number,
	totalActiveHabits: number
): number {
	if (starveDayIndex <= 0) return 0; // within grace period
	if (totalActiveHabits <= 0) return 0;

	const baseDailyDecay = expectedFeeds / totalActiveHabits;
	const acceleration = Math.pow(DECAY_ACCELERATION, starveDayIndex);
	return baseDailyDecay * acceleration;
}

/**
 * Calculate total accumulated decay over multiple starve days.
 * Applies the 1-day grace period, then exponential acceleration.
 */
export function totalDecay(
	daysSinceLastFed: number,
	expectedFeeds: number,
	totalActiveHabits: number
): number {
	if (daysSinceLastFed <= GRACE_DAYS) return 0;

	let total = 0;
	for (let d = 1; d <= daysSinceLastFed - GRACE_DAYS; d++) {
		total += decayForDay(d, expectedFeeds, totalActiveHabits);
	}
	return total;
}

// ============================================================================
// Evolution (RULE_ENGINE_SPEC §2.4)
// ============================================================================

/**
 * Derive evolution stage from satiation with hysteresis.
 * Growth checks top-down; regression checks bottom-up.
 */
export function deriveEvolutionStage(
	satiation: number,
	currentStage: EvolutionStage
): EvolutionStage {
	// Growth (check highest first)
	if (satiation >= STAGE_THRESHOLDS[5].enter && currentStage < 5) return 5;
	if (satiation >= STAGE_THRESHOLDS[4].enter && currentStage < 4) return 4;
	if (satiation >= STAGE_THRESHOLDS[3].enter && currentStage < 3) return 3;
	if (satiation >= STAGE_THRESHOLDS[2].enter && currentStage < 2) return 2;

	// Regression (check current stage's exit threshold)
	if (currentStage === 5 && satiation < STAGE_THRESHOLDS[5].exit) return 4;
	if (currentStage === 4 && satiation < STAGE_THRESHOLDS[4].exit) return 3;
	if (currentStage === 3 && satiation < STAGE_THRESHOLDS[3].exit) return 2;
	if (currentStage === 2 && satiation < STAGE_THRESHOLDS[2].exit) return 1;

	return currentStage;
}

// ============================================================================
// Mood Engine (RULE_ENGINE_SPEC §5)
// ============================================================================

/**
 * Derive primary emotion from global snapshot.
 * RULE_ENGINE_SPEC §5.1
 */
export function deriveMood(global: GlobalSnapshot): PrimaryEmotion {
	if (global.allCompletedToday) return 'happy';
	if (global.completedTodayCount > 0 && !global.anyBroken) {
		return global.anyInDangerZone ? 'idle' : 'happy';
	}
	if (global.completedTodayCount === 0) {
		return global.anyInDangerZone || global.anyBroken ? 'tired' : 'idle';
	}
	if (global.anyBroken) return 'tired';
	return 'idle';
}

/**
 * Derive emotion intensity (0–100).
 * RULE_ENGINE_SPEC §5.2
 */
export function deriveIntensity(global: GlobalSnapshot): number {
	const scheduledToday = global.habits.filter((h) => h.window.isScheduledToday);
	const scheduledCompleted = scheduledToday.filter((h) => h.completedToday).length;
	const completionRatio =
		scheduledToday.length > 0 ? scheduledCompleted / scheduledToday.length : 1;

	const dangerCount = scheduledToday.filter((h) => h.dangerZone).length;
	const brokenCount = global.habits.filter((h) => h.streakHealth === 'broken').length;

	let base = completionRatio * 80;
	base -= dangerCount * 10;
	base -= brokenCount * 20;
	return Math.max(10, Math.min(100, base));
}

/**
 * Derive look direction (0–100 range, mapped to -1..1 in Rive bridge).
 * RULE_ENGINE_SPEC §5.3
 */
export function deriveLookDirection(global: GlobalSnapshot): { lookX: number; lookY: number } {
	let lookX = 50;
	let lookY = 50;

	if (global.anyInDangerZone && !global.allCompletedToday) {
		lookY = 60;
		lookX = 40; // spec uses random, we use deterministic for testability
	}
	if (global.anyBroken) {
		lookY = 65;
	}
	if (global.allCompletedToday) {
		lookX = 50;
		lookY = 45;
	}

	return { lookX, lookY };
}

/**
 * Calculate danger zone priority for sorting.
 * RULE_ENGINE_SPEC §4.3
 */
export function dangerZonePriority(snapshot: HabitSnapshot): number {
	if (!snapshot.dangerZone) return 0;
	return (
		(1 - snapshot.window.windowProgress) * 100 + (snapshot.streakHealth === 'fragile' ? 50 : 0)
	);
}

// ============================================================================
// Main Orchestrator (RULE_ENGINE_SPEC §5.4)
// ============================================================================

/**
 * Derive the complete MascotState from a GlobalSnapshot.
 * This is the single entry point for the rule engine.
 * Must execute in < 5ms.
 */
export function deriveMascotState(global: GlobalSnapshot): MascotState {
	// Priority 1: Feast (Day 100 celebration)
	if (global.pendingFeast.length > 0) {
		return {
			primaryEmotion: 'celebrating',
			emotionIntensity: 100,
			lookX: 50,
			lookY: 50,
			evolutionStage: global.gonn.evolutionStage,
			trigger: 'celebrate100',
			context: { type: 'feast', feastHabit: global.pendingFeast[0] }
		};
	}

	// Priority 2: Evolution cutscene
	if (global.pendingEvolution) {
		return {
			primaryEmotion: 'celebrating',
			emotionIntensity: 100,
			lookX: 50,
			lookY: 50,
			evolutionStage: global.gonn.evolutionStage,
			trigger: 'levelUp',
			context: { type: 'evolution' }
		};
	}

	// Priority 3: Regression cutscene
	if (global.pendingRegression) {
		return {
			primaryEmotion: 'tired',
			emotionIntensity: 30,
			lookX: 50,
			lookY: 60,
			evolutionStage: global.gonn.evolutionStage,
			trigger: 'regress',
			context: {
				type: 'regression',
				regressionFrom: global.gonn.peakStage,
				regressionTo: global.gonn.evolutionStage
			}
		};
	}

	// Priority 4: Ambient mood
	const mood = deriveMood(global);
	const intensity = deriveIntensity(global);
	const { lookX, lookY } = deriveLookDirection(global);

	const urgent = global.habits
		.filter((h) => h.window.isScheduledToday)
		.sort((a, b) => dangerZonePriority(b) - dangerZonePriority(a))[0];

	return {
		primaryEmotion: mood,
		emotionIntensity: intensity,
		lookX,
		lookY,
		evolutionStage: global.gonn.evolutionStage,
		context: {
			type: 'ambient',
			urgentHabit: urgent?.dangerZone ? urgent : undefined,
			completionRatio:
				global.scheduledTodayCount > 0 ? global.completedTodayCount / global.totalHabits : 1
		}
	};
}
