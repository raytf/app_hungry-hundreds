/**
 * gonn-chat Edge Function
 *
 * Streaming LLM proxy for multi-turn Gonn chat (Phase 8).
 * Auth-gated via JWT decode. In-memory rate limit: 20 messages/user/hour.
 * Pipes Claude SSE stream directly to the client.
 *
 * Env vars required:
 *   ANTHROPIC_API_KEY         — Anthropic API key
 *   SUPABASE_URL              — auto-injected by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected by Supabase runtime
 */
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

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

// ── Auth ─────────────────────────────────────────────────────────────────────

function extractUserId(req: Request): string | null {
	const auth = req.headers.get('Authorization');
	if (!auth) return null;
	try {
		const token = auth.replace(/^Bearer\s+/i, '');
		const parts = token.split('.');
		if (parts.length !== 3) return null;
		const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
		const payload = JSON.parse(atob(padded));
		if (!payload.sub || payload.role !== 'authenticated') return null;
		return payload.sub as string;
	} catch {
		return null;
	}
}

// ── Rate limiter (in-memory, per cold-start instance) ────────────────────────

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
	const now = Date.now();
	const timestamps = (rateLimitMap.get(userId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
	if (timestamps.length >= RATE_LIMIT) {
		rateLimitMap.set(userId, timestamps);
		return true;
	}
	timestamps.push(now);
	rateLimitMap.set(userId, timestamps);
	return false;
}

// ── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Gonn, a kaiju monster companion in a habit-tracking app.
You speak in short, punchy sentences (2–3 sentences per message max). You use food metaphors constantly.
You are hungry, loyal, slightly dramatic, and genuinely caring underneath the bravado.

Your job: help the user understand and improve their habits. You have access to their habit data.
Reference it directly — specific streak numbers, habit names, danger zones. Never be generic. Always be Gonn.

Personality by evolution stage:
- Egg (stage 1): curious, needy, simple sentences. "Feed me!" energy.
- Hatchling (stage 2): excitable, clingy, slightly more verbal. "More! More!" energy.
- Juvenile (stage 3): playful, sarcastic, developing attitude. Food critic vibes.
- Adult (stage 4): confident, opinionated, protective. Head chef energy.
- Apex (stage 5): wise, philosophical, but still hungry. Mentor who speaks in meal metaphors.

RULES:
- Max 3 sentences per reply
- Always food/hunger metaphors
- When asked for advice, give ONE specific, actionable thing
- Never break character
- Reference habit names and streak numbers when relevant
- On danger zone habits: acknowledge the difficulty directly`;

// ── Context builder ───────────────────────────────────────────────────────────

function buildHabitContext(
	gonn: Record<string, unknown>,
	habits: Array<Record<string, unknown>>,
	memory: Record<string, Array<{ key: string; value: string }>>
): string {
	const habitLines = habits
		.map(
			(h) =>
				`- ${h.name}: streak ${h.streakLength}, ` +
				`${h.completedToday ? 'done today ✓' : 'PENDING today'}, ` +
				`${h.dangerZone ? `⚠️ DANGER ZONE: ${h.dangerZoneLabel ?? 'dropout risk'}` : 'healthy'}`
		)
		.join('\n');

	const recentMemory = (memory.shortTerm ?? [])
		.slice(-3)
		.map((m) => m.value)
		.join(' | ');

	const identity = (memory.permanent ?? []).find((m) => m.key === 'identity')?.value ?? 'not set';
	const anchorHabit =
		(memory.permanent ?? []).find((m) => m.key === 'anchor_habit')?.value ?? 'not set';

	return `[GONN'S CURRENT STATE]
Stage: ${gonn.evolutionStage}/5 | Satiation: ${gonn.satiation}/100 | Total completions: ${gonn.totalCompletions}

[HABIT DATA]
${habitLines || 'No habits yet.'}

[MEMORIES]
Identity: ${identity}
Anchor habit: ${anchorHabit}
Recent activity: ${recentMemory || 'none'}`;
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
	if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
	if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

	// Auth
	const userId = extractUserId(req);
	if (!userId) return json({ error: 'Unauthorized' }, 401);

	// Rate limit
	if (isRateLimited(userId)) {
		return json(
			{ error: 'rate_limited', message: 'Max 20 messages per hour. Gonn needs to digest.' },
			200
		);
	}

	// Parse body
	let body: Record<string, unknown>;
	try {
		body = await req.json();
	} catch {
		return json({ error: 'Invalid JSON' }, 400);
	}

	const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
	if (!apiKey) return json({ error: 'Server misconfiguration' }, 500);

	const messages = (body.messages ?? []) as Array<{ role: string; content: string }>;
	const gonn = (body.gonn ?? {}) as Record<string, unknown>;
	const habits = (body.habits ?? []) as Array<Record<string, unknown>>;
	const memory = (body.memory ?? {}) as Record<string, Array<{ key: string; value: string }>>;

	const habitContext = buildHabitContext(gonn, habits, memory);

	// Inject context as a synthetic opening exchange (invisible to user)
	const fullMessages = [
		{ role: 'user', content: habitContext },
		{ role: 'assistant', content: 'I have consumed your data. Ask me anything.' },
		...messages
	];

	try {
		const upstream = await fetch('https://api.anthropic.com/v1/messages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'x-api-key': apiKey,
				'anthropic-version': '2023-06-01',
				'anthropic-beta': 'prompt-caching-2024-07-31'
			},
			body: JSON.stringify({
				model: 'claude-haiku-4-5',
				max_tokens: 300,
				stream: true,
				system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
				messages: fullMessages
			})
		});

		if (!upstream.ok || !upstream.body) {
			return json({ error: 'upstream_error', status: upstream.status }, 200);
		}

		// Pipe SSE stream directly to the client
		return new Response(upstream.body, {
			headers: {
				...CORS_HEADERS,
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache'
			}
		});
	} catch {
		return json({ error: 'Gonn is unreachable. Try again soon.' }, 200);
	}
});
