/**
 * AI Dialogue Pipeline (Phase 7)
 *
 * Client-side orchestration for Gonn's LLM-powered speech.
 * Applies a 4-hour response cache (Dexie dialogueCache) and a per-habit
 * 12-second throttle to keep requests off the edge function as much as possible.
 *
 * The actual LLM call is proxied through the Supabase Edge Function
 * `gonn-dialogue` so the Anthropic API key stays server-side.
 *
 * @see docs/features/ai-dialogue-notes.md — rate-limiting strategy + per-habit context design
 * @see supabase/functions/gonn-dialogue/index.ts — edge function proxy
 */
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { db } from '$lib/db/db';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type {
	DialogueRequest,
	DialogueResponse,
	InteractionType,
	TimeOfDay
} from '$lib/types/mascot';
import { supabase } from '$lib/supabase/client';
import { mascotState } from '$lib/stores/mascot';
import { gonnState } from '$lib/stores/gonn';
import { habits } from '$lib/stores/habits';
import { monsterSetDialogue } from '$lib/stores/monster';
import { buildHabitSnapshot } from '$lib/ai/snapshots';
import { getMemoryContext, writeCompletionMemory } from '$lib/ai/memory';

// ============================================================================
// Client-Side Rate Limiting State
// ============================================================================

/**
 * Per-key throttle map. Keys are `habit-complete:<habitName>` for habit events
 * and `<interactionType>` for everything else. This lets two *different* habits
 * completed in quick succession both reach the LLM, while repeated calls for
 * the *same* habit are still throttled.
 */
const throttleMap = new Map<string, number>();

/** Minimum ms between calls for the same throttle key (≈5 calls/min server-side) */
export const DIALOGUE_MIN_CALL_INTERVAL_MS = 12_000;

/** Derive a stable throttle key from the request */
export function getDialogueThrottleKey(req: DialogueRequest): string {
	return req.completedHabitName ? `habit-complete:${req.completedHabitName}` : req.interactionType;
}

/** Return the last successful client-side call time for the request's throttle key. */
export function getDialogueLastCallAt(req: DialogueRequest): number | null {
	return throttleMap.get(getDialogueThrottleKey(req)) ?? null;
}

/** Return remaining client-side throttle time in ms for the request's throttle key. */
export function getDialogueThrottleRemainingMs(req: DialogueRequest, now = Date.now()): number {
	const lastCalledAt = getDialogueLastCallAt(req);
	if (lastCalledAt === null) return 0;
	return Math.max(0, DIALOGUE_MIN_CALL_INTERVAL_MS - (now - lastCalledAt));
}

// ============================================================================
// Time Context Helper
// ============================================================================

/** Derive a human-readable time-of-day bucket from the current hour */
export function getTimeContext(): DialogueRequest['timeContext'] {
	const now = new Date();
	const hour = now.getHours();
	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	let timeOfDay: TimeOfDay;
	if (hour >= 5 && hour < 12) timeOfDay = 'morning';
	else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
	else if (hour >= 17 && hour < 21) timeOfDay = 'evening';
	else timeOfDay = 'night';
	return { timeOfDay, dayOfWeek: days[now.getDay()], hourOfDay: hour };
}

// ============================================================================
// Cache
// ============================================================================

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

/** Generate a stable cache key from the request's key parameters */
export function getDialogueCacheKey(req: DialogueRequest): string {
	const key = [
		req.interactionType,
		req.completedHabitName ?? '',
		req.mascotState.primaryEmotion,
		req.timeContext.hourOfDay,
		req.mascotState.evolutionStage,
		req.habits.map((h) => h.streakLength).join(',')
	].join('-');
	// btoa is available in all modern browsers and Cloudflare Workers
	return btoa(key).slice(0, 32);
}

async function checkCache(hash: string): Promise<DialogueResponse | null> {
	if (!browser) return null;
	const cached = await db.dialogueCache.get(hash);
	if (!cached) return null;
	const age = Date.now() - new Date(cached.createdAt).getTime();
	if (age > CACHE_TTL_MS) {
		await db.dialogueCache.delete(hash);
		return null;
	}
	return JSON.parse(cached.response) as DialogueResponse;
}

async function storeCache(hash: string, response: DialogueResponse): Promise<void> {
	if (!browser) return;
	await db.dialogueCache.put({
		contextHash: hash,
		response: JSON.stringify(response),
		createdAt: new Date().toISOString()
	});
}

// ============================================================================
// Main Pipeline
// ============================================================================

/**
 * Generate dialogue for Gonn via the LLM proxy edge function.
 *
 * Returns `null` when:
 *  - Called too soon (client-side throttle)
 *  - Offline / edge function unavailable
 *  - Rate limit reached (429 from edge function)
 *
 * @param request - Fully populated DialogueRequest
 */
export async function generateDialogue(request: DialogueRequest): Promise<DialogueResponse | null> {
	if (!browser) return null;

	// 1. Per-key client-side throttle
	const now = Date.now();
	const throttleKey = getDialogueThrottleKey(request);
	if (now - (throttleMap.get(throttleKey) ?? 0) < DIALOGUE_MIN_CALL_INTERVAL_MS) return null;

	// 2. Cache check
	const hash = getDialogueCacheKey(request);
	const cached = await checkCache(hash);
	if (cached) return cached;

	// 3. Get Supabase session for auth header
	const {
		data: { session }
	} = await supabase.auth.getSession();
	if (!session) return null; // unauthenticated — no LLM calls

	// 4. Call edge function
	try {
		const edgeFunctionUrl = `${PUBLIC_SUPABASE_URL}/functions/v1/gonn-dialogue`;
		const res = await fetch(edgeFunctionUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session.access_token}`,
				apikey: PUBLIC_SUPABASE_PUBLISHABLE_KEY
			},
			body: JSON.stringify(request)
		});

		if (!res.ok) return null; // 429, 401, 500 — fail silently

		const data = (await res.json()) as DialogueResponse;
		if (!data.dialogue) return null;

		// 5. Update per-key throttle timestamp and cache
		throttleMap.set(throttleKey, Date.now());
		await storeCache(hash, data);
		return data;
	} catch {
		// Network error / offline
		return null;
	}
}

/**
 * Clear all cached dialogue responses (e.g., on logout or debug reset).
 */
export async function clearDialogueCache(): Promise<void> {
	if (!browser) return;
	await db.dialogueCache.clear();
}

// ============================================================================
// Production Trigger
// ============================================================================

/**
 * Fire-and-forget orchestrator for Gonn's AI dialogue.
 *
 * Reads current store state, builds a DialogueRequest, calls the LLM pipeline,
 * and (if a response comes back) shows it in the Svelte speech bubble via
 * monsterSetDialogue(). All failures are silent — the UI is never blocked.
 *
 * Safe to call without awaiting. The generateDialogue() function handles:
 * - 12 s client-side throttle (returns null if called too soon)
 * - 4-hour response cache
 * - Auth check (no-op for unauthenticated users)
 * - Network / edge-function errors
 *
 * @param interactionType   - Why dialogue was triggered ('habit-complete', 'app-open', etc.)
 * @param completedHabitId  - Optional: ID of the just-completed habit (habit-complete events).
 *                            Used to write short-term completion memory.
 */
export async function triggerGonnDialogue(
	interactionType: InteractionType,
	completedHabitId?: string
): Promise<void> {
	if (!browser) return;

	const $mascotState = get(mascotState);
	const $gonnState = get(gonnState);
	const $habits = get(habits);
	const memory = await getMemoryContext();

	const habitSnapshots = $habits.map(buildHabitSnapshot);

	// Resolve the completed habit snapshot once — used for memory + request field
	const completedSnap =
		interactionType === 'habit-complete' && completedHabitId
			? habitSnapshots.find((s) => s.habitId === completedHabitId)
			: undefined;

	// Write completion memory (does not block dialogue)
	if (completedSnap) writeCompletionMemory(completedSnap); // intentionally not awaited

	const request: DialogueRequest = {
		mascotState: $mascotState,
		gonn: $gonnState,
		habits: habitSnapshots.map((s) => ({
			name: s.habitName,
			flavorTag: s.flavorTag,
			completionCount: s.completionCount,
			streakLength: s.streakLength,
			dangerZone: s.dangerZone,
			dangerZoneLabel: s.dangerZoneLabel,
			window: {
				isScheduledToday: s.window.isScheduledToday,
				completionsInWindow: s.window.completionsInWindow,
				targetForWindow: s.window.targetForWindow,
				daysRemaining: s.window.daysRemaining
			}
		})),
		memory,
		timeContext: getTimeContext(),
		interactionType,
		completedHabitName: completedSnap?.habitName
	};

	const result = await generateDialogue(request);
	if (result?.dialogue) {
		monsterSetDialogue(result.dialogue);
	}
}
