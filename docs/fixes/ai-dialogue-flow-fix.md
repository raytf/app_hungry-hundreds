# Fix: AI Dialogue Flow Follow-ups

> **Status:** 🔍 INVESTIGATING (2026-04-09)
> **Related:** `docs/features/ai-dialogue-notes.md`, `docs/features/design-guide-implementation.md`

## Purpose

Address the remaining issues in the AI dialogue/speech-bubble flow after fixing the typewriter reactivity loop. This fix aligns the implementation with the intended dialogue UX, removes drift in the debug tooling, fixes server-side dialogue truncation, ensures the speech bubble can comfortably display full-length responses, updates outdated documentation, and adds focused regression coverage.

## Executive Summary

The immediate console-spam bug came from `SpeechBubble.svelte` accidentally tracking `displayText` inside a `$effect` call chain. That root cause is now understood, but several adjacent issues remain in the dialogue stack.

**Issues being fixed:**

- `SpeechBubble.svelte` does not implement the documented fade-between-messages behavior
- The dismiss fade-out path is effectively dead CSS and does not animate on removal
- `src/routes/monster/+page.svelte` has drifted from the production cache/throttle/interaction model
- The edge function hard-cuts dialogue at 80 characters even though the prompt allows up to 160
- The speech bubble width is tuned for short blurbs and should be widened for full-length dialogue
- `docs/features/ai-dialogue-notes.md` is outdated about what is implemented vs planned
- The dialogue flow lacks focused tests for the speech bubble/store lifecycle

**Expected outcome:** The speech bubble behaves predictably when messages change or dismiss, full dialogue responses are no longer chopped mid-sentence, the bubble comfortably fits longer copy, the debug route reflects the real production pipeline, the notes match reality, and the critical flow has regression tests.

**Estimated total implementation time:** 2 hours

## Problem Analysis

### Issue 1: Message transition behavior is incomplete

**Root Cause:** The current bubble implementation clears `displayText` and immediately restarts the typewriter, but does not perform the documented content fade before replacement.

**Current Behavior:** New dialogue interrupts the current text instantly.

**Impact:** Message changes feel abrupt and the implementation no longer matches the documented UX contract.

### Issue 2: Dismiss fade-out is unreachable

**Root Cause:** The CSS selector intended for the exit animation can never match, so the bubble only animates on entry.

**Current Behavior:** Clicking dismiss removes the bubble immediately.

**Impact:** The close interaction feels harsher than designed and contradicts the documented fade-out behavior.

### Issue 3: Monster debug route no longer models production dialogue correctly

**Root Cause:** The debug page maintains its own interaction types, cache-key logic, and throttle assumptions instead of reusing the production model.

**Current Behavior:** Debug output can disagree with real app behavior for cache hits, throttle results, and request semantics.

**Impact:** Debugging AI dialogue becomes misleading and can hide real regressions.

### Issue 4: AI dialogue notes are stale

**Root Cause:** The implementation evolved to include `completedHabitName` and per-key throttling, but the notes still describe them as planned.

**Current Behavior:** Documentation misstates what the app currently does.

**Impact:** Future work is more error-prone because engineers cannot rely on the notes as the current source of truth.

### Issue 5: No focused regression tests cover this flow

**Root Cause:** Existing tests cover the homepage generally, but not the dialogue store, typewriter lifecycle, dismiss path, or replacement path.

**Current Behavior:** Subtle reactive regressions can slip in without failing tests.

**Impact:** The recently fixed reactivity bug could easily reappear during future refactors.

### Issue 6: Edge dialogue is truncated to 80 characters

**Root Cause:** `supabase/functions/gonn-dialogue/index.ts` asks the model for a complete response up to 160 characters, then applies `.slice(0, 80)` before returning it.

**Current Behavior:** Longer complete responses are cut off mid-word or mid-sentence, e.g. a message ending in `35-d`.

**Impact:** Users see broken dialogue, and the UI appears buggy even when the model returned a coherent response.

### Issue 7: Existing cache entries can preserve broken truncated strings

**Root Cause:** Dialogue responses are cached client-side for 4 hours. Once a truncated response is stored, it can keep reappearing after the edge fix.

**Current Behavior:** Users may continue seeing old broken 80-character responses until the cache expires or is cleared.

**Impact:** The production fix can look ineffective and be difficult to verify.

### Issue 8: Bubble width may be too tight for 160-character dialogue

**Root Cause:** `SpeechBubble.svelte` uses `max-w-sm`, which is fine for short blurbs but cramped for longer two-sentence dialogue.

**Current Behavior:** Even when text wraps correctly, the bubble can become tall and visually cramped.

**Impact:** Full-length messages may technically fit but feel crowded and less readable.

## Implementation Plan

### Phase 1: Stabilize SpeechBubble transitions (Priority: Critical)

**Files:** `src/lib/components/SpeechBubble.svelte`

**Changes:**

- Implement explicit message replacement flow that fades content before restarting the typewriter
- Replace the dead dismiss CSS with a real dismiss transition path
- Keep `displayText` out of the `$effect` dependency chain
- Preserve reduced-motion behavior

### Phase 2: Realign monster debug tooling (Priority: High)

**Files:** `src/routes/monster/+page.svelte`, optionally `src/lib/ai/dialogue.ts`

**Changes:**

- Make debug interaction types consistent with `src/lib/types/mascot.ts`
- Reuse or mirror the production cache-key logic accurately, including `completedHabitName`
- Update throttle UX so it no longer assumes a single global timestamp
- Reduce unsafe casts that hide schema drift

### Phase 3: Update dialogue documentation (Priority: High)

**Files:** `docs/features/ai-dialogue-notes.md`

**Changes:**

- Mark implemented per-habit context and per-key throttling as implemented
- Document the actual current message transition behavior after Phase 1
- Remove stale “planned” language that no longer reflects the codebase

### Phase 4: Add regression tests (Priority: High)

**Files:** likely `src/lib/components/SpeechBubble.svelte.spec.ts` and/or `src/lib/ai/dialogue*.spec.ts`

**Changes:**

- Add tests for initial render/typewriter behavior
- Add tests for replacement behavior when a new message arrives
- Add tests for dismiss behavior
- Add at least one regression test ensuring per-character typing does not retrigger the start path infinitely

### Phase 5: Fix server-side truncation and cache invalidation (Priority: Critical)

**Files:** `supabase/functions/gonn-dialogue/index.ts`, `src/lib/ai/dialogue.ts`

**Changes:**

- Remove the contradictory hard 80-character truncation in the edge function
- Format dialogue to respect the 160-character product limit without cutting mid-word where possible
- Version the client cache key so previously cached truncated responses are bypassed after deployment

### Phase 6: Increase speech-bubble capacity for 160-char copy (Priority: High)

**Files:** `src/lib/components/SpeechBubble.svelte`, optionally `docs/UI.md`

**Changes:**

- Widen the bubble from `max-w-sm` to a roomier responsive width
- Keep wrapping behavior and mobile safety intact
- Verify the `Reply →` affordance still fits cleanly under longer text

## Implementation Order

| Order | Phase                                             | Files Changed                                                         | Risk Level | Time Est. |
| ----- | ------------------------------------------------- | --------------------------------------------------------------------- | ---------- | --------- |
| 1     | Stabilize SpeechBubble transitions                | `src/lib/components/SpeechBubble.svelte`                              | Medium     | 45 min    |
| 2     | Realign monster debug tooling                     | `src/routes/monster/+page.svelte`, optional helper reuse              | Medium     | 30 min    |
| 3     | Fix server-side truncation and cache invalidation | `supabase/functions/gonn-dialogue/index.ts`, `src/lib/ai/dialogue.ts` | Medium     | 30 min    |
| 4     | Increase speech-bubble capacity                   | `src/lib/components/SpeechBubble.svelte`                              | Low        | 15 min    |
| 5     | Update dialogue documentation                     | `docs/features/ai-dialogue-notes.md`, optional `docs/UI.md`           | Low        | 15 min    |
| 6     | Add regression tests                              | dialogue component/test files                                         | Medium     | 30 min    |

## Testing Strategy

### Unit Tests

- Component-level test for `SpeechBubble.svelte` typing and replacement behavior
- Test for dismiss/hide behavior
- Helper-level test for cache-key versioning / truncation-safe formatting if introduced

### Integration Tests

- Run the smallest relevant Vitest targets covering the modified component(s)
- Run targeted checks for any files touched by the debug route changes

### Manual Testing Checklist

- Trigger app-open dialogue on the homepage
- Trigger a dialogue longer than 80 characters and confirm it renders as a complete thought
- Trigger a second dialogue while the first is visible and confirm smooth replacement
- Dismiss the bubble and confirm exit animation/cleanup
- Click `Reply →` and verify navigation still works without accidental dismissal
- Use the monster debug page and confirm cache/throttle info matches real production behavior

## Edge Cases

### 1. Same message shown twice in a row

**Scenario:** The same dialogue text is emitted twice while the bubble is already visible.

**Handling:** Decide explicitly whether this should restart the transition/typewriter or preserve the current message; implement consistently and test it.

### 2. Reduced-motion users

**Scenario:** `prefers-reduced-motion: reduce` is enabled.

**Handling:** Skip animation timing and show the final text directly while still respecting visibility state.

### 3. Route navigation during visible dialogue

**Scenario:** The user clicks `Reply →` while the bubble is visible and then returns home.

**Handling:** Ensure behavior is intentional and documented, whether state persists or is cleared.

### 4. Message replacement mid-typewriter

**Scenario:** A new message arrives while the old one is still typing.

**Handling:** Cancel prior timers, transition cleanly, and avoid stale callbacks writing into the new state.

### 5. Old truncated cache entries after deploy

**Scenario:** The client has cached 80-character dialogue from before the edge fix.

**Handling:** Change the cache-key version or clear dialogue cache so the app does not keep serving broken old responses.

### 6. Long but valid 160-character replies on small screens

**Scenario:** The model returns close to the full allowed length on a narrow mobile viewport.

**Handling:** Use a larger responsive max width while preserving wrapping and avoiding off-screen overflow.

## Rollback Plan

### Immediate Rollback

- Revert the SpeechBubble transition changes and return to the simpler immediate-replace behavior if the new transition logic introduces instability

### Partial Rollback by Feature

- Keep documentation and debug-page cleanup even if transition polish is rolled back
- Keep the edge truncation fix even if bubble sizing is revisited separately
- Keep tests that capture the original infinite-loop regression regardless of UX rollback

### Data Recovery

- No persistent data migration is involved; rollback is code-only

## Performance Considerations

- Keep transition state local to `SpeechBubble.svelte`
- Avoid extra reactive dependencies inside `$effect`
- Prefer one active timer/transition at a time to prevent buildup of stale callbacks
- Prefer slightly wider bubbles over smaller font sizes so 160-char messages remain readable
- Ensure tests do not rely on long real-time waits when fake timers or shorter delays can be used

## Acceptance Criteria

- [ ] `SpeechBubble.svelte` supports clean message replacement without reintroducing the reactive loop
- [ ] Bubble dismiss uses a real exit path rather than dead CSS
- [ ] `src/routes/monster/+page.svelte` reflects current production interaction/cache/throttle semantics
- [ ] Edge dialogue is no longer hard-truncated at 80 characters
- [ ] Existing truncated cache entries are bypassed after the fix
- [ ] The speech bubble comfortably displays a complete 160-character response on supported mobile layouts
- [ ] `docs/features/ai-dialogue-notes.md` matches the implemented dialogue flow
- [ ] Focused automated tests cover the speech bubble lifecycle and the loop regression
- [ ] Reduced-motion behavior still works correctly
