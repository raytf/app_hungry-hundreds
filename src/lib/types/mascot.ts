/**
 * Mascot (Gonn) Type Definitions
 *
 * Unified types from RULE_ENGINE_SPEC.md and ai-implementation-spec.md.
 * These drive the rule engine, Rive bridge, and LLM dialogue pipeline.
 *
 * @see docs/RULE_ENGINE_SPEC.md — canonical source for satiation/evolution logic
 * @see docs/features/ai-implementation-spec.md — integration spec
 */

import type { HabitSchedule } from '$lib/db/db';

// ============================================================================
// Evolution
// ============================================================================

/** Evolution stages 1–5 (matches RULE_ENGINE_SPEC §2.4) */
export type EvolutionStage = 1 | 2 | 3 | 4 | 5;

export const EVOLUTION_STAGE_NAMES: Record<EvolutionStage, string> = {
	1: 'Egg',
	2: 'Hatchling',
	3: 'Juvenile',
	4: 'Adult',
	5: 'Apex'
};

// ============================================================================
// Flavor Tags
// ============================================================================

export type FlavorTag =
	| 'brain-food'
	| 'protein'
	| 'dessert'
	| 'soul-food'
	| 'vitamins'
	| 'mystery-meal';

export const DEFAULT_FLAVOR_TAG: FlavorTag = 'mystery-meal';

// ============================================================================
// Window Status (per-habit evaluation window)
// ============================================================================

export interface WindowStatus {
	windowMet: boolean;
	completionsInWindow: number;
	targetForWindow: number;
	windowProgress: number; // 0–1
	windowDeadline: string; // ISO date
	daysRemaining: number;
	isScheduledToday: boolean;
}

// ============================================================================
// Habit Snapshot (per-habit, emitted on every event)
// ============================================================================

export type StreakHealth = 'strong' | 'steady' | 'fragile' | 'broken';

export interface HabitSnapshot {
	habitId: string;
	habitName: string;
	flavorTag: FlavorTag;
	schedule: HabitSchedule;

	streakLength: number;
	streakHealth: StreakHealth;

	completionCount: number; // total completions ever (never resets)
	hitCompletion100: boolean; // just reached 100 completions

	window: WindowStatus;
	completedToday: boolean;

	dangerZone: boolean;
	dangerZoneLabel?: string;

	missedWindows: number;
	lastCompletionTime: string;
}

// ============================================================================
// Gonn State (persistent, stored in Dexie)
// ============================================================================

export interface GonnState {
	id: string; // singleton key, always 'gonn'
	satiation: number; // 0–100
	evolutionStage: EvolutionStage;
	peakStage: EvolutionStage;

	lastFedAt: string; // ISO timestamp
	daysSinceLastFed: number;
	expectedDailyFeeds: number;

	totalCompletions: number; // lifetime total, never resets

	/** How many habit completions have fed Gonn today (resets daily) */
	feedsToday: number;
	/** ISO date string (YYYY-MM-DD) of the last feed day, for resetting feedsToday */
	lastFedDate: string;
}

export const DEFAULT_GONN_STATE: GonnState = {
	id: 'gonn',
	satiation: 0,
	evolutionStage: 1,
	peakStage: 1,
	lastFedAt: new Date().toISOString(),
	daysSinceLastFed: 0,
	expectedDailyFeeds: 0,
	totalCompletions: 0,
	feedsToday: 0,
	lastFedDate: new Date().toISOString().split('T')[0]
};

// ============================================================================
// Global Snapshot (aggregated, input to rule engine)
// ============================================================================

export interface GlobalSnapshot {
	habits: HabitSnapshot[];
	gonn: GonnState;

	totalHabits: number;
	scheduledTodayCount: number;
	completedTodayCount: number;
	allCompletedToday: boolean;

	anyInDangerZone: boolean;
	anyBroken: boolean;

	pendingEvolution: boolean;
	pendingRegression: boolean;
	pendingFeast: HabitSnapshot[];
}

// ============================================================================
// Mascot State (output of rule engine, drives Rive)
// ============================================================================

export type PrimaryEmotion =
	| 'idle'
	| 'happy'
	| 'excited'
	| 'tired'
	| 'sad'
	| 'sleeping'
	| 'eating'
	| 'celebrating';

export type MascotTrigger = 'levelUp' | 'regress' | 'celebrate100' | 'streakSave' | 'nudge';

// ============================================================================
// Memory System (Dexie tables for LLM context — Phase 7)
// ============================================================================

export interface MemoryEntry {
	id?: number;
	type: 'permanent' | 'short-term';
	key: string; // e.g. 'identity', 'anchor_habit', 'completion', 'lapse_reason'
	value: string;
	createdAt: string; // ISO timestamp
}

export interface DialogueCacheEntry {
	contextHash: string;
	response: string; // JSON-serialized DialogueResponse
	createdAt: string; // ISO timestamp
}

// ============================================================================
// Emotion → Number Mapping (for Rive state machine input)
// ============================================================================

export const EMOTION_MAP: Record<PrimaryEmotion, number> = {
	idle: 0,
	happy: 1,
	excited: 2,
	tired: 3,
	sad: 4,
	sleeping: 5,
	eating: 6,
	celebrating: 7
};

export interface MascotContext {
	type: 'ambient' | 'feast' | 'evolution' | 'regression';
	urgentHabit?: HabitSnapshot;
	completionRatio?: number;
	feastHabit?: HabitSnapshot;
	regressionFrom?: EvolutionStage;
	regressionTo?: EvolutionStage;
}

export interface MascotState {
	primaryEmotion: PrimaryEmotion;
	emotionIntensity: number; // 0–100
	lookX: number; // 0–100 (rule engine output; mapped to -1..1 in Rive bridge)
	lookY: number; // 0–100
	evolutionStage: EvolutionStage;
	trigger?: MascotTrigger;
	context: MascotContext;
}

// ============================================================================
// AI Dialogue Types (Phase 7)
// ============================================================================

export type InteractionType =
	| 'habit-complete'
	| 'app-open'
	| 'tap'
	| 'lapse-return'
	| 'feast'
	| 'evolution'
	| 'regression';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface DialogueRequest {
	mascotState: MascotState;
	gonn: GonnState;
	habits: Array<{
		name: string;
		flavorTag: string;
		completionCount: number;
		streakLength: number;
		dangerZone: boolean;
		dangerZoneLabel?: string;
		window: {
			isScheduledToday: boolean;
			completionsInWindow: number;
			targetForWindow: number;
			daysRemaining: number;
		};
	}>;
	memory: {
		permanent: MemoryEntry[];
		shortTerm: MemoryEntry[];
	};
	timeContext: {
		timeOfDay: TimeOfDay;
		dayOfWeek: string;
		hourOfDay: number;
	};
	interactionType: InteractionType;
	/** Name of the habit just completed. Only set for 'habit-complete' events. */
	completedHabitName?: string;
}

export interface DialogueResponse {
	dialogue: string; // max 160 characters
	emotion?: string; // optional override of rule engine emotion
}

// ============================================================================
// Chat Types (Phase 8)
// ============================================================================

export interface ChatMessage {
	role: 'user' | 'assistant';
	content: string;
}

export interface ChatSession {
	id?: number;
	messages: ChatMessage[];
	summary?: string; // compressed summary of turns older than WINDOW_SIZE
	createdAt: string;
	updatedAt: string;
}
