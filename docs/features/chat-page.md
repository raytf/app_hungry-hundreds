# Feature: /chat Dedicated Page

## Purpose

Move Gonn's chat interface from a bottom-sheet overlay on the homepage into a dedicated
`/chat` route. This gives the conversation a proper URL, a full-screen canvas, and a natural
back-navigation flow — while keeping the homepage feeling clean and focused on habits.

## User Story

As a user, I want to tap Gonn (or his speech bubble) on the home screen and be taken to a
full conversation page, so that chatting feels intentional and my history is easy to read.

## Current State (to be replaced)

- `GonnChat.svelte` renders a fixed bottom-sheet overlay controlled by `chatVisible` state in `+page.svelte`
- A transparent `<button>` over Gonn's lower half sets `chatVisible = true`
- The overlay sits at `z-index: 100`, covering the habit list

## Implementation Approach

### New Route

`src/routes/chat/+page.svelte` — full-screen chat page.

Layout:
```
┌─────────────────────────────┐
│  Header (back arrow, "Gonn")│
├─────────────────────────────┤
│  Message list (flex-1,      │
│  overflow-y-auto)           │
│                             │
│  Suggestion chips           │
│  (empty state only)         │
├─────────────────────────────┤
│  Input bar + send button    │
│  (sticky bottom)            │
└─────────────────────────────┘
```

The Gonn canvas is **not** rendered on `/chat` — the header title and avatar emoji serve as
identity. Gonn is a home-screen character; the chat page is the "inside his head" space.

### Components

| Component | Action |
|---|---|
| `GonnChat.svelte` | Dissolve into `src/routes/chat/+page.svelte` (inline the UI, or keep as a page-filling component without the overlay wrapper) |
| `SpeechBubble.svelte` | Keep on homepage; add tappable affordance (see trigger options below) |
| `Header.svelte` | Used with `showBack` on `/chat` |

### Store

`src/lib/stores/chat.svelte.ts` — unchanged. `loadOrCreateSession()` called in `onMount`/`$effect` of the chat page.

### Navigation triggers on the homepage

**Decision: Option B + Option A combined.**

Replace `onclick={() => (chatVisible = true)}` on the Gonn tap zone button with `<a href="/chat">`.
Remove `GonnChat` import and `chatVisible` state from `+page.svelte`.

## Chosen Trigger Approach: B + A + Drawer

Three complementary entry points — no new persistent chrome needed:

### A — Gonn tap zone navigates

```svelte
<!-- +page.svelte: replace the transparent <button> with an <a> -->
<a
  href="/chat"
  class="fixed bottom-0 left-1/2 z-[11] -translate-x-1/2 block"
  style="width: var(--gonn-size); height: calc(var(--gonn-size) * 0.5); background: transparent;"
  aria-label="Chat with Gonn"
></a>
```

Silent fallback: always works even when no bubble is showing.

### B — Speech bubble "Reply →" link

```svelte
<!-- SpeechBubble.svelte: inside the bubble, after the text <p> -->
<a
  href="/chat"
  class="mt-1 block text-right text-body-sm font-medium text-accent-warm"
  onclick={(e) => e.stopPropagation()}
>Reply →</a>
```

Primary contextual trigger: Gonn speaks → user sees clear reply affordance.

### Drawer nav item

```ts
// Header.svelte navItems
{ href: '/chat', label: 'Chat with Gonn', Icon: MessageCircle }
```

Added between Add Habit and Journey so chat is always reachable from any page.

## Acceptance Criteria

- [x] `src/routes/chat/+page.svelte` exists and renders the full chat UI
- [x] Header shows back arrow, title "Gonn", navigates to `/`
- [x] `chatStore.loadOrCreateSession()` called on page load
- [x] Message history, streaming, suggestions, and error state all work
- [x] Homepage `chatVisible` state and `GonnChat` import removed
- [x] Gonn tap zone on homepage navigates to `/chat`
- [x] SpeechBubble shows "Reply →" affordance when visible
- [x] `/chat` added to drawer nav between Add Habit and Journey
- [x] `GonnChat.svelte` deleted

## Files Changed

| File | Action |
|---|---|
| `src/routes/chat/+page.svelte` | **Create** |
| `src/routes/+page.svelte` | Remove `chatVisible`, `GonnChat` import; update tap zone |
| `src/lib/components/SpeechBubble.svelte` | Add "Reply →" link when visible |
| `src/lib/components/Header.svelte` | Add `/chat` to drawer nav items |
| `src/lib/components/GonnChat.svelte` | **Delete** (UI moved to route) |
