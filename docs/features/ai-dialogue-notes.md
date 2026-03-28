# Phase 7: AI Dialogue — Implementation Notes

> Companion to `ai-implementation-spec.md`. Captures architectural decisions and refinements made during planning.

**Last Updated:** 2026-03-28

---

## 1. Speech Bubble in Rive (Not HTML)

The spec originally called for a standalone `SpeechBubble.svelte` component positioned over the canvas with CSS. Instead, the speech bubble will live **inside the Rive artboard**, keeping all visuals in a single renderer.

### Why

- No CSS z-index or positioning math against the canvas
- Bubble inherits Gonn's animation context natively (can react to emotion, stage, etc.)
- Cleaner API: `Monster.svelte` exposes `setDialogue()` instead of managing a separate component
- `SpeechBubble.svelte` from the spec is dropped entirely

### What Rive Needs

| Element                       | Details                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| **Bubble shape**              | Rounded rectangle + tail, part of the character artboard                        |
| **Text run**                  | Bound to `dialogueText` string property on `CharacterVM`                        |
| **Visibility control**        | `dialogueVisible` boolean property on `CharacterVM`                             |
| **State machine transitions** | Hidden by default. `dialogueVisible = true` → animate in; `false` → animate out |

### What Code Needs

New View Model property handles in `Monster.svelte` (same pattern as existing `expressionProp`, `emotionProp`):

```typescript
// In initViewModel()
dialogueProp = vmInstance.string('dialogueText');
dialogueVisibleProp = vmInstance.boolean('dialogueVisible');
```

New exported function:

```typescript
export function setDialogue(text: string, displayMs = 4000): void {
  // 1. Set dialogueVisibleProp.value = true → Rive plays bubble-in animation
  // 2. setInterval at ~30ms/char, updating dialogueProp.value with successive slices
  // 3. After full text shown, wait displayMs
  // 4. Set dialogueVisibleProp.value = false → Rive plays bubble-out animation
}
```

The **typewriter effect runs from JS** — incrementally setting `dialogueProp.value` character by character. Rive re-renders the text run each frame. This is simpler than building reveal animations in Rive for variable-length text.

> **Type check:** Verify `ViewModelInstanceBoolean` is exported from `@rive-app/canvas`. String and Number variants are already imported in `Monster.svelte`.

---

## 2. LLM Proxy Setup

### No External Libraries

The Edge Function runs in **Deno**. The Anthropic API is called via plain `fetch` — no SDK needed. The only import is Deno's standard HTTP server:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
```

### Setup Steps

```bash
# 1. Initialize Supabase locally (creates config.toml + functions directory)
supabase init

# 2. Scaffold the function
supabase functions new gonn-dialogue

# 3. Set the Anthropic API key as a secret (never in .env)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

# 4. Deploy
supabase functions deploy gonn-dialogue
```

The function URL in production: `https://<project-ref>.supabase.co/functions/v1/gonn-dialogue`

Update the client-side `fetch` URL in `dialogue.ts` accordingly (the original spec uses `/functions/gonn-dialogue` which is incorrect).

### CORS Headers (Missing from Original Spec)

The Edge Function must handle preflight `OPTIONS` requests or browser calls will fail:

```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  // ... handler logic
  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
```

### Auth Validation

Validate the `Authorization` header contains a valid Supabase JWT so only authenticated users can invoke the function. Reject unauthenticated requests with 401. This prevents API key abuse.

---

## 3. Rate Limiting & Cost Management

### Cost Per Call

Claude Haiku with the compact dialogue payload (~500 input tokens, ~30 output tokens) costs approximately **$0.00016 per call**.

### Cost Projections

| Users  | Calls/user/day | Daily cost | Monthly cost |
| ------ | -------------- | ---------- | ------------ |
| 100    | 20             | $0.32      | $9.60        |
| 1,000  | 20             | $3.20      | $96          |
| 10,000 | 20             | $32        | $960         |

With the 4-hour cache and rate limits, realistic costs are roughly half these numbers.

### Existing Protections (from spec)

- **4-hour dialogue cache** — identical context hashes return cached responses. Helps but doesn't cap costs since different interactions produce different hashes.

### Edge Function Rate Limiting

Per-user rate limits checked against the JWT `sub` claim in the edge function:

| Limit              | Value        | Purpose                                    |
| ------------------ | ------------ | ------------------------------------------ |
| **Per-minute cap** | 5 calls/min  | Prevents tap-spam                          |
| **Per-day cap**    | 50 calls/day | Bounds worst-case cost to ~$0.008/user/day |

**Tracking:** A `dialogue_usage` table in Supabase:

```sql
CREATE TABLE IF NOT EXISTS dialogue_usage (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  last_called_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, date)
);

-- RLS: users can only read their own usage
ALTER TABLE dialogue_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own usage" ON dialogue_usage
  FOR SELECT USING (auth.uid() = user_id);
```

**Edge function logic:**

```typescript
// Check daily cap
const { data: usage } = await supabase
  .from('dialogue_usage')
  .select('call_count, last_called_at')
  .eq('user_id', userId)
  .eq('date', today)
  .single();

if (usage && usage.call_count >= 50) {
  return new Response(JSON.stringify({ error: 'Daily limit reached' }), {
    status: 429, headers: corsHeaders,
  });
}

// Check per-minute cap
if (usage && usage.call_count > 0) {
  const sinceLast = Date.now() - new Date(usage.last_called_at).getTime();
  // Simple approach: reject if last call was < 12 seconds ago (≈5/min)
  if (sinceLast < 12_000) {
    return new Response(JSON.stringify({ error: 'Too many requests' }), {
      status: 429, headers: corsHeaders,
    });
  }
}

// Upsert usage counter
await supabase.rpc('increment_dialogue_usage', { p_user_id: userId });
```

### Client-Side Throttling (in `dialogue.ts`)

Reduce unnecessary calls before they reach the edge function:

| Control                        | Behavior                                                                           |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| **Debounce rapid completions** | If user checks off 3 habits in 10 seconds, fire one dialogue call for the last one |
| **Tap cooldown**               | Minimum 30-second gap between tap-triggered LLM calls                              |
| **Skip when offline**          | Already handled — `generateDialogue()` returns `null` on fetch failure             |
| **Cache check first**          | Already in spec — 4-hour expiry on context hash                                    |

### Monitoring

- **`dialogue_usage` table** — query for high-usage users, daily totals
- **Anthropic dashboard** — set billing alerts at cost thresholds
- **Supabase Edge Function logs** — monitor invocation counts and error rates in Supabase dashboard

---

## Summary of Deviations from Original Spec

| Topic              | Original Spec                            | Revised                                                                              |
| ------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------ |
| Speech bubble      | `SpeechBubble.svelte` (HTML/CSS overlay) | Inside Rive artboard, driven by `dialogueText` + `dialogueVisible` VM properties     |
| Typewriter effect  | JS `setInterval` updating DOM text       | JS `setInterval` updating Rive VM string property (same mechanism, different target) |
| Edge function CORS | Not addressed                            | Required — `OPTIONS` preflight handler added                                         |
| Edge function auth | Not addressed                            | JWT validation required                                                              |
| Rate limiting      | Not addressed                            | Per-user daily cap (50) + per-minute cap (5) via `dialogue_usage` table              |
| Client throttling  | Not addressed                            | Debounce rapid completions, 30s tap cooldown                                         |
| Function URL       | `/functions/gonn-dialogue`               | `https://<project-ref>.supabase.co/functions/v1/gonn-dialogue`                       |
