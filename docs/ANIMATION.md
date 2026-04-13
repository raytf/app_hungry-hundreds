# Animation System Documentation

## Overview

Hungry Hundreds uses a two-tier animation system:

1. **Rive (@rive-app/canvas)** - Character animations for the monster companion with state machine control
2. **Motion One (motion)** - Lightweight micro-interactions for UI feedback (2.6KB)

This document describes the animation system for Phase 5. **Status: In Progress** - Core animation infrastructure is implemented with Rive and Motion One. Remaining work includes creating custom monster.riv asset and adding page transitions.

---

## Rive Integration

### Monster Character Animations

The monster is the emotional core of the app, evolving as users build habits. Rive provides stateful character animation with runtime control.

#### File Location

```
static/animations/
└── monster_hatchling.riv   # Rive animation file with CharacterVM view model
```

#### Evolution Stages & State Machine Inputs

Evolution stages (Egg → Hatchling → Juvenile → Adult → Apex) and all Rive state machine inputs are defined in **[RULE_ENGINE_SPEC.md](./RULE_ENGINE_SPEC.md)**. The rule engine produces a `MascotState` object (section 1.7) which drives all Rive inputs — `primaryEmotion`, `emotionIntensity`, `lookX`, `lookY`, `evolutionStage`, and `trigger`.

#### Animation States per Stage

Each stage includes these animation loops:

| Animation   | Purpose                      | Duration | Loop |
| ----------- | ---------------------------- | -------- | ---- |
| `idle`      | Default breathing/movement   | 2-4s     | ✓    |
| `happy`     | Joy after habit completion   | 1.5s     | ✓    |
| `hungry`    | Waiting for habits           | 3s       | ✓    |
| `feed`      | Eating animation             | 2s       | ✗    |
| `celebrate` | Milestone celebration        | 3s       | ✗    |
| `evolve`    | Stage transition             | 4s       | ✗    |
| `sleep`     | Night mode idle              | 4s       | ✓    |
| `touched`   | Response to user interaction | 0.5s     | ✓    |

### Monster.svelte Component

The component receives a `MascotState` (from the rule engine) and maps it to Rive inputs. See **[RULE_ENGINE_SPEC.md §1.7](./RULE_ENGINE_SPEC.md#17-mascot-state)** for the full `MascotState` interface. A skeleton:

```typescript
// src/lib/components/Monster.svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Rive, type StateMachineInput } from '@rive-app/canvas';
  import type { MascotState } from '$lib/ruleEngine';

  interface Props { mascotState: MascotState; }
  let { mascotState }: Props = $props();

  let canvas: HTMLCanvasElement;
  let riveInstance: Rive | null = null;
  // inputs wired from MascotState: evolutionStage, primaryEmotion,
  // emotionIntensity, lookX, lookY, trigger

  onMount(() => {
    riveInstance = new Rive({
      src: '/animations/gonn.riv',
      canvas,
      autoplay: true,
      stateMachines: 'GonnController',
      onLoad: () => { /* bind inputs */ }
    });
  });

  $effect(() => { /* push mascotState fields to Rive inputs */ });

  onDestroy(() => riveInstance?.cleanup());
</script>

<canvas bind:this={canvas} class="h-48 w-48" aria-label="Gonn companion" />
```

#### Head Tracking (`lookAt`)

The `lookAt()` method smoothly interpolates the monster's gaze from its current position to a target using `requestAnimationFrame` and ease-out cubic easing:

```typescript
// Clamps to -1..1 range, then animates headX/headY over `duration` ms
monsterRef.lookAt(0.5, -0.3, 300);
```

- Values are clamped to the -1 to 1 range
- Uses `easeOutCubic` for natural deceleration
- Cancels any in-progress animation before starting a new one
- No-op if the view model properties aren't available

### Integration with MonsterDisplay.svelte

`MonsterDisplay.svelte` wraps `Monster.svelte` and registers its `lookAt` callback with the monster store for cross-component access:

```svelte
<script lang="ts">
	import { onDestroy } from 'svelte';
	import { registerMonsterLookAt } from '$lib/stores/monster';

	let monsterRef: Monster | undefined = $state();

	// Register lookAt callback once Monster component is bound
	$effect(() => {
		if (monsterRef) {
			registerMonsterLookAt(monsterRef.lookAt);
		}
	});

	// Unregister on destroy
	onDestroy(() => registerMonsterLookAt(null));
</script>

<Monster bind:this={monsterRef} stage={monster.stage} />
```

### Monster Store API (`src/lib/stores/monster.ts`)

The monster store provides a public API for triggering head tracking and facial expressions from any component:

```typescript
import { monsterLookAt, monsterSetExpression } from '$lib/stores/monster';

// Smoothly animate the monster's gaze (-1 to 1 range)
monsterLookAt(x, y, duration?);

// Trigger a facial expression on the monster
monsterSetExpression('excited');
// Revert after 2 seconds
setTimeout(() => monsterSetExpression('normal'), 2000);
```

This callback pattern bridges the layout → page boundary since `MonsterDisplay` lives in `+layout.svelte` as a fixed overlay.

#### Expression Trigger Pattern

When a habit is completed (full or partial), the completion handler calls `monsterSetExpression('excited')` and schedules a revert to `'normal'` after 2000ms. Any existing timeout is cleared first to prevent overlapping expression changes:

```typescript
import { monsterSetExpression } from '$lib/stores/monster';

let expressionTimeout: ReturnType<typeof setTimeout> | null = null;

// On habit completion:
if (expressionTimeout) clearTimeout(expressionTimeout);
monsterSetExpression('excited');
expressionTimeout = setTimeout(() => {
  monsterSetExpression('normal');
  expressionTimeout = null;
}, 2000);
```

This pattern is used in both `HabitCardCompact.svelte` and `src/routes/habits/[id]/+page.svelte`.

### Homepage Head Tracking

On the homepage (`src/routes/+page.svelte`), the monster's gaze follows the cursor via a `mousemove` handler:

```typescript
function handlePageMouseMove(event: MouseEvent) {
  const x = (event.clientX / window.innerWidth - 0.5) * 2;   // -1..1
  const y = (event.clientY / window.innerHeight - 0.5) * -2;  // 1..-1 (inverted)
  monsterLookAt(x, y);
}
```

**Fallback Strategy:**

- If Rive fails to load, show emoji placeholder with bounce animation
- Detect Rive support via `supportsWebGL()` utility
- Use intersection observer to pause off-screen animations
- Tab visibility handler pauses when tab is hidden

---

## Motion One Micro-Interactions

### Package Details

```json
{
	"dependencies": {
		"motion": "^11.0.0"
	}
}
```

Bundle size: ~2.6KB gzipped (tree-shakeable)

### Interaction Types

#### 1. Button Press Feedback

Spring animation on tap for satisfying tactile feedback:

```typescript
// src/lib/animations/transitions.ts
import { spring, animate } from 'motion';

export function buttonSpring(element: HTMLElement) {
  return animate(element,
    { scale: [1, 0.95, 1.02, 1] },
    { duration: 0.3, easing: spring({ stiffness: 500, damping: 15 }) }
  );
}
```

**Applied to:**

- HabitCard toggle button
- Primary action buttons
- Header drawer navigation icons (legacy BottomNav integration)
- FAB (Floating Action Button)

#### 2. Page Transitions

Smooth transitions between routes:

```typescript
// src/lib/animations/transitions.ts
export const pageTransition = {
  in: { opacity: [0, 1], y: [20, 0] },
  out: { opacity: [1, 0], y: [0, -20] },
  duration: 0.25
};
```

**Applied via SvelteKit layout:**

```svelte
{#key $page.url.pathname}
	<div in:fade={{ duration: 200 }} out:fade={{ duration: 150 }}>
		{@render children()}
	</div>
{/key}
```

#### 3. List Item Stagger

Staggered entrance for habit lists:

```typescript
export function staggerList(elements: HTMLElement[], delay = 50) {
  elements.forEach((el, i) => {
    animate(el,
      { opacity: [0, 1], y: [20, 0] },
      { delay: i * delay / 1000, duration: 0.3 }
    );
  });
}
```

#### 4. Success Celebration

Confetti-like celebration on milestones:

```typescript
export function celebrate(element: HTMLElement) {
  // Scale bounce
  animate(element, { scale: [1, 1.2, 1] }, { duration: 0.4 });

  // Spawn particles (CSS-based for performance)
  element.classList.add('celebrate');
  setTimeout(() => element.classList.remove('celebrate'), 1000);
}
```

---

## Component Integration Points

### HabitCard.svelte

| Trigger                  | Animation              | Package    |
| ------------------------ | ---------------------- | ---------- |
| Tap to complete          | Button spring + ripple | Motion One |
| Completion success       | Checkmark scale-in     | Motion One |
| Card enters viewport     | Fade-up stagger        | Motion One |
| Streak milestone reached | Celebrate particles    | Motion One |

```svelte
<script>
	import { buttonSpring, celebrate } from '$lib/animations/transitions';

	function handleToggle(event: MouseEvent) {
		buttonSpring(event.currentTarget as HTMLElement);
		habits.toggle(habit.id);

		// Day 100 Feast fires at completionCount === 100 (see RULE_ENGINE_SPEC.md §6)
		if (habit.completionCount + 1 === 100) {
			celebrate(event.currentTarget as HTMLElement);
		}
	}
</script>
```

### MonsterDisplay.svelte

| Trigger         | Animation                                 | Package    |
| --------------- | ----------------------------------------- | ---------- |
| Page load       | Idle loop                                 | Rive       |
| Habit completed | Excited expression (monsterSetExpression) | Rive       |
| Stage evolution | Evolution transition                      | Rive       |
| Cursor move     | Head tracking (lookAt → headX/headY)      | Rive       |
| Container mount | Scale-in entrance                         | Motion One |

### Navigation Icons (Legacy BottomNav → Current Header Drawer)

| Trigger             | Animation                | Package    |
| ------------------- | ------------------------ | ---------- |
| Icon tap            | Scale spring             | Motion One |
| Active state change | Icon bounce + color fade | Motion One |

### Header.svelte

| Trigger            | Animation       | Package    |
| ------------------ | --------------- | ---------- |
| Sync status change | Fade transition | Motion One |
| Back button tap    | Scale spring    | Motion One |

---

## Performance Considerations

### Mobile PWA Constraints

| Constraint  | Target        | Strategy                                   |
| ----------- | ------------- | ------------------------------------------ |
| Bundle size | +15KB max     | Tree-shake Motion One, lazy-load Rive      |
| Frame rate  | 60fps         | Use CSS transforms, avoid layout thrashing |
| Battery     | Minimal drain | Pause off-screen, reduce complexity        |
| Memory      | <50MB heap    | Single Rive instance, cleanup on unmount   |
| Load time   | +200ms max    | Async load Rive, immediate emoji fallback  |

### Lazy Loading Rive

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          rive: ['@rive-app/canvas']
        }
      }
    }
  }
});
```

### Animation Pausing

```typescript
// Pause when tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    riveInstance?.pause();
  } else {
    riveInstance?.play();
  }
});

// Pause when off-screen
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      riveInstance?.play();
    } else {
      riveInstance?.pause();
    }
  });
});
observer.observe(canvas);
```

### CSS Hardware Acceleration

```css
/* Force GPU acceleration for animated elements */
.animated {
	transform: translateZ(0);
	will-change: transform, opacity;
}

/* Remove will-change after animation completes */
.animated.done {
	will-change: auto;
}
```

### Reduced Motion Support

```typescript
// Check user preference
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// Apply reduced animations
export function buttonSpring(element: HTMLElement) {
  if (prefersReducedMotion) {
    // Simple opacity change instead of spring
    return animate(element, { opacity: [0.7, 1] }, { duration: 0.1 });
  }
  return animate(element, { scale: [1, 0.95, 1.02, 1] }, { duration: 0.3 });
}
```

---

## File Structure (Phase 5)

```
src/lib/
├── components/
│   ├── Monster.svelte           # Rive canvas wrapper with lookAt() export
│   └── MonsterDisplay.svelte    # Wraps Monster, registers lookAt callback
├── animations/
│   ├── transitions.ts           # Motion One utilities
│   └── rive-utils.ts            # WebGL detection, visibility observers
└── stores/
    └── monster.ts               # Monster state + registerMonsterLookAt/monsterLookAt/monsterSetExpression

src/routes/
└── +page.svelte                 # Homepage with onmousemove head tracking

static/animations/
└── monster_hatchling.riv        # Rive animation file with CharacterVM
```

---

## Implementation Checklist

### Pre-requisites

- [x] Phase 1-4 complete
- [x] Custom monster_hatchling.riv asset with CharacterVM view model
- [x] View model tested with headX/headY properties

### Installation

- [x] Install @rive-app/canvas (`@rive-app/canvas@2.34.3`)
- [x] Install motion (Motion One) (`motion@12.31.0`)
- [x] Configure Vite chunking for Rive (lazy loading configured)

### Components

- [x] Create Monster.svelte Rive wrapper (with emoji fallback)
- [x] Update MonsterDisplay.svelte to use Monster.svelte
- [x] Add View Model binding (CharacterVM headX/headY)
- [x] Add lookAt() with smooth interpolation (requestAnimationFrame + easeOutCubic)
- [x] Add store callback registration (registerMonsterLookAt/monsterLookAt)
- [x] Add homepage cursor tracking (onmousemove → monsterLookAt)
- [x] Add HiDPI support (resizeDrawingSurfaceToCanvas)
- [x] Add `src/lib/animations/transitions.ts` utilities (buttonSpring, celebrate, iconTap)
- [x] Add `src/lib/animations/rive-utils.ts` utilities (WebGL detection, visibility observers)
- [x] Integrate buttonSpring in HabitCard
- [x] Integrate iconTap in navigation icons (originally BottomNav; now Header drawer items)
- [x] Celebrate animation on streak milestones (7/30/100)
- [ ] Add page transitions to +layout.svelte

### Testing

- [x] Test reduced motion preference (fallback implemented)
- [x] Verify offline functionality preserved
- [x] Test emoji fallback when Rive/WebGL unavailable
- [ ] Verify 60fps on mobile devices
- [ ] Lighthouse performance audit

### Documentation

- [x] Update UI.md with animation components
- [x] Update STATUS.md with Phase 5 progress
- [x] Create `docs/features/phase-5-animation.md`

---

## Related Documentation

- [RULE_ENGINE_SPEC.md](./RULE_ENGINE_SPEC.md) - Gonn evolution, MascotState, and all Rive input definitions
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [UI.md](./UI.md) - UI component documentation
- [STATUS.md](../STATUS.md) - Implementation status
- [ROADMAP.md](./ROADMAP.md) - Development phases
