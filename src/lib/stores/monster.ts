/**
 * Monster Store
 *
 * Computes the user's monster state based on their habit streaks.
 * The monster evolves as the user builds longer streaks.
 *
 * @see docs/API.md for data model documentation
 */
import { derived } from 'svelte/store';
import { habits } from './habits';
import { showDialogue } from './dialogue';

// ============================================================================
// Types
// ============================================================================

export type MonsterStage = 'egg' | 'baby' | 'teen' | 'adult' | 'elder';

export interface Monster {
	name: string;
	stage: MonsterStage;
	evolutionProgress: number;
}

// ============================================================================
// Monster Stage Configuration
// ============================================================================

export const monsterStages = {
	egg: { emoji: '🥚', color: '#fef3c7' },
	baby: { emoji: '🐣', color: '#bfdbfe' },
	teen: { emoji: '🐲', color: '#c4b5fd' },
	adult: { emoji: '🦖', color: '#f9a8d4' },
	elder: { emoji: '🐉', color: '#fcd34d' }
} as const;

// Stage thresholds (streak days required)
const STAGE_THRESHOLDS = {
	egg: 0,
	baby: 1,
	teen: 7,
	adult: 30,
	elder: 100
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Determine monster stage based on longest streak
 */
function getStageFromStreak(streak: number): MonsterStage {
	if (streak >= STAGE_THRESHOLDS.elder) return 'elder';
	if (streak >= STAGE_THRESHOLDS.adult) return 'adult';
	if (streak >= STAGE_THRESHOLDS.teen) return 'teen';
	if (streak >= STAGE_THRESHOLDS.baby) return 'baby';
	return 'egg';
}

/**
 * Calculate evolution progress within the current stage (0-100%)
 */
function getEvolutionProgress(streak: number, stage: MonsterStage): number {
	const currentThreshold = STAGE_THRESHOLDS[stage];

	// Find next stage threshold
	const stages: MonsterStage[] = ['egg', 'baby', 'teen', 'adult', 'elder'];
	const currentIndex = stages.indexOf(stage);

	// If at max stage (elder), show 100%
	if (stage === 'elder') {
		return 100;
	}

	const nextStage = stages[currentIndex + 1];
	const nextThreshold = STAGE_THRESHOLDS[nextStage];

	// Calculate progress from current threshold to next
	const progressInStage = streak - currentThreshold;
	const stageRange = nextThreshold - currentThreshold;

	return Math.min(100, Math.round((progressInStage / stageRange) * 100));
}

/**
 * Generate a monster name based on streak (consistent for same streak range)
 */
function getMonsterName(stage: MonsterStage): string {
	const names: Record<MonsterStage, string> = {
		egg: 'Mystery Egg',
		baby: 'Chompy Jr.',
		teen: 'Chompy',
		adult: 'Chompy the Great',
		elder: 'Chompy the Wise'
	};
	return names[stage];
}

// ============================================================================
// Monster Store
// ============================================================================

/**
 * Reactive monster store derived from habits
 * Updates automatically when habits/streaks change
 */
export const monster = derived<typeof habits, Monster>(habits, ($habits) => {
	// Find the longest streak among all habits
	const longestStreak = $habits.length > 0 ? Math.max(...$habits.map((h) => h.streak), 0) : 0;

	const stage = getStageFromStreak(longestStreak);
	const evolutionProgress = getEvolutionProgress(longestStreak, stage);
	const name = getMonsterName(stage);

	return {
		name,
		stage,
		evolutionProgress
	};
});

/**
 * Derived store for just the longest streak value
 */
export const longestStreak = derived(habits, ($habits) => {
	return $habits.length > 0 ? Math.max(...$habits.map((h) => h.streak), 0) : 0;
});

// ============================================================================
// Monster LookAt (Head Tracking)
// ============================================================================

type LookAtFn = (x: number, y: number, duration?: number) => void;
let _lookAtFn: LookAtFn | null = null;

/**
 * Register the Monster component's lookAt function.
 * Called by MonsterDisplay when the Monster component mounts.
 */
export function registerMonsterLookAt(fn: LookAtFn | null) {
	_lookAtFn = fn;
}

/**
 * Smoothly animate the monster's gaze toward the given coordinates.
 * No-op if the Monster component hasn't registered its lookAt function.
 *
 * @param x - Target headX value (-1 to 1)
 * @param y - Target headY value (-1 to 1)
 * @param duration - Animation duration in ms (default: 300)
 */
export function monsterLookAt(x: number, y: number, duration?: number) {
	_lookAtFn?.(x, y, duration);
}

// ============================================================================
// Monster Expression
// ============================================================================

type SetExpressionFn = (expression: string) => void;
let _setExpressionFn: SetExpressionFn | null = null;

/**
 * Register the Monster component's setExpression function.
 * Called by MonsterDisplay when the Monster component mounts.
 */
export function registerMonsterSetExpression(fn: SetExpressionFn | null) {
	_setExpressionFn = fn;
}

/**
 * Set the monster's facial expression.
 * No-op if the Monster component hasn't registered its setExpression function.
 *
 * @param expression - One of: "normal", "excited", "bored", "surprised"
 */
export function monsterSetExpression(expression: string) {
	_setExpressionFn?.(expression);
}

// ============================================================================
// Monster Dialogue (Typewriter)
// ============================================================================

type SetDialogueFn = (text: string, charDelayMs?: number, displayMs?: number) => void;
let _setDialogueFn: SetDialogueFn | null = null;

/**
 * Register the Monster component's setDialogue function.
 * Called by MonsterDisplay when the Monster component mounts.
 */
export function registerMonsterSetDialogue(fn: SetDialogueFn | null) {
	_setDialogueFn = fn;
}

/**
 * Trigger Gonn's speech bubble typewriter effect.
 * Routes through the HTML SpeechBubble component via dialogueStore (Phase C).
 * The Rive VM path (_setDialogueFn) is kept as dead code for forward-compat.
 *
 * @param text        - Text to display (max ~80 chars)
 * @param charDelayMs - Milliseconds between each character (default: 30)
 * @param displayMs   - How long to keep the bubble visible after typing (default: 3500)
 */
export function monsterSetDialogue(text: string, charDelayMs?: number, displayMs?: number) {
	showDialogue(text, { charDelayMs, displayMs });
	// Rive VM path kept for forward-compat (currently no-op)
	_setDialogueFn?.(text, charDelayMs, displayMs);
}
