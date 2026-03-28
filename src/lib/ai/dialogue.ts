/**
 * AI Dialogue Pipeline (Phase 7)
 *
 * Client-side orchestration for Gonn's LLM-powered speech.
 * Applies a 4-hour response cache (Dexie dialogueCache), a 30-second
 * client-side tap cooldown, and a 12-second per-call throttle to keep
 * requests off the edge function as much as possible.
 *
 * The actual LLM call is proxied through the Supabase Edge Function
 * `gonn-dialogue` so the Anthropic API key stays server-side.
 *
 * @see docs/features/ai-dialogue-notes.md — rate-limiting strategy
 * @see supabase/functions/gonn-dialogue/index.ts — edge function proxy
 */
import { browser } from '$app/environment';
import { db } from '$lib/db/db';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { DialogueRequest, DialogueResponse, TimeOfDay } from '$lib/types/mascot';
import { supabase } from '$lib/supabase/client';

// ============================================================================
// Client-Side Rate Limiting State
// ============================================================================

/** Timestamp of the last LLM call made this session */
let lastCallAt = 0;

/** Minimum ms between any two LLM calls (≈5 calls/min enforced server-side, 1/12s client-side) */
const MIN_CALL_INTERVAL_MS = 12_000;

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
function hashContext(req: DialogueRequest): string {
	const key = [
		req.interactionType,
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

	// 1. Client-side throttle
	const now = Date.now();
	if (now - lastCallAt < MIN_CALL_INTERVAL_MS) return null;

	// 2. Cache check
	const hash = hashContext(request);
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

		// 5. Update throttle timestamp and cache
		lastCallAt = Date.now();
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
