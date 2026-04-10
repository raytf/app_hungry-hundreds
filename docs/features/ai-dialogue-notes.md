# Phase 7: AI Dialogue — Implementation Notes

> Companion to `ai-implementation-spec.md`. Captures architectural decisions and refinements made during planning.

**Last Updated:** 2026-04-10

---

## 1. Speech Bubble — Svelte-Side HTML (Not Rive)

> **Status: Implemented.** See `src/lib/components/SpeechBubble.svelte` and `src/lib/stores/dialogue.svelte.ts`.

The original plan was to put the speech bubble inside the Rive artboard, driven by `dialogueText`/`dialogueVisible` VM properties. The implementation switched to a Svelte HTML/CSS overlay positioned above the Rive canvas. The Rive VM properties were never added to the artboard and are no longer required.

### Architecture

```
triggerGonnDialogue(interactionType, habitId?)   ← production call sites
  → generateDialogue(DialogueRequest)            ← LLM pipeline (cache + throttle)
    → monsterSetDialogue(text)                   ← monster.ts routing
      → showDialogue(text)                       ← dialogue.svelte.ts store
        → SpeechBubble.svelte                   ← HTML/CSS component (reactive)
```

### SpeechBubble.svelte behaviour

- Positioned at `bottom: calc(var(--gonn-size) + 8px)`, `z-[15]`, centred above Gonn
- Typewriter effect at 30 ms/char (skipped for `prefers-reduced-motion`)
- **Persistent** — no auto-hide timer. Bubble stays until the user taps/clicks it or a new message arrives
- **Fade-between-messages** — when a new message replaces an existing one, content fades to opacity 0 over 150 ms, then the new typewriter begins
- Click/tap dismisses (`role="button"`, keyboard accessible, screen-reader live region)
- `Reply →` link navigates to `/chat` without dismissing the bubble

### Monster.svelte Rive path (dead code, kept for forward-compat)

`Monster.svelte` still has `dialogueProp` and `dialogueVisibleProp` handles and a `setDialogue()` export. If the Rive artboard ever gains those VM properties, the Rive path activates automatically. Currently they resolve to `null` (artboard has no speech bubble) and all calls are no-ops.

See `docs/rive-spec.md` §6 for the Rive artboard notes.

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

## 4. Per-Habit Context for habit-complete Dialogue

> **Status: Implemented.** `DialogueRequest` now carries `completedHabitName`, and both caching and client throttling are keyed with that context.

### Implemented behaviour

When the user completes a habit, `triggerGonnDialogue('habit-complete', habitId)` resolves the completed habit from the current snapshot and forwards its name in `completedHabitName`.

That value now affects both:

1. **LLM context** — the edge payload can tell which habit was completed
2. **Cache keys** — `getDialogueCacheKey()` distinguishes `habit-complete:Morning Run` from `habit-complete:Evening Walk`
3. **Client throttle keys** — `getDialogueThrottleKey()` throttles repeated calls for the same completed habit without blocking other interaction keys

### Shared production helpers

`src/lib/ai/dialogue.ts` now exports the helpers used by both production and the monster debug page:

- `getDialogueCacheKey(req)`
- `getDialogueThrottleKey(req)`
- `getDialogueLastCallAt(req)`
- `getDialogueThrottleRemainingMs(req, now?)`
- `DIALOGUE_MIN_CALL_INTERVAL_MS`

This keeps the debug UI aligned with the real cache/throttle implementation instead of re-implementing it locally.

### Current throttle model

The client-side throttle is no longer a single global timestamp. It uses a per-key `Map<string, number>` where the key is:

- `habit-complete:<habitName>` for habit completion events with `completedHabitName`
- `interactionType` for all other dialogue calls

This means two different habits can both trigger dialogue within the same 12-second window, while repeated calls for the same key are still blocked.

### Acceptance Criteria

- [ ] Completing Habit A shows a message referencing Habit A by name
- [ ] Completing Habit B immediately after shows a different message referencing Habit B
- [ ] Completing the same habit twice within 12 s still returns `null` (throttled)
- [ ] Cache entries are per-habit, not per-session context
- [ ] `completedHabitName` is `undefined` for non-habit-complete interaction types (no regression)

### Files Changed

| File                              | Change                                                                                                                            |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/types/mascot.ts`         | Add `completedHabitName?: string` to `DialogueRequest`                                                                            |
| `src/lib/ai/dialogue.ts`          | Export cache/throttle helpers, key cache + throttle per completed habit, populate `completedHabitName` in `triggerGonnDialogue()` |
| `src/routes/monster/+page.svelte` | Reuse production cache/throttle helpers in the debug UI                                                                           |

---

## 5. Response Length Policy

> **Status: Implemented.** The edge function now preserves the full generated message instead of hard-truncating it locally.

### Current behaviour

- `formatDialogueText()` only normalizes whitespace and trims leading/trailing space
- The edge prompt now strongly prefers **one short complete sentence**
- A second sentence is allowed only when needed for clarity
- When formatting behavior changes materially, `DIALOGUE_CACHE_VERSION` should be bumped so stale cached replies are bypassed

### Rationale

Showing the full generated message avoids mid-thought cut-offs. Brevity is now enforced primarily through prompt guidance rather than destructive post-processing.

---

## Summary of Deviations from Original Spec

| Topic               | Original Spec                                 | Actual Implementation                                                             |
| ------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| Speech bubble       | Rive artboard VM properties                   | `SpeechBubble.svelte` HTML/CSS overlay + `dialogueStore`; Rive path is dead code  |
| Bubble visibility   | `dialogueVisible` boolean on CharacterVM      | `dialogueStore.visible` reactive state; auto-hide removed, user-dismisses         |
| Typewriter effect   | JS `setInterval` updating Rive VM string prop | JS `setTimeout` chain updating Svelte `$state` + 150 ms fade between messages     |
| Production triggers | Not specified                                 | `habit-complete` (HabitCardCompact) + `app-open` (home page mount, 1.5 s delay)   |
| Per-habit context   | Not specified                                 | `completedHabitName` included in request + cache/throttle keys                    |
| Edge function CORS  | Not addressed                                 | Required — `OPTIONS` preflight handler added                                      |
| Edge function auth  | Not addressed                                 | JWT validation required                                                           |
| Rate limiting       | Not addressed                                 | Per-user daily cap (50) + per-minute cap (5) via `dialogue_usage` table           |
| Client throttling   | Not addressed                                 | 12 s per-key throttle via `Map<string, number>` keyed by completed habit or event |
| Function URL        | `/functions/gonn-dialogue`                    | `https://<project-ref>.supabase.co/functions/v1/gonn-dialogue`                    |
