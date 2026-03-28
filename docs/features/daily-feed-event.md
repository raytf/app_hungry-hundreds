# Feature: Daily Feed Event (Fire Counter)

## Status: Future (not yet implemented)

## Purpose

Decouple habit completion from instant feeding. Instead of each habit completion immediately adding satiation, completions accumulate in a "fire" counter throughout the day. At the end of each day (or first app open the next morning), a single "feed event" fires — consuming the accumulated fire to feed Gonn in a visually satisfying animation/cutscene.

## User Story

As a user, I want my habit completions to build up throughout the day so that I experience a rewarding daily "feed event" the next time I open the app — making the feeding feel like a meaningful ritual rather than incremental drips.

## Current Behavior (v1 — Instant Feeding)

Each `habits.toggle()` immediately calls `feedGonn()`, which:
1. Increments `feedsToday` counter
2. Calculates harmonic feed amount (`1/n` for the nth completion)
3. Adds satiation instantly
4. Updates evolution stage

## Proposed Behavior (v2 — Daily Feed Event)

### Phase 1: Fire Counter Accumulation

When a habit is completed:
1. Increment a `fireCounter` on GonnState (not satiation)
2. Each completion adds `+1` fire (simple count — harmonic conversion happens at feed time)
3. Uncompletion subtracts `1` fire
4. UI shows a fire/flame counter near Gonn (e.g., 🔥 × 3)

### Phase 2: End-of-Day Feed Event

At the end of each day (midnight rollover or configurable time):
1. Snapshot the `fireCounter` value
2. Convert fire to satiation using the harmonic series: `sum(1/n for n in 1..fireCounter)`
3. Reset `fireCounter` to 0
4. Store the pending feed as `pendingFeedEvent` on GonnState

### Phase 3: Morning Feed Animation

The first time the user opens the app after a feed event:
1. Detect `pendingFeedEvent` exists
2. Play a feed cutscene/animation:
   - Show previous day's fire count
   - Animate Gonn eating/consuming the fire
   - Show satiation bar filling up
   - If evolution threshold crossed, play evolution animation
3. Clear `pendingFeedEvent` after animation completes
4. User can tap to skip the animation

## Technical Design

### Data Model Changes

```typescript
interface GonnState {
  // ... existing fields ...

  /** Accumulated fire from today's completions (not yet fed) */
  fireCounter: number;
  /** Pending feed event from previous day (null if none) */
  pendingFeedEvent: {
    fireCount: number;       // how many completions
    satiationGain: number;   // pre-calculated harmonic sum
    date: string;            // YYYY-MM-DD of the day
  } | null;
}
```

### Feed Event Trigger

```typescript
// Called at midnight rollover or first app-open of a new day
function processDailyFeed(gonn: GonnState): GonnState {
  if (gonn.fireCounter <= 0) return gonn;

  // Calculate harmonic sum
  let gain = 0;
  for (let n = 1; n <= gonn.fireCounter; n++) {
    gain += 1.0 / n;
  }

  return {
    ...gonn,
    fireCounter: 0,
    pendingFeedEvent: {
      fireCount: gonn.fireCounter,
      satiationGain: gain,
      date: gonn.lastFedDate
    }
  };
}

// Called after animation completes (or skip)
function consumeFeedEvent(gonn: GonnState): GonnState {
  if (!gonn.pendingFeedEvent) return gonn;

  const newSatiation = Math.min(100, gonn.satiation + gonn.pendingFeedEvent.satiationGain);
  return {
    ...gonn,
    satiation: newSatiation,
    pendingFeedEvent: null,
    lastFedAt: new Date().toISOString()
  };
}
```

### UI Components

- **FireCounter** — Small badge near Gonn showing 🔥 × N
- **FeedCutscene** — Full-screen overlay with Rive animation
  - Gonn eating animation
  - Satiation bar fill animation
  - Evolution transition (if applicable)
  - Tap-to-skip affordance

### Integration Points

- `habits.toggle()` → increment/decrement `fireCounter` instead of calling `feedGonn()`
- `tickDecay()` → also calls `processDailyFeed()` on day boundary
- App root layout → checks for `pendingFeedEvent` on mount, shows cutscene
- Rive → new "eating" state machine trigger for the cutscene

## Acceptance Criteria

- [ ] Habit completions increment fire counter (not satiation)
- [ ] Fire counter visible in UI near Gonn
- [ ] End-of-day triggers feed event with harmonic sum calculation
- [ ] Morning app open shows feed animation/cutscene
- [ ] Animation shows previous day's fire count and satiation gain
- [ ] Evolution animation plays if threshold crossed during feed
- [ ] User can tap to skip animation
- [ ] Uncompletion decrements fire counter
- [ ] Works offline (feed event stored locally, synced later)
- [ ] Zero-fire days still trigger normal decay

## Performance Considerations

- Feed event calculation is O(n) where n = daily completions (trivial, max ~20)
- Cutscene animation should be pre-loaded (Rive state machine, not video)
- No network dependency — entire flow works offline

## Migration Path

When implementing, existing users with instant-fed satiation should not lose progress. The migration:
1. Set `fireCounter = 0` (no pending fire from pre-migration)
2. Set `pendingFeedEvent = null`
3. Existing satiation values carry over unchanged

