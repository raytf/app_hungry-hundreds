Gonn Chat — AI Agent Implementation Spec
Agent reference for implementing the interactive Gonn chatbot feature on the existing Hungry Hundreds SvelteKit + Dexie + Supabase MVP.

> **⚠️ UI APPROACH SUPERSEDED:** The GonnChat overlay described in Step 5 has been replaced
> by a dedicated `/chat` route. The store (Step 4), edge function (Step 3), and history
> utility (Step 2) are unchanged and still canonical. For the new page-based UI approach,
> see `docs/features/chat-page.md`.

> **⚠️ PREREQUISITES: This spec requires Phase 5 (Rule Engine & Rive) and Phase 7 (AI Dialogue) to be complete before implementation.**
>
> Check `STATUS.md` to verify these phases are marked ✅ Complete before proceeding.
> If they are not complete, implement them first using `docs/features/ai-implementation-spec.md` and `docs/RULE_ENGINE_SPEC.md`.

Context & Constraints
This feature builds on the existing stack. Do not modify any existing files unless explicitly instructed below.

Implemented Today (Phases 1–4, 6)

Framework: SvelteKit SPA, Cloudflare adapter, Cloudflare Pages

Local DB: Dexie.js — habits, habitLogs tables (schema at src/lib/db/db.ts)

Backend: Supabase — PostgreSQL, magic link auth, Row-Level Security

Sync: Background sync via service worker

Package manager: pnpm

Available After Phase 5 (Rule Engine & Rive) — verify before using

Local DB additions: gonnState, mascotMemory, dialogueCache tables (added to src/lib/db/db.ts)

Animation: @rive-app/canvas, Monster.svelte renders .riv file with MainStateMachine

Types in src/lib/types/mascot.ts: GonnState, HabitSnapshot, GlobalSnapshot, MascotState, MemoryEntry

Available After Phase 7 (AI Dialogue) — verify before using

Existing edge function: supabase/functions/gonn-dialogue/index.ts (do not modify)

Types in src/lib/types/mascot.ts: DialogueRequest, DialogueResponse

Memory system: src/lib/ai/memory.ts with getMemoryContext(), writeChatMemory()

> **Note on event type naming:** `RULE_ENGINE_SPEC.md` is the authoritative source for event type values.
> It uses kebab-case: `'habit-complete'`, `'app-open'`, `'tap'`, `'lapse-return'`, `'feast'`, `'evolution'`, `'regression'`.
> If `ai-implementation-spec.md` uses snake_case (`'app_open'`, `'lapse_return'`), treat the kebab-case values from `RULE_ENGINE_SPEC.md` as canonical.

Feature Overview
Add a persistent chat interface where the user can have a multi-turn conversation with Gonn. Gonn has full awareness of the user's habit data, memory entries, and current mascot state. The chat streams token-by-token. Gonn stays in character at all times.

Data flow:

text
User types message
  → Client appends to local messages[]
  → POST to gonn-chat edge function (messages[] + habit context + memory)
  → Claude streams SSE response
  → Client reads ReadableStream, renders tokens as they arrive
  → On stream end, full message appended to messages[]
  → Session persisted to Dexie chatSessions table
Step 1 — Dexie Schema Update
File: src/lib/db/db.ts

Add a new table to the existing HungryHundredsDB class. Increment the version number.

typescript
this.version(N).stores({
  // ... all existing tables unchanged ...
  chatSessions: '++id, createdAt',
});
Add the following interface to src/lib/types/mascot.ts:

typescript
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatSession {
  id?: number;
  messages: ChatMessage[];
  summary?: string;   // compressed summary of turns older than WINDOW_SIZE
  createdAt: string;
  updatedAt: string;
}
Step 2 — Chat History Utility
New file: src/lib/ai/chatHistory.ts

typescript
import type { ChatMessage, ChatSession } from '$lib/types/mascot';

const WINDOW_SIZE = 10;

/**
 * Returns a trimmed messages array safe to send to the LLM.
 * Keeps the last WINDOW_SIZE turns. If a summary of older turns exists,
 * it is prepended as a synthetic user/assistant exchange.
 */
export function trimHistory(session: Pick<ChatSession, 'messages' | 'summary'>): ChatMessage[] {
  const { messages, summary } = session;

  if (messages.length <= WINDOW_SIZE) return messages;

  const recent = messages.slice(-WINDOW_SIZE);

  if (summary) {
    return [
      { role: 'user', content: `[Earlier in our conversation: ${summary}]` },
      { role: 'assistant', content: 'I remember. I have digested all of it.' },
      ...recent,
    ];
  }

  return recent;
}

/**
 * Produces a 1–2 sentence plain-text summary of the provided messages.
 * Used when session history exceeds WINDOW_SIZE to compress older turns.
 * Call this before slicing, passing the turns being discarded.
 */
export function summariseTurns(turns: ChatMessage[]): string {
  // Simple heuristic: extract assistant messages only, join key phrases
  const assistantLines = turns
    .filter(m => m.role === 'assistant')
    .map(m => m.content.slice(0, 60))
    .join(' | ');
  return `Gonn previously discussed: ${assistantLines}`;
}
Step 3 — Supabase Edge Function
New file: supabase/functions/gonn-chat/index.ts

typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// --- Auth helper ---
async function getAuthenticatedUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (error || !user) return null;
  return user.id;
}

// --- In-memory rate limiter (20 messages/user/hour) ---
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(t => now - t < RATE_WINDOW_MS);
  rateLimitMap.set(userId, timestamps);

  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  return false;
}

const SYSTEM_PROMPT = `You are Gonn, a kaiju monster companion in a habit-tracking app.
You speak in short, punchy sentences (2–3 sentences per message max). You use food metaphors constantly.
You are hungry, loyal, slightly dramatic, and genuinely caring underneath the bravado.

Your job in this conversation: help the user understand and improve their habits.
You have access to their habit data. Reference it directly — specific streak numbers, habit names,
danger zones. Never be generic. Always be Gonn.

Personality by evolution stage (see RULE_ENGINE_SPEC.md for authoritative stages):
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // --- Auth gate ---
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return new Response(
      JSON.stringify({ error: 'unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // --- Rate limit gate ---
  if (isRateLimited(userId)) {
    return new Response(
      JSON.stringify({ error: 'rate_limited', message: 'Max 20 messages per hour. Gonn needs to digest.' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { messages, gonn, habits, memory } = await req.json();

  // Build habit context string injected as synthetic opening exchange
  const habitContext = buildHabitContext(gonn, habits, memory);

  const fullMessages = [
    // Synthetic exchange: inject context without polluting visible chat history
    { role: 'user', content: habitContext },
    { role: 'assistant', content: 'I have consumed your data. Ask me anything.' },
    ...messages,
  ];

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      stream: true,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: fullMessages,
    }),
  });

  if (!upstream.ok) {
    return new Response(
      JSON.stringify({ error: 'upstream_error', status: upstream.status }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Pipe Claude's SSE stream directly to the client
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
    },
  });
});

function buildHabitContext(gonn: any, habits: any[], memory: any): string {
  const habitLines = habits
    .map(h =>
      `- ${h.name}: streak ${h.streakLength}, ` +
      `${h.completedToday ? 'done today ✓' : 'PENDING today'}, ` +
      `${h.dangerZone ? `⚠️ DANGER ZONE: ${h.dangerZoneLabel ?? 'dropout risk'}` : 'healthy'}`
    )
    .join('\n');

  const recentMemory = memory.shortTerm
    .slice(-3)
    .map((m: any) => m.value)
    .join(' | ');

  return `[GONN'S CURRENT STATE]
Stage: ${gonn.evolutionStage}/5 | Satiation: ${gonn.satiation}/100 | Total completions ever: ${gonn.totalCompletions}
Days since last fed: ${gonn.daysSinceLastFed} // NOTE: computed from GonnState.lastFedAt, not a stored field

[HABIT DATA]
${habitLines}

[MEMORIES]
Identity: ${memory.permanent.find((m: any) => m.key === 'identity')?.value ?? 'not set'}
Anchor habit: ${memory.permanent.find((m: any) => m.key === 'anchor_habit')?.value ?? 'not set'}
Recent activity: ${recentMemory || 'none'}`;
}
Step 4 — Chat Store
New file: src/lib/stores/chat.ts

typescript
import { db } from '$lib/db';
import { gonnStore } from '$lib/stores/gonn';
import { globalSnapshot } from '$lib/stores/mascot';
import { getMemoryContext } from '$lib/ai/memory';
import { trimHistory, summariseTurns } from '$lib/ai/chatHistory';
import type { ChatMessage, ChatSession } from '$lib/types/mascot';

const WINDOW_SIZE = 10;

class ChatStore {
  session = $state<ChatSession | null>(null);
  streaming = $state(false);
  streamingContent = $state('');
  error = $state<string | null>(null);

  async loadOrCreateSession() {
    const existing = await db.chatSessions.orderBy('createdAt').last();
    if (existing) {
      this.session = existing;
    } else {
      const newSession: ChatSession = {
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const id = await db.chatSessions.add(newSession);
      this.session = { ...newSession, id };
    }
    this.streaming = false;
    this.streamingContent = '';
    this.error = null;
  }

  async send(userInput: string) {
    if (!userInput.trim() || this.streaming || !this.session) return;

    const userMsg: ChatMessage = { role: 'user', content: userInput };

    // Append user message and mark streaming
    this.session = {
      ...this.session,
      messages: [...this.session.messages, userMsg],
      updatedAt: new Date().toISOString(),
    };
    this.streaming = true;
    this.streamingContent = '';
    this.error = null;

    const session = this.session;

    // Summarise overflow turns before trimming
    let summary = session.summary;
    if (session.messages.length > WINDOW_SIZE) {
      const overflow = session.messages.slice(0, session.messages.length - WINDOW_SIZE);
      summary = summariseTurns(overflow);
    }

    const trimmed = trimHistory({ messages: session.messages, summary });

    // Build request payload
    const memory = await getMemoryContext();
    const snapshot = globalSnapshot;

    const payload = {
      messages: trimmed,
      gonn: gonnStore,
      habits: snapshot.habits.map(h => ({
        name: h.habitName,
        flavorTag: h.flavorTag,
        completionCount: h.completionCount,
        streakLength: h.streakLength,
        completedToday: h.completedToday,
        dangerZone: h.dangerZone,
        dangerZoneLabel: h.dangerZoneLabel,
        window: {
          completionsInWindow: h.window?.completionsInWindow,
          targetForWindow: h.window?.targetForWindow,
          daysRemaining: h.window?.daysRemaining,
        },
      })),
      memory,
    };

    try {
      const res = await fetch('/functions/gonn-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        this.streaming = false;
        this.error = 'Failed to reach Gonn.';
        return;
      }

      // Stream SSE response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') break;
          try {
            const data = JSON.parse(raw);
            if (data.type === 'content_block_delta' && data.delta?.text) {
              fullResponse += data.delta.text;
              this.streamingContent = fullResponse;
            }
          } catch { /* ignore malformed SSE lines */ }
        }
      }

      // Commit completed assistant message
      const assistantMsg: ChatMessage = { role: 'assistant', content: fullResponse };
      const updatedSession: ChatSession = {
        ...this.session,
        messages: [...this.session.messages, assistantMsg],
        summary,
        updatedAt: new Date().toISOString(),
      };
      // Persist to Dexie (fire-and-forget)
      db.chatSessions.put(updatedSession);
      this.session = updatedSession;
      this.streaming = false;
      this.streamingContent = '';

    } catch {
      this.streaming = false;
      this.error = 'Gonn is offline. Try again.';
    }
  }

  clearError() {
    this.error = null;
  }

  async newSession() {
    const newSession: ChatSession = {
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const id = await db.chatSessions.add(newSession);
    this.session = { ...newSession, id };
    this.streaming = false;
    this.streamingContent = '';
    this.error = null;
  }
}

export const chatStore = new ChatStore();
Step 5 — GonnChat.svelte Component
New file: src/lib/components/GonnChat.svelte

text
<script lang="ts">
  import { tick } from 'svelte';
  import { chatStore } from '$lib/stores/chat';

  // Svelte 5: use $props() instead of export let
  let { visible = $bindable(false) }: { visible: boolean } = $props();

  let inputValue = $state('');
  let messagesEl: HTMLDivElement | undefined = $state();

  // Suggested prompts to help users get started
  const SUGGESTIONS = [
    'How am I doing overall?',
    'Which habit needs the most attention?',
    'Why do I keep missing habits?',
    'Am I making real progress?',
    'What should I focus on tomorrow?',
  ];

  // Svelte 5: use $effect instead of onMount
  $effect(() => {
    chatStore.loadOrCreateSession();
  });

  // Svelte 5: use $effect instead of $: reactive statement
  $effect(() => {
    // Track reactive dependencies
    chatStore.session?.messages;
    chatStore.streamingContent;
    // Auto-scroll to bottom when messages update
    tick().then(() => {
      messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
    });
  });

  async function handleSubmit() {
    if (!inputValue.trim() || chatStore.streaming) return;
    const msg = inputValue;
    inputValue = '';
    await chatStore.send(msg);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function useSuggestion(text: string) {
    inputValue = text;
    handleSubmit();
  }
</script>

{#if visible}
  <div class="chat-overlay" role="dialog" aria-label="Chat with Gonn">
    <div class="chat-panel">

      <header class="chat-header">
        <span class="chat-title">Chat with Gonn</span>
        <button class="close-btn" onclick={() => (visible = false)} aria-label="Close chat">✕</button>
      </header>

      <div class="messages" bind:this={messagesEl}>
        {#if chatStore.session?.messages.length === 0 && !chatStore.streaming}
          <!-- Empty state: show suggestions -->
          <div class="empty-state">
            <p class="empty-hint">Ask Gonn about your habits...</p>
            <div class="suggestions">
              {#each SUGGESTIONS as suggestion}
                <button class="suggestion-chip" onclick={() => useSuggestion(suggestion)}>
                  {suggestion}
                </button>
              {/each}
            </div>
          </div>
        {/if}

        {#each chatStore.session?.messages ?? [] as msg}
          <div class="message {msg.role}">
            <p>{msg.content}</p>
          </div>
        {/each}

        {#if chatStore.streaming}
          <div class="message assistant streaming">
            <p>{chatStore.streamingContent}<span class="cursor">▊</span></p>
          </div>
        {/if}

        {#if chatStore.error}
          <div class="error-banner">
            {chatStore.error}
            <button onclick={() => chatStore.clearError()}>Dismiss</button>
          </div>
        {/if}
      </div>

      <footer class="chat-footer">
        <textarea
          bind:value={inputValue}
          onkeydown={handleKeydown}
          placeholder={chatStore.streaming ? 'Gonn is thinking...' : 'Ask Gonn anything...'}
          disabled={chatStore.streaming}
          rows="1"
        />
        <button
          class="send-btn"
          onclick={handleSubmit}
          disabled={chatStore.streaming || !inputValue.trim()}
          aria-label="Send message"
        >
          ↑
        </button>
      </footer>

    </div>
  </div>
{/if}

<style>
  .chat-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 100;
    padding: 0 0 env(safe-area-inset-bottom);
  }

  .chat-panel {
    background: var(--color-surface, #1a1a2e);
    border: 1px solid var(--color-border, #2a2a4a);
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-width: 480px;
    height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    animation: slideUp 0.25s ease-out;
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid var(--color-border, #2a2a4a);
    flex-shrink: 0;
  }

  .chat-title {
    font-weight: 600;
    font-size: 15px;
    color: var(--color-text, #e0e0e0);
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-muted, #888);
    cursor: pointer;
    font-size: 16px;
    padding: 4px 8px;
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    scroll-behavior: smooth;
  }

  .message {
    max-width: 80%;
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 14px;
    line-height: 1.45;
  }

  .message p {
    margin: 0;
    color: var(--color-text, #e0e0e0);
  }

  .message.user {
    align-self: flex-end;
    background: var(--color-accent, #4a3fa0);
    border-bottom-right-radius: 4px;
  }

  .message.assistant {
    align-self: flex-start;
    background: var(--color-surface-raised, #252540);
    border-bottom-left-radius: 4px;
  }

  .cursor {
    display: inline-block;
    animation: blink 1s step-end infinite;
    opacity: 0.7;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 0;
  }

  .empty-hint {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-muted, #888);
    text-align: center;
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .suggestion-chip {
    background: var(--color-surface-raised, #252540);
    border: 1px solid var(--color-border, #2a2a4a);
    border-radius: 20px;
    padding: 6px 12px;
    font-size: 12px;
    color: var(--color-text, #e0e0e0);
    cursor: pointer;
    transition: background 0.15s;
  }

  .suggestion-chip:hover {
    background: var(--color-surface-hover, #2e2e50);
  }

  .error-banner {
    background: rgba(200, 50, 50, 0.2);
    border: 1px solid rgba(200, 50, 50, 0.4);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 13px;
    color: #ff8080;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #ff8080;
    cursor: pointer;
    font-size: 12px;
    padding: 0 4px;
  }

  .chat-footer {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--color-border, #2a2a4a);
    flex-shrink: 0;
  }

  textarea {
    flex: 1;
    background: var(--color-surface-raised, #252540);
    border: 1px solid var(--color-border, #2a2a4a);
    border-radius: 12px;
    padding: 10px 14px;
    color: var(--color-text, #e0e0e0);
    font-size: 14px;
    resize: none;
    line-height: 1.4;
    max-height: 120px;
    overflow-y: auto;
    outline: none;
  }

  textarea:focus {
    border-color: var(--color-accent, #4a3fa0);
  }

  textarea::placeholder {
    color: var(--color-text-muted, #888);
  }

  .send-btn {
    background: var(--color-accent, #4a3fa0);
    border: none;
    border-radius: 50%;
    width: 38px;
    height: 38px;
    color: white;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @keyframes slideUp {
    from { transform: translateY(40px); opacity: 0; }
    to   { transform: translateY(0);   opacity: 1; }
  }

  @keyframes blink {
    0%, 100% { opacity: 0.7; }
    50%       { opacity: 0; }
  }
</style>
Step 6 — Wire into Monster.svelte (Chat Trigger)
Modify: src/lib/components/Monster.svelte

Add a chat open button or extend the existing handleTap dispatcher to open the chat panel. In the parent page that renders Monster.svelte, add the GonnChat component:

text
<!-- In the parent page (e.g. src/routes/+page.svelte) -->
<script lang="ts">
  import Monster from '$lib/components/Monster.svelte';
  import GonnChat from '$lib/components/GonnChat.svelte';
  import SpeechBubble from '$lib/components/SpeechBubble.svelte';

  let chatVisible = $state(false);

  function handleGonnTap() {
    chatVisible = true;
  }
</script>

<Monster ontap={handleGonnTap} />
<GonnChat bind:visible={chatVisible} />
<SpeechBubble />
The Monster.svelte component already dispatches a tap event from handleTap(). Svelte 5 uses `ontap` instead of `on:tap`. No changes to the Rive bridge or state machine are required.

Step 7 — Memory Write: Capture Chat Insights
Modify: src/lib/ai/memory.ts

Add an optional function to write notable chat moments as permanent memories. Call this from the chat store after detecting key phrases (e.g. user mentions a reason for lapsing).

typescript
/**
 * Write a permanent memory when the user reveals something meaningful in chat.
 * Call when user messages contain intent signals (e.g. "I keep missing because...",
 * "my goal is...", "I struggle with...").
 */
export async function writeChatMemory(key: string, value: string): Promise<void> {
  // Overwrite existing memory with same key (permanent memories are singletons)
  const existing = await db.mascotMemory
    .where('key').equals(key)
    .and(e => e.type === 'permanent')
    .first();

  if (existing?.id) {
    await db.mascotMemory.update(existing.id, { value, createdAt: new Date().toISOString() });
  } else {
    await db.mascotMemory.add({
      type: 'permanent',
      key,
      value,
      createdAt: new Date().toISOString(),
    });
  }
}
New Files Summary
text
src/lib/
├── ai/
│   └── chatHistory.ts          # trimHistory(), summariseTurns()
├── stores/
│   └── chat.ts                 # chatStore — send(), loadOrCreateSession(), newSession()
├── components/
│   └── GonnChat.svelte         # NEW — chat panel UI, suggestions, streaming renderer
└── types/
    └── mascot.ts               # EXTEND — add ChatMessage, ChatSession interfaces

supabase/functions/
└── gonn-chat/
    └── index.ts                # NEW — streaming edge function, habit context injection
Modified files:

src/lib/db/db.ts — add chatSessions table, increment schema version

src/lib/types/mascot.ts — add ChatMessage, ChatSession

src/lib/ai/memory.ts — add writeChatMemory()

Parent page component — mount GonnChat, handle ontap

Constraints & Notes for Agent
Do not modify gonn-dialogue/index.ts, Monster.svelte internals, mascot.ts store, or any existing Dexie table definitions.

Increment the Dexie schema version cleanly — do not replace existing stores({}) calls, use .version(N).stores({}).

ANTHROPIC_API_KEY is already set as a Supabase Edge Function secret — do not add it elsewhere.

No new npm packages — use only what is already installed (@rive-app/canvas, dexie, svelte).

CSS variables (--color-surface, --color-accent, etc.) follow the existing design system — do not hardcode colours.

The edge function must return HTTP 200 in all error paths (upstream failure, timeout, rate limit) with a JSON { error: string } body so the client can handle it gracefully without an uncaught exception. The one exception is 401 for unauthenticated requests.

The gonn-chat edge function is auth-gated: it verifies the JWT from the Authorization header using Supabase's `createClient` with the service role key. Unauthenticated requests are rejected with a 401 response.

Rate limiting: max 20 messages per user per hour, enforced via an in-memory Map in the edge function. This is a simple per-instance limiter — it resets on cold starts. For production scale, consider moving to a Redis-backed or Supabase table-backed limiter.

The trimHistory() window of 10 turns must not be changed without also updating the context injection synthetic exchange count.

Chat sessions persist across app opens via Dexie. loadOrCreateSession() resumes the most recent session. newSession() is available for future UI (e.g. "Start fresh" button).