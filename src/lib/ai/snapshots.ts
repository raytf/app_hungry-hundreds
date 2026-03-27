/**
 * Snapshot Builders
 *
 * Transforms raw store data (HabitWithStatus, GonnState) into the
 * HabitSnapshot / GlobalSnapshot structures consumed by the rule engine.
 *
 * @see docs/RULE_ENGINE_SPEC.md §1.4, §1.6, §4.1
 */

import type { HabitWithStatus } from '$lib/stores/habits';
import type {
	FlavorTag,
	GonnState,
	GlobalSnapshot,
	HabitSnapshot,
	StreakHealth,
	WindowStatus
} from '$lib/types/mascot';
import { DEFAULT_FLAVOR_TAG } from '$lib/types/mascot';
import { DEFAULT_HABIT_SCHEDULE, type Habit } from '$lib/db/db';

// ============================================================================
// Danger Zones (RULE_ENGINE_SPEC §4.1)
// ============================================================================

const DANGER_ZONES = [
	{ min: 4, max: 10, label: 'first-week cliff' },
	{ min: 18, max: 24, label: 'motivation plateau' },
	{ min: 35, max: 45, label: 'mid-term crisis' },
	{ min: 55, max: 65, label: 'automaticity gap' }
] as const;

function isInDangerZone(completionCount: number): { inZone: boolean; label?: string } {
	const zone = DANGER_ZONES.find((z) => completionCount >= z.min && completionCount <= z.max);
	return zone ? { inZone: true, label: zone.label } : { inZone: false };
}

// ============================================================================
// Streak Health (RULE_ENGINE_SPEC §3.3)
// ============================================================================

function deriveStreakHealth(streak: number, completedToday: boolean): StreakHealth {
	if (streak <= 0) return 'broken';
	if (streak >= 14) return 'strong';
	if (streak >= 3) return completedToday ? 'steady' : 'fragile';
	return completedToday ? 'steady' : 'fragile';
}

// ============================================================================
// Window Status Builder
// ============================================================================

function buildWindowStatus(habit: HabitWithStatus): WindowStatus {
	const schedule = habit.schedule ?? DEFAULT_HABIT_SCHEDULE;

	// Use periodProgress/periodTarget from the flexible streak system
	const windowMet = habit.periodProgress >= habit.periodTarget;
	const isScheduledToday =
		schedule.type === 'daily' ||
		(schedule.type === 'weekly' && !windowMet) ||
		(schedule.type === 'every-x-days' && (habit.dueInDays ?? 0) <= 0);

	// Approximate days remaining in window
	let daysRemaining = 0;
	if (schedule.type === 'weekly') {
		const dayOfWeek = new Date().getDay();
		daysRemaining = 7 - dayOfWeek; // days until end of week
	} else if (schedule.type === 'every-x-days') {
		daysRemaining = Math.max(0, habit.dueInDays ?? 0);
	}

	return {
		windowMet,
		completionsInWindow: habit.periodProgress,
		targetForWindow: habit.periodTarget,
		windowProgress: habit.periodTarget > 0 ? Math.min(1, habit.periodProgress / habit.periodTarget) : 1,
		windowDeadline: new Date().toISOString(), // placeholder
		daysRemaining,
		isScheduledToday
	};
}

// ============================================================================
// Habit Snapshot Builder
// ============================================================================

/**
 * Transform a HabitWithStatus into a HabitSnapshot for the rule engine.
 */
export function buildHabitSnapshot(habit: HabitWithStatus): HabitSnapshot {
	const window = buildWindowStatus(habit);
	const danger = isInDangerZone(habit.totalCompletions);
	const streakHealth = deriveStreakHealth(habit.streak, habit.completedToday);

	return {
		habitId: String(habit.id ?? ''),
		habitName: habit.name,
		flavorTag: DEFAULT_FLAVOR_TAG as FlavorTag,
		schedule: habit.schedule ?? DEFAULT_HABIT_SCHEDULE,

		streakLength: habit.streak,
		streakHealth,

		completionCount: habit.totalCompletions,
		hitCompletion100: habit.totalCompletions === 100,

		window,
		completedToday: habit.completedToday,

		dangerZone: danger.inZone,
		dangerZoneLabel: danger.label,

		missedWindows: 0, // TODO: track from logs in future
		lastCompletionTime: new Date().toISOString() // placeholder
	};
}

// ============================================================================
// Global Snapshot Builder
// ============================================================================

/**
 * Build a GlobalSnapshot from habit snapshots and GonnState.
 * This is the input to `deriveMascotState()`.
 */
export function buildGlobalSnapshot(
	habitSnapshots: HabitSnapshot[],
	gonn: GonnState,
	previousStage?: number
): GlobalSnapshot {
	const scheduledToday = habitSnapshots.filter((h) => h.window.isScheduledToday);
	const completedToday = habitSnapshots.filter((h) => h.completedToday);

	return {
		habits: habitSnapshots,
		gonn,

		totalHabits: habitSnapshots.length,
		scheduledTodayCount: scheduledToday.length,
		completedTodayCount: completedToday.length,
		allCompletedToday:
			scheduledToday.length > 0 ? completedToday.length >= scheduledToday.length : true,

		anyInDangerZone: scheduledToday.some((h) => h.dangerZone),
		anyBroken: habitSnapshots.some((h) => h.streakHealth === 'broken'),

		pendingEvolution: previousStage !== undefined && gonn.evolutionStage > previousStage,
		pendingRegression: previousStage !== undefined && gonn.evolutionStage < previousStage,
		pendingFeast: habitSnapshots.filter((h) => h.hitCompletion100)
	};
}

