# Fix: Dialogue Length and Prompt Guidance

## Purpose
Remove server-side hard cutting of Gonn dialogue so the full generated message can be shown, while tightening prompt guidance so the model usually returns one short complete sentence.

## Executive Summary
- The current edge formatter still truncates overlong dialogue locally.
- Clearing client cache cannot fix freshly truncated server responses.
- The client should bypass old cached shortened replies after deployment.
- The prompt should prefer one short sentence instead of relying on post-generation slicing.
- Expected outcome: dialogue renders as a complete thought, usually in one concise sentence, without mid-thought cut-offs.
- Estimated total implementation time: 30–45 minutes.

## Problem Analysis

### Issue 1: Server-side formatter cuts valid output
**Root Cause:** `supabase/functions/gonn-dialogue/format.ts` slices responses to `MAX_DIALOGUE_CHARS` and appends punctuation/ellipsis.
**Current Behavior:** Longer model output is shortened after generation, so the bubble shows incomplete content.
**Impact:** Users still see clipped dialogue even after clearing local cache.

### Issue 2: Prompt and formatter work against each other
**Root Cause:** The prompt asks for short dialogue, but the formatter still acts as a hard backstop by cutting text.
**Current Behavior:** The system depends on truncation instead of better prompt discipline.
**Impact:** Output quality drops whenever the model slightly exceeds the target length.

### Issue 3: Old cached shortened responses can survive deploys
**Root Cause:** Dialogue responses are cached client-side for four hours by a versioned key.
**Current Behavior:** Previously stored shortened replies can continue to display after a server fix unless the cache version changes.
**Impact:** Users may keep seeing broken legacy responses after rollout.

## Implementation Plan

### Phase 1: Remove hard truncation from the edge formatter (Priority: Critical)
**Files:** `supabase/functions/gonn-dialogue/format.ts`
**Changes:**
- Keep whitespace normalization.
- Stop slicing/ellipsizing generated dialogue.
- Optionally keep only a large emergency guard if needed later, but not a product-length hard cut.

### Phase 2: Improve prompt guidance for concise output (Priority: High)
**Files:** `supabase/functions/gonn-dialogue/index.ts`
**Changes:**
- Update system prompt to prefer exactly one short sentence when possible.
- Explicitly forbid fragments, quotes, lists, and filler.
- Keep wording focused on “complete thought” rather than a strict local truncation limit.

### Phase 3: Invalidate old cached shortened responses (Priority: High)
**Files:** `src/lib/ai/dialogue.ts`
**Changes:**
- Bump the dialogue cache version so pre-fix cached replies are bypassed after deployment.

### Phase 4: Add/adjust regression tests (Priority: High)
**Files:** `src/lib/ai/gonnDialogueFormat.spec.ts`
**Changes:**
- Replace trim-oriented expectations with pass-through expectations for long complete text.
- Keep coverage for whitespace normalization.

## Implementation Order
| Order | Phase | Files Changed | Risk Level | Time Est. |
|-------|-------|---------------|------------|-----------|
| 1 | Remove formatter hard cut | `supabase/functions/gonn-dialogue/format.ts` | Medium | 10 min |
| 2 | Tighten prompt guidance | `supabase/functions/gonn-dialogue/index.ts` | Low | 10 min |
| 3 | Bump client cache version | `src/lib/ai/dialogue.ts` | Low | 5 min |
| 4 | Update and run tests | `src/lib/ai/gonnDialogueFormat.spec.ts` | Low | 10–20 min |

## Testing Strategy
### Unit Tests
- Verify short dialogue is unchanged.
- Verify long dialogue is preserved rather than truncated.
- Verify whitespace normalization still occurs.

### Integration Tests
- Use the monster debug route to generate dialogue and confirm the full returned text is displayed.
- Confirm a fresh request is made after cache version bump.

### Manual Testing Checklist
- Clear existing dialogue cache or rely on the new cache version.
- Trigger `app-open` or debug dialogue.
- Confirm the bubble shows the full returned message.
- Confirm typical output is still one short sentence.

## Edge Cases
### 1. Model returns an overly long paragraph
**Scenario:** The LLM ignores prompt guidance.
**Handling:** Accept the full response for now; if this becomes common, add a non-destructive rewrite pass rather than slicing.

### 2. Legacy shortened entries remain in IndexedDB
**Scenario:** A user already has cached pre-fix responses.
**Handling:** Cache version bump forces new cache keys.

### 3. Response contains awkward whitespace
**Scenario:** The model emits repeated spaces or line breaks.
**Handling:** Preserve formatting cleanup in `formatDialogueText()`.

## Rollback Plan
### Immediate Rollback
- Restore the previous formatter if unexpectedly long dialogue harms the UI.

### Partial Rollback by Feature
- Keep the cache-version bump and prompt improvements even if truncation logic is restored.

### Data Recovery
- No persistent data migration is involved; rollback is code-only.

## Performance Considerations
- Bundle size impact: none.
- Runtime impact: negligible.
- Network/token cost: unchanged per request; prompt text changes only slightly.

## Acceptance Criteria
- [ ] The edge formatter no longer hard-truncates dialogue.
- [ ] Dialogue cache version is bumped so old shortened replies are bypassed.
- [ ] Prompt guidance strongly steers output toward one short complete sentence.
- [ ] Focused tests pass for long pass-through dialogue and whitespace normalization.
- [ ] Users no longer see mid-thought cut-offs caused by local server formatting.
