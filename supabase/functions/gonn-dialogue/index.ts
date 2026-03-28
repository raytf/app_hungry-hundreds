/**
 * gonn-dialogue Edge Function
 *
 * LLM proxy for Gonn mascot dialogue generation.
 * Validates the caller's Supabase JWT, enforces per-user rate limits
 * (5 calls/min, 50 calls/day) via the dialogue_usage table, then
 * calls Anthropic Claude Haiku and returns a short dialogue string.
 *
 * Env vars required (set via `supabase secrets set`):
 *   ANTHROPIC_API_KEY        — Anthropic API key (server-side only)
 *   SUPABASE_URL             — auto-injected by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime
 *   SUPABASE_ANON_KEY        — auto-injected by Supabase runtime
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
	'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

function json(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
	});
}

// ── Rate limits ──────────────────────────────────────────────────────────────
const RATE_LIMIT_PER_MINUTE = 5;
const RATE_LIMIT_PER_DAY = 50;

// ── Prompt builders ──────────────────────────────────────────────────────────
function buildSystemPrompt(): string {
	return [
		'You are Gonn, a small quirky creature who lives inside a habit tracker app.',
		'You speak in short, punchy sentences (max 80 characters).',
		"You are enthusiastic, occasionally sarcastic, and genuinely care about the user's habits.",
		'You reference specific habit names and streaks when provided.',
		'You never use emojis. You never break character.',
		'Respond with ONLY the dialogue string — no quotes, no JSON, just the text Gonn says.'
	].join(' ');
}

function buildUserPrompt(req: Record<string, unknown>): string {
	const mascot = (req.mascotState ?? {}) as Record<string, unknown>;
	const gonn = (req.gonn ?? {}) as Record<string, unknown>;
	const habits = ((req.habits ?? []) as Array<Record<string, unknown>>).slice(0, 5);
	const mem = (req.memory ?? {}) as Record<string, Array<{ value: string }>>;
	const time = (req.timeContext ?? {}) as Record<string, unknown>;

	const habitLine =
		habits
			.map((h) => `"${h.name}" streak:${h.streakLength}${h.dangerZone ? ' (danger!)' : ''}`)
			.join(', ') || 'none yet';

	const permMem = (mem.permanent ?? []).map((m) => m.value).join('; ') || 'none';
	const shortMem =
		(mem.shortTerm ?? [])
			.slice(0, 5)
			.map((m) => m.value)
			.join('; ') || 'none';

	return `Context:
- Interaction: ${req.interactionType}
- Time: ${time.timeOfDay} on ${time.dayOfWeek}
- Gonn mood: ${mascot.primaryEmotion} (intensity ${mascot.emotionIntensity}/100)
- Gonn stage: ${gonn.evolutionStage}/5 (satiation ${gonn.satiation}/100)
- Habits: ${habitLine}
- Long-term memory: ${permMem}
- Recent events: ${shortMem}

Say something short and in-character as Gonn. Max 80 characters.`;
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
	if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

	// 1. Auth — decode the JWT payload to extract the user ID.
	//    The Supabase gateway (Cloudflare) verifies the JWT signature before
	//    routing to this function, so decoding without re-verifying is safe.
	//    This avoids auth.getUser() which fails with new ES256 JWTs.
	const authHeader = req.headers.get('Authorization');
	if (!authHeader) return json({ error: 'Unauthorized' }, 401);

	const token = authHeader.replace(/^Bearer\s+/i, '');
	let userId: string;
	try {
		const parts = token.split('.');
		if (parts.length !== 3) throw new Error('malformed');
		// base64url → base64: swap chars then add required padding
		const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
		const payload = JSON.parse(atob(padded));
		if (!payload.sub || payload.role !== 'authenticated') throw new Error('unauthenticated');
		userId = payload.sub as string;
	} catch {
		return json({ error: 'Unauthorized' }, 401);
	}
	// 2. Rate limit (service role bypasses RLS)
	const serviceClient = createClient(
		Deno.env.get('SUPABASE_URL') ?? '',
		Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
	);
	const { data: usage, error: rpcErr } = await serviceClient
		.rpc('increment_dialogue_usage', { p_user_id: userId })
		.single<{ minute_count: number; day_count: number }>();

	if (rpcErr || !usage) return json({ error: 'Rate limit check failed' }, 500);
	if (usage.minute_count >= RATE_LIMIT_PER_MINUTE)
		return json({ error: 'Rate limit: per-minute' }, 429);
	if (usage.day_count >= RATE_LIMIT_PER_DAY) return json({ error: 'Rate limit: daily' }, 429);

	// 3. Parse body
	let body: Record<string, unknown>;
	try {
		body = await req.json();
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}

	// 4. Call Anthropic
	const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
	if (!apiKey) return json({ error: 'Server misconfiguration' }, 500);

	try {
		const res = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01'
			},
			body: JSON.stringify({
				model: 'claude-haiku-4-5',
				max_tokens: 60,
				system: buildSystemPrompt(),
				messages: [{ role: 'user', content: buildUserPrompt(body) }]
			})
		});

		if (!res.ok) return json({ error: 'LLM call failed' }, 502);

		const data = (await res.json()) as { content: Array<{ type: string; text: string }> };
		const dialogue = data.content
			.filter((c) => c.type === 'text')
			.map((c) => c.text)
			.join('')
			.trim()
			.slice(0, 80);

		return json({ dialogue });
	} catch {
		return json({ error: 'Network error' }, 502);
	}
});
