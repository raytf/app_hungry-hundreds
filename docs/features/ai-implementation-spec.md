# Hungry Hundreds: AI Companion Implementation Spec

> Agent reference for building the rule engine, AI dialogue system, and Rive animation bridge on the existing SvelteKit + Dexie + Supabase MVP.

---

## Existing Stack (Do Not Modify)

- **Framework:** SvelteKit SPA, Cloudflare adapter, deployed to Cloudflare Pages
- **Local DB:** Dexie.js — `habits` and `habitLogs` tables exist, Svelte store wrappers for reactive queries
- **Backend:** Supabase — PostgreSQL, magic link auth, Row-Level Security
- **Sync:** Background sync via service worker — writes to Dexie first, POSTs to Supabase when online
- **Package Manager:** pnpm
- **Animation:** `@rive-app/canvas` installed, `Monster.svelte` component renders `.riv` file
- **Character:** Gonn's face exists in Rive with joystick-driven `lookX`/`lookY` number inputs on a state machine

---

## Architecture Overview

Three new modules layer onto the existing habit engine:

```
User taps Complete
  → Existing habit store updates streak (already built)
  → Rule engine maps to MascotState (instant, no LLM)
  → Rive Bridge sets animation inputs on Monster.svelte
  → LLM call fires async via Supabase Edge Function
  → Speech bubble appears with dialogue (1–2s later)
```

The rule engine and Rive bridge are **synchronous and deterministic**. The LLM dialogue is **async and optional** — if it fails or the user is offline, Gonn still animates correctly from the rule engine. Dialogue simply doesn't appear.

---

## Type Definitions

### HabitSnapshot (per-habit, emitted on every event)

```typescript
interface HabitSnapshot {
  habitId: string;
  habitName: string;
  flavorTag: 'brain-food' | 'protein' | 'dessert' | 'soul-food' | 'vitamins' | 'mystery-meal';
  schedule: HabitSchedule;

  streakLength: number;
  streakHealth: 'strong' | 'steady' | 'fragile' | 'broken';

  completionCount: number;        // total completions ever (never resets)
  hitCompletion100: boolean;      // just reached 100 completions

  window: WindowStatus;
  completedToday: boolean;

  dangerZone: boolean;
  dangerZoneLabel?: string;

  missedWindows: number;
  lastCompletionTime: string;
}

interface HabitSchedule {
  type: 'daily' | 'weekly' | 'every-x-days';
  timesPerWeek?: number;
  intervalDays?: number;
}

interface WindowStatus {
  windowMet: boolean;
  completionsInWindow: number;
  targetForWindow: number;
  windowProgress: number;         // 0–1
  windowDeadline: string;
  daysRemaining: number;
  isScheduledToday: boolean;
}
```

### GonnState (persistent mascot state)

Stored in Dexie (`gonnState` table), synced to Supabase. Updated on every habit completion, every app open, and at midnight rollover.

```typescript
interface GonnState {
  satiation: number;              // 0–100, drives evolution stage
  evolutionStage: number;         // 1–5, derived from satiation + hysteresis
  peakStage: number;              // highest stage ever reached

  lastFedAt: string;              // ISO timestamp of last completion (any habit)
  daysSinceLastFed: number;       // calendar days with zero completions
  expectedDailyFeeds: number;     // calibrated from habit schedules

  totalCompletions: number;       // lifetime total across all habits, never resets
}
```

Key: `satiation` fluctuates and drives evolution. `totalCompletions` only grows. They are independent.

### GlobalSnapshot (aggregated, what the rule engine operates on)

```typescript
interface GlobalSnapshot {
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
  pendingFeast: HabitSnapshot[];  // habits that just hit 100 completions
}
```

### MascotState (output of rule engine, drives Rive)

```typescript
interface MascotState {
  primaryEmotion: 'idle' | 'happy' | 'excited' | 'tired' | 'sad' | 'sleeping' | 'eating' | 'celebrating';
  emotionIntensity: number;       // 0–100
  lookX: number;                  // 0–100 (joystick)
  lookY: number;                  // 0–100 (joystick)
  evolutionStage: number;         // 1–5 (MVP uses 1–3)
  trigger?: 'levelUp' | 'regress' | 'celebrate100' | 'streakSave' | 'nudge';
  context: MascotContext;
}

interface MascotContext {
  type: 'ambient' | 'feast' | 'evolution' | 'regression';
  urgentHabit?: HabitSnapshot;
  completionRatio?: number;
  feastHabit?: HabitSnapshot;
  regressionFrom?: number;
  regressionTo?: number;
}
```

### DialogueRequest (sent async to LLM)

```typescript
interface DialogueRequest {
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
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek: string;
    hourOfDay: number;
  };
  // Canonical values from RULE_ENGINE_SPEC.md (kebab-case)
  interactionType: 'habit-complete' | 'app-open' | 'tap' | 'lapse-return' | 'feast' | 'evolution' | 'regression';
}

interface DialogueResponse {
  dialogue: string;               // max 80 characters
  emotion?: string;               // optional override of rule engine emotion
}
```

---

## New Dexie Tables

Add to existing Dexie schema (new version increment):

```typescript
// Add to existing HungryHundredsDB class
this.version(N).stores({
  // ... existing tables unchanged ...
  gonnState: 'id',                           // singleton, id = 'gonn'
  mascotMemory: '++id, type, key, createdAt', // permanent + short-term memories
  dialogueCache: 'contextHash, createdAt',    // LLM response cache
});

interface MemoryEntry {
  id?: number;
  type: 'permanent' | 'short-term';
  key: string;                    // e.g. 'identity', 'anchor_habit', 'completion', 'lapse_reason'
  value: string;                  // the actual memory content
  createdAt: string;              // ISO timestamp
}
```

---

## Rule Engine Implementation

### Mood Derivation

```typescript
function deriveMood(global: GlobalSnapshot): MascotState['primaryEmotion'] {
  if (global.allCompletedToday) {
    return global.completedTodayCount >= 3 ? 'excited' : 'happy';
  }
  if (global.completedTodayCount > 0) {
    return global.anyInDangerZone ? 'idle' : 'happy';
  }
  if (global.completedTodayCount === 0) {
    return global.anyInDangerZone ? 'tired' : 'idle';
  }
  if (global.anyBroken) return 'tired';
  return 'idle';
}
```

### Intensity Modulation

```typescript
function deriveIntensity(global: GlobalSnapshot): number {
  const scheduledToday = global.habits.filter(h => h.window.isScheduledToday);
  const scheduledCompleted = scheduledToday.filter(h => h.completedToday).length;
  const completionRatio = scheduledToday.length > 0
    ? scheduledCompleted / scheduledToday.length : 1;

  const dangerCount = scheduledToday.filter(h => h.dangerZone).length;
  const brokenCount = global.habits.filter(h => h.streakHealth === 'broken').length;

  let base = completionRatio * 80;
  base -= dangerCount * 10;
  base -= brokenCount * 20;
  return Math.max(10, Math.min(100, base));
}
```

### Look Direction

```typescript
function deriveLookDirection(global: GlobalSnapshot): { lookX: number; lookY: number } {
  let lookX = 50, lookY = 50;

  if (global.anyInDangerZone && !global.allCompletedToday) {
    lookY = 60; lookX = 35 + Math.random() * 10;
  }
  if (global.anyBroken) { lookY = 65; }
  if (global.allCompletedToday) { lookX = 50; lookY = 45; }

  return { lookX, lookY };
}
```

### Complete deriveMascotState()

```typescript
function deriveMascotState(global: GlobalSnapshot): MascotState {
  // Priority 1: Feast (habit hit 100 completions)
  if (global.pendingFeast.length > 0) {
    return {
      primaryEmotion: 'celebrating', emotionIntensity: 100,
      lookX: 50, lookY: 50, evolutionStage: global.gonn.evolutionStage,
      trigger: 'celebrate100',
      context: { type: 'feast', feastHabit: global.pendingFeast[0] },
    };
  }

  // Priority 2: Evolution
  if (global.pendingEvolution) {
    return {
      primaryEmotion: 'celebrating', emotionIntensity: 100,
      lookX: 50, lookY: 50, evolutionStage: global.gonn.evolutionStage,
      trigger: 'levelUp',
      context: { type: 'evolution' },
    };
  }

  // Priority 3: Regression
  if (global.pendingRegression) {
    return {
      primaryEmotion: 'tired', emotionIntensity: 30,
      lookX: 50, lookY: 60, evolutionStage: global.gonn.evolutionStage,
      trigger: 'regress',
      context: { type: 'regression' },
    };
  }

  // Priority 4: Ambient mood
  const mood = deriveMood(global);
  const intensity = deriveIntensity(global);
  const { lookX, lookY } = deriveLookDirection(global);

  const urgent = global.habits
    .filter(h => h.window.isScheduledToday)
    .sort((a, b) => (b.dangerZone ? 1 : 0) - (a.dangerZone ? 1 : 0))[0];

  return {
    primaryEmotion: mood, emotionIntensity: intensity,
    lookX, lookY, evolutionStage: global.gonn.evolutionStage,
    context: {
      type: 'ambient',
      urgentHabit: urgent?.dangerZone ? urgent : undefined,
      completionRatio: global.scheduledTodayCount > 0
        ? global.completedTodayCount / global.scheduledTodayCount : 1,
    },
  };
}
```

### Danger Zone Windows

Flag these completion-count ranges (not calendar days) as known dropout windows:

| Window | Completion Count | Label |
|--------|-----------------|-------|
| First-week cliff | 4–10 | "This is where most people stop" |
| Motivation plateau | 18–24 | "The excitement has faded. Discipline takes over." |
| Mid-term crisis | 35–45 | "Halfway feels like forever" |
| Automaticity gap | 55–65 | "Almost automatic, but not quite" |

### Evolution Stage Thresholds (MVP: 3 stages)

| Stage | Satiation Range | Form |
|-------|----------------|------|
| 1 — Egg | 0–10 | Small, round, mostly face/eyes |
| 2 — Juvenile | 11–50 | Limbs visible, teeth/horns emerge |
| 3 — Apex | 51+ | Full kaiju form, tail, special FX |

Evolution is permanent (never devolve). Satiation fluctuates and drives visual energy/expressiveness, but `evolutionStage` only goes up.

---

## Rive Bridge

### State Machine Inputs (extend existing)

The existing Monster.svelte already handles `lookX` and `lookY`. Add these inputs to the Rive state machine:

| Input Name | Type | Source | Purpose |
|-----------|------|--------|---------|
| `lookX` | Number (0–100) | Existing joystick | X-axis head direction |
| `lookY` | Number (0–100) | Existing joystick | Y-axis head direction |
| `emotion` | Number | Rule engine → `primaryEmotion` mapped to int | Drives emotion state transitions |
| `emotionIntensity` | Number (0–100) | Rule engine | Modulates animation blend weights |
| `evolutionStage` | Number (1–3) | GonnState | Controls which Solo group is active |
| `evolveNow` | Trigger | Fires when evolution threshold crossed | Plays one-shot evolution cutscene |

### Emotion → Number Mapping

```typescript
const EMOTION_MAP: Record<MascotState['primaryEmotion'], number> = {
  idle: 0,
  happy: 1,
  excited: 2,
  tired: 3,
  sad: 4,
  sleeping: 5,
  eating: 6,
  celebrating: 7,
};
```

### Monster.svelte Extension Pattern

```svelte
<script>
  import { onMount } from 'svelte';
  import { Rive, Layout, Fit } from '@rive-app/canvas';
  import { mascotStore } from '$lib/stores/mascot';

  let canvas;
  let rive;
  let inputs = {};

  onMount(() => {
    rive = new Rive({
      src: '/animations/monster.riv',
      canvas,
      autoplay: true,
      layout: new Layout({ fit: Fit.Contain }),
      stateMachines: 'MainStateMachine',
      onLoad: () => {
        const allInputs = rive.stateMachineInputs('MainStateMachine');
        inputs = {
          lookX: allInputs.find(i => i.name === 'lookX'),
          lookY: allInputs.find(i => i.name === 'lookY'),
          emotion: allInputs.find(i => i.name === 'emotion'),
          emotionIntensity: allInputs.find(i => i.name === 'emotionIntensity'),
          evolutionStage: allInputs.find(i => i.name === 'evolutionStage'),
          evolveNow: allInputs.find(i => i.name === 'evolveNow'),
        };
      }
    });
  });

  // Reactive: whenever mascotStore updates, push to Rive
  $: if (inputs.emotion && $mascotStore) {
    inputs.lookX.value = $mascotStore.lookX;
    inputs.lookY.value = $mascotStore.lookY;
    inputs.emotion.value = EMOTION_MAP[$mascotStore.primaryEmotion] ?? 0;
    inputs.emotionIntensity.value = $mascotStore.emotionIntensity;
    inputs.evolutionStage.value = $mascotStore.evolutionStage;
    if ($mascotStore.trigger === 'levelUp') inputs.evolveNow?.fire();
  }

  // Tap handler
  function handleTap() {
    // Briefly show happy, then call AI for dialogue
    if (inputs.emotion) inputs.emotion.value = EMOTION_MAP.happy;
    dispatch('tap');
  }
</script>

<canvas bind:this={canvas} on:click={handleTap} />
```

---

## AI Dialogue Layer

### Supabase Edge Function: `/functions/gonn-dialogue`

```typescript
// supabase/functions/gonn-dialogue/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const SYSTEM_PROMPT = `You are Gonn, a kaiju monster companion in a habit-tracking app.
You speak in short, punchy sentences (max 80 characters). You use food metaphors constantly.
You are hungry, loyal, slightly dramatic, and genuinely caring underneath the bravado.

Personality by evolution stage:
- Egg (stage 1): curious, needy, simple sentences. "Feed me!" energy.
- Juvenile (stage 2): playful, sarcastic, developing attitude. Food critic vibes.
- Apex (stage 3): wise, philosophical, but still hungry. Mentor who speaks in meal metaphors.

RULES:
- Max 80 characters per response
- Always in character as Gonn
- Never generic motivational language — always food/hunger metaphors
- Reference specific memories when provided
- On lapse return: use "never miss twice" framing, celebrate the comeback
- In danger zones: acknowledge the difficulty directly, reference that most people quit here

Output JSON only: { "dialogue": "...", "emotion": "happy|tired|excited|null" }
The emotion field is optional — only include it to override the rule engine's emotion.`;

serve(async (req) => {
  const { mascotState, gonn, habits, memory, timeContext, interactionType } = await req.json();

  const userPrompt = JSON.stringify({
    interaction: interactionType,
    mascotState: { emotion: mascotState.primaryEmotion, intensity: mascotState.emotionIntensity, stage: gonn.evolutionStage },
    habits: habits.map(h => ({ name: h.name, streak: h.streakLength, dangerZone: h.dangerZone, completedToday: h.window?.completionsInWindow > 0 })),
    memories: {
      identity: memory.permanent.find(m => m.key === 'identity')?.value,
      anchor: memory.permanent.find(m => m.key === 'anchor_habit')?.value,
      recent: memory.shortTerm.slice(-5).map(m => `${m.key}: ${m.value}`),
    },
    time: timeContext,
  });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  try {
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());
    return new Response(JSON.stringify(parsed), { headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ dialogue: text.slice(0, 80), emotion: null }), { headers: { 'Content-Type': 'application/json' } });
  }
});
```

### Client-Side Dialogue Pipeline

```typescript
// src/lib/ai/dialogue.ts
import { db } from '$lib/db';

export async function generateDialogue(request: DialogueRequest): Promise<DialogueResponse | null> {
  // 1. Check cache
  const hash = hashContext(request);
  const cached = await db.dialogueCache.get(hash);
  if (cached && Date.now() - new Date(cached.createdAt).getTime() < 4 * 60 * 60 * 1000) {
    return JSON.parse(cached.response);
  }

  // 2. Call edge function
  try {
    const res = await fetch('/functions/gonn-dialogue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!res.ok) return null;

    const data: DialogueResponse = await res.json();

    // 3. Cache response
    await db.dialogueCache.put({ contextHash: hash, response: JSON.stringify(data), createdAt: new Date().toISOString() });

    return data;
  } catch {
    // Offline or error — return null, rule engine still drives animation
    return null;
  }
}

function hashContext(req: DialogueRequest): string {
  // Simple hash of interaction type + emotion + hour + streak lengths
  const key = `${req.interactionType}-${req.mascotState.primaryEmotion}-${req.timeContext.hourOfDay}-${req.habits.map(h => h.streakLength).join(',')}`;
  return btoa(key).slice(0, 32);
}
```

---

## Memory System

### Writing Memories

```typescript
// On habit completion
async function onHabitComplete(habit: HabitSnapshot) {
  await db.mascotMemory.add({
    type: 'short-term',
    key: 'completion',
    value: `Completed ${habit.habitName} (streak: ${habit.streakLength}, ${habit.dangerZone ? 'in danger zone' : 'steady'})`,
    createdAt: new Date().toISOString(),
  });
}

// On lapse recovery
async function onLapseReturn(reason: string) {
  await db.mascotMemory.add({
    type: 'short-term',
    key: 'lapse-return',
    value: `Returned after miss. Reason: ${reason}`,
    createdAt: new Date().toISOString(),
  });
}

// On onboarding (permanent)
async function onOnboardingComplete(identity: string, anchorHabit: string) {
  await db.mascotMemory.bulkAdd([
    { type: 'permanent', key: 'identity', value: identity, createdAt: new Date().toISOString() },
    { type: 'permanent', key: 'anchor_habit', value: anchorHabit, createdAt: new Date().toISOString() },
  ]);
}
```

### Reading Memories for LLM

```typescript
async function getMemoryContext(): Promise<{ permanent: MemoryEntry[]; shortTerm: MemoryEntry[] }> {
  const permanent = await db.mascotMemory.where('type').equals('permanent').toArray();
  const shortTerm = await db.mascotMemory
    .where('type').equals('short-term')
    .reverse().sortBy('createdAt');

  // Trim: keep last 10 short-term entries
  return { permanent, shortTerm: shortTerm.slice(0, 10) };
}

// Weekly cleanup: remove short-term entries older than 7 days
async function trimShortTermMemory() {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await db.mascotMemory
    .where('type').equals('short-term')
    .and(entry => entry.createdAt < cutoff)
    .delete();
}
```

---

## SpeechBubble.svelte

```svelte
<script>
  export let text = '';
  export let visible = false;

  let displayText = '';
  let typewriterIndex = 0;
  let timer;

  $: if (visible && text) {
    displayText = '';
    typewriterIndex = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      if (typewriterIndex < text.length) {
        displayText = text.slice(0, ++typewriterIndex);
      } else {
        clearInterval(timer);
        setTimeout(() => { visible = false; }, 4000);
      }
    }, 30);
  }

  function dismiss() {
    clearInterval(timer);
    visible = false;
  }
</script>

{#if visible}
  <div class="speech-bubble" on:click={dismiss} role="button" tabindex="0">
    <p>{displayText}</p>
    <div class="tail" />
  </div>
{/if}

<style>
  .speech-bubble {
    position: absolute;
    bottom: calc(100% + 12px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface, #1a1a2e);
    border: 1px solid var(--color-border, #2a2a4a);
    border-radius: 12px;
    padding: 8px 14px;
    max-width: 240px;
    animation: bubbleIn 0.25s ease-out;
    cursor: pointer;
    z-index: 10;
  }
  .speech-bubble p {
    margin: 0;
    font-size: 13px;
    line-height: 1.4;
    color: var(--color-text, #e0e0e0);
  }
  .tail {
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-top: 8px solid var(--color-surface, #1a1a2e);
  }
  @keyframes bubbleIn {
    from { opacity: 0; transform: translateX(-50%) scale(0.85) translateY(6px); }
    to { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
  }
</style>
```

---

## Reactive Wiring (Main Orchestration)

```typescript
// src/lib/stores/mascot.ts
import { derived } from 'svelte/store';
import { habitStore } from '$lib/stores/habits';
import { gonnStore } from '$lib/stores/gonn';

// Derive GlobalSnapshot from existing stores
export const globalSnapshot = derived(
  [habitStore, gonnStore],
  ([$habits, $gonn]) => buildGlobalSnapshot($habits, $gonn)
);

// Derive MascotState from GlobalSnapshot (instant, deterministic)
export const mascotState = derived(
  globalSnapshot,
  ($snapshot) => deriveMascotState($snapshot)
);
```

### On Habit Complete (trigger both rule engine + async LLM)

```typescript
async function handleHabitComplete(habitId: string) {
  // 1. Update habit store (existing code)
  await completeHabit(habitId);

  // 2. Rule engine fires automatically via derived store → Rive updates instantly

  // 3. Write memory
  const snapshot = get(globalSnapshot);
  const habit = snapshot.habits.find(h => h.habitId === habitId);
  if (habit) await onHabitComplete(habit);

  // 4. Async: generate dialogue (non-blocking)
  const memory = await getMemoryContext();
  const dialogueReq = buildDialogueRequest(get(mascotState), get(gonnStore), snapshot.habits, memory, 'completion');
  const response = await generateDialogue(dialogueReq);
  if (response) {
    speechBubbleStore.set({ text: response.dialogue, visible: true });
  }
}
```

---

## Gonn's Personality Voice Examples

For LLM prompt testing — these are the voice targets:

| Context | Example Dialogue |
|---------|-----------------|
| Habit completed, Day 7 | "A whole week! I can taste the growth." |
| Habit completed, Day 45 | "Halfway. You taste different now — stronger." |
| Danger zone, not done | "Day 22. This is where most stop. Not us." |
| Lapse return | "Hey. You came back. Most don't." |
| Tap, habit done | "Stop poking, I'm digesting your effort." |
| Tap, habit pending | "Not to be dramatic but I'm literally starving." |
| Evolution moment | "I have ARMS now! That's because of YOU." |
| Night time, idle | "*yawn* Go sleep. Tomorrow's meal won't cook itself." |
| Morning, pending | "Coffee's poured. You know what comes next." |

---

## File Structure (New Files)

```
src/lib/
├── ai/
│   ├── dialogue.ts          # LLM dialogue pipeline + caching
│   ├── ruleEngine.ts        # deriveMascotState() + helpers
│   └── memory.ts            # Memory read/write/trim
├── stores/
│   ├── mascot.ts            # Derived MascotState store
│   └── gonn.ts              # GonnState store (Dexie-backed)
├── components/
│   ├── Monster.svelte       # EXTEND existing (add new Rive inputs)
│   └── SpeechBubble.svelte  # NEW
└── types/
    └── mascot.ts            # All interfaces above

supabase/functions/
└── gonn-dialogue/
    └── index.ts             # Edge function LLM proxy
```

---

## Performance Targets

- Rive `.riv` file: < 30KB
- Total JS bundle: < 100KB
- Animation framerate: 30+ fps on budget Android
- LLM response latency: < 2s (async, non-blocking)
- Rule engine execution: < 5ms (synchronous)
- Dialogue cache hit rate: > 50% (4-hour expiry)
- Offline: animations + rule engine work fully, dialogue hidden