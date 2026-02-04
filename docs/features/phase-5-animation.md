# Feature: Phase 5 Animation System

## Purpose

Implement the animation system for Hungry Hundreds using Rive for character animations and Motion One for UI micro-interactions. This brings the monster companion to life and adds satisfying tactile feedback throughout the app.

## User Story

As a user, I want to see my monster companion animate and react to my actions so that building habits feels more engaging and rewarding.

## Implementation Approach

### Technology Stack

| Package            | Version | Purpose                      | Bundle Size |
| ------------------ | ------- | ---------------------------- | ----------- |
| `@rive-app/canvas` | ^2.10.0 | Monster character animations | ~150KB      |
| `motion`           | ^11.0.0 | UI micro-interactions        | ~3KB        |

### Implementation Phases

#### Phase 5.1: Foundation

- Install dependencies (`@rive-app/canvas`, `motion`)
- Create `src/lib/animations/` directory structure
- Configure Vite for lazy loading Rive

#### Phase 5.2: Motion One Utilities

- Create `src/lib/animations/transitions.ts`
- Implement: `buttonSpring`, `staggerList`, `celebrate`, `checkmarkPop`
- Add reduced motion support

#### Phase 5.3: Rive Utilities

- Create `src/lib/animations/rive-utils.ts`
- Implement: WebGL detection, visibility observer, pause/play helpers
- Add reduced motion support for Rive

#### Phase 5.4: Monster Component

- Create `src/lib/components/Monster.svelte`
- Rive canvas wrapper with state machine control
- Emoji fallback when Rive fails to load
- Initial states: `idle`, `happy`

#### Phase 5.5: MonsterDisplay Integration

- Update `MonsterDisplay.svelte` to use `Monster.svelte`
- Maintain existing layout (progress bar, stage badge, name)
- Graceful fallback to emoji on error

#### Phase 5.6-5.7: Micro-interactions

- Add `buttonSpring` to `HabitCard.svelte` toggle
- Add tap animation to `BottomNav.svelte` icons

#### Phase 5.8: Performance

- Configure Vite manual chunks for Rive lazy loading
- Verify bundle size impact

#### Phase 5.9: Documentation

- Update `STATUS.md` with Phase 5 progress
- Update `docs/UI.md` with animation components

### Technical Design

#### File Structure

```
src/lib/
├── animations/
│   ├── transitions.ts      # Motion One utilities
│   └── rive-utils.ts       # Rive helper functions
├── components/
│   ├── Monster.svelte      # Rive canvas wrapper (new)
│   └── MonsterDisplay.svelte # Updated to use Monster.svelte
```

#### Monster.svelte Props

```typescript
interface Props {
  stage: MonsterStage;           // 'egg' | 'baby' | 'teen' | 'adult' | 'elder'
  isHappy?: boolean;             // Trigger happy animation
  class?: string;                // Additional CSS classes
}
```

#### Rive State Machine (cat-treat.riv placeholder)

For the placeholder asset, we'll map our states to available animations:

- `idle` → Default loop animation
- `happy` → Triggered animation (if available, else idle)

When the real `monster.riv` is created, it should have:

- State machine: `MonsterController`
- Inputs: `stage` (number 0-4), `isHappy` (boolean)

#### Emoji Fallback Strategy

```typescript
// Detection order:
// 1. Check WebGL support
// 2. Attempt Rive load
// 3. On error → show emoji fallback

const supportsRive = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl') || canvas.getContext('webgl2'));
  } catch {
    return false;
  }
};
```

### UI/UX Design

#### Monster Component

- Size: 192x192px (w-48 h-48)
- Background: Stage-specific color from `monsterStages`
- Fallback: Current emoji with bounce animation

#### Micro-interactions

- **Button tap**: Spring scale (1 → 0.95 → 1.02 → 1) over 300ms
- **Reduced motion**: Simple opacity fade instead of scale

### Integration Points

| Component               | Animation           | Trigger                        |
| ----------------------- | ------------------- | ------------------------------ |
| `Monster.svelte`        | Rive idle/happy     | Stage change, habit completion |
| `MonsterDisplay.svelte` | Uses Monster.svelte | Page load                      |
| `HabitCard.svelte`      | buttonSpring        | Toggle button tap              |
| `BottomNav.svelte`      | Scale spring        | Icon tap                       |

## Acceptance Criteria

- [x] Dependencies installed (`@rive-app/canvas`, `motion`)
- [x] Monster.svelte renders Rive animation from cat-treat.riv
- [x] Emoji fallback works when WebGL unavailable
- [x] MonsterDisplay uses Monster.svelte with fallback
- [x] HabitCard has spring animation on toggle
- [x] BottomNav has tap animation on icons
- [x] Reduced motion preference respected
- [x] Rive lazy-loaded via Vite chunks
- [x] STATUS.md updated with Phase 5 progress
- [x] UI.md updated with animation components

## Performance Considerations

| Metric      | Target        | Strategy                                  |
| ----------- | ------------- | ----------------------------------------- |
| Bundle size | +15KB initial | Lazy-load Rive chunk                      |
| Frame rate  | 60fps         | Use CSS transforms, pause off-screen      |
| Memory      | <50MB heap    | Single Rive instance, cleanup on unmount  |
| Load time   | +200ms max    | Async Rive load, immediate emoji fallback |

## Rollback Plan

If Rive causes issues:

1. Set `ENABLE_RIVE=false` environment variable (future)
2. Monster.svelte falls back to emoji automatically
3. Motion One micro-interactions are independent and can remain

## Related Documentation

- [ANIMATION.md](../ANIMATION.md) - Full animation system spec
- [ANIMATION_APPROACHES.md](../ANIMATION_APPROACHES.md) - Approach comparison
- [STATUS.md](../../STATUS.md) - Implementation status
