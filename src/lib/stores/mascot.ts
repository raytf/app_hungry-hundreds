/**
 * MascotState Derived Store
 *
 * Connects habits + gonn stores → snapshot builders → rule engine → MascotState.
 * This is the single reactive output consumed by the Rive bridge (Monster.svelte).
 * Also exports globalSnapshot for the chat store (Phase 8).
 *
 * @see docs/RULE_ENGINE_SPEC.md §5.4
 * @see src/lib/ai/ruleEngine.ts — deriveMascotState()
 */
import { derived, type Readable } from 'svelte/store';
import { habits, type HabitWithStatus } from '$lib/stores/habits';
import { gonnState } from '$lib/stores/gonn';
import { buildHabitSnapshot, buildGlobalSnapshot } from '$lib/ai/snapshots';
import { deriveMascotState } from '$lib/ai/ruleEngine';
import type { EvolutionStage, GlobalSnapshot, MascotState, GonnState } from '$lib/types/mascot';
import { DEFAULT_GONN_STATE, EMOTION_MAP } from '$lib/types/mascot';

// ============================================================================
// Previous-stage tracking for evolution/regression detection
// ============================================================================

let previousStage: EvolutionStage | undefined;

// ============================================================================
// Global Snapshot Store (exported for chat store context)
// ============================================================================

/**
 * Reactive GlobalSnapshot derived from habits + gonn.
 * Updates previousStage as a side effect so that the next snapshot
 * correctly detects evolution / regression events.
 */
export const globalSnapshot: Readable<GlobalSnapshot> = derived(
	[habits, gonnState],
	([$habits, $gonn]: [HabitWithStatus[], GonnState]) => {
		const habitSnapshots = $habits.map(buildHabitSnapshot);
		const snapshot = buildGlobalSnapshot(habitSnapshots, $gonn, previousStage);
		// Update after building so the *next* derivation detects stage changes
		previousStage = $gonn.evolutionStage;
		return snapshot;
	},
	buildGlobalSnapshot([], DEFAULT_GONN_STATE, undefined)
);

// ============================================================================
// Derived MascotState Store
// ============================================================================

/**
 * Reactive MascotState derived from the globalSnapshot.
 * Recalculates whenever habits or gonn state changes.
 *
 * Flow: GlobalSnapshot → deriveMascotState() → MascotState
 */
export const mascotState: Readable<MascotState> = derived<typeof globalSnapshot, MascotState>(
	globalSnapshot,
	($snapshot: GlobalSnapshot) => deriveMascotState($snapshot),
	// Initial value before first computation
	{
		primaryEmotion: 'idle',
		emotionIntensity: 50,
		lookX: 50,
		lookY: 50,
		evolutionStage: 1 as EvolutionStage,
		context: { type: 'ambient' }
	}
);

// ============================================================================
// Rive-ready derived values (convenience stores)
// ============================================================================

/**
 * Emotion as a numeric value for Rive state machine input.
 * Maps PrimaryEmotion → number using EMOTION_MAP.
 */
export const emotionNumber = derived(mascotState, ($s) => EMOTION_MAP[$s.primaryEmotion] ?? 0);

/**
 * Look direction mapped from rule-engine 0–100 → Rive -1..1 range.
 */
export const riveLookX = derived(mascotState, ($s) => $s.lookX / 50 - 1);
export const riveLookY = derived(mascotState, ($s) => $s.lookY / 50 - 1);

/**
 * Emotion intensity normalized to 0–1 for Rive.
 */
export const riveIntensity = derived(mascotState, ($s) => $s.emotionIntensity / 100);
