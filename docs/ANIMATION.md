# Animation System Documentation

## Overview

Hungry Hundreds uses a two-tier animation system:

1. **Rive (@rive-app/canvas)** - Character animations for the monster companion with state machine control
2. **Motion One (motion)** - Lightweight micro-interactions for UI feedback (2.6KB)

This document describes the complete animation system planned for Phase 5.

---

## Rive Integration

### Monster Character Animations

The monster is the emotional core of the app, evolving as users build habits. Rive provides stateful character animation with runtime control.

#### File Location

```
static/animations/
└── monster.riv     # Rive animation file (~50-100KB target)
```

#### Evolution Stages

| Stage | Streak Days | Rive State    | Visual Description            | Color     |
| ----- | ----------- | ------------- | ----------------------------- | --------- |
| Egg   | 0           | `state_egg`   | Wobbling egg, occasional glow | `#fef3c7` |
| Baby  | 1-6         | `state_baby`  | Small creature, big eyes      | `#bfdbfe` |
| Teen  | 7-29        | `state_teen`  | Growing dragon, playful       | `#c4b5fd` |
| Adult | 30-99       | `state_adult` | Full dragon, confident        | `#f9a8d4` |
| Elder | 100+        | `state_elder` | Wise dragon with accessories  | `#fcd34d` |

#### State Machine Inputs

The Rive state machine accepts these inputs for runtime control:

```typescript
interface MonsterStateMachineInputs {
  // Evolution stage (0-4)
  stage: number;

  // Emotional states
  isHappy: boolean;      // true after habit completion
  isHungry: boolean;     // true when habits incomplete today
  isSleeping: boolean;   // true during quiet hours

  // Action triggers
  triggerFeed: boolean;  // Trigger feeding animation
  triggerCelebrate: boolean; // Trigger celebration (milestones)
  triggerEvolve: boolean; // Trigger evolution sequence

  // Interaction
  isTouched: boolean;    // User is touching/dragging monster
}
```

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

```typescript
// src/lib/components/Monster.svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Rive, type StateMachineInput } from '@rive-app/canvas';
  import type { Monster } from '$lib/stores/monster';

  interface Props {
    monster: Monster;
    onFeed?: () => void;
  }

  let { monster, onFeed }: Props = $props();

  let canvas: HTMLCanvasElement;
  let riveInstance: Rive | null = null;
  let stageInput: StateMachineInput;
  let isHappyInput: StateMachineInput;

  // Map monster stage to numeric value
  const stageMap: Record<string, number> = {
    egg: 0, baby: 1, teen: 2, adult: 3, elder: 4
  };

  onMount(async () => {
    riveInstance = new Rive({
      src: '/animations/monster.riv',
      canvas,
      autoplay: true,
      stateMachines: 'MonsterController',
      onLoad: () => {
        // Get state machine inputs
        const inputs = riveInstance!.stateMachineInputs('MonsterController');
        stageInput = inputs.find(i => i.name === 'stage')!;
        isHappyInput = inputs.find(i => i.name === 'isHappy')!;

        // Set initial stage
        stageInput.value = stageMap[monster.stage];
      }
    });
  });

  // React to monster changes
  $effect(() => {
    if (stageInput) {
      stageInput.value = stageMap[monster.stage];
    }
  });

  // Trigger happy animation
  export function triggerHappy() {
    if (isHappyInput) {
      isHappyInput.value = true;
      setTimeout(() => { isHappyInput.value = false; }, 2000);
    }
  }

  onDestroy(() => {
    riveInstance?.cleanup();
  });
</script>

<canvas
  bind:this={canvas}
  class="h-48 w-48"
  aria-label="Animated monster companion"
/>
```

### Integration with MonsterDisplay.svelte

The current `MonsterDisplay.svelte` uses emoji placeholders. The migration path:

```diff
- <!-- Monster emoji with bounce animation -->
- <span class="animate-bounce text-7xl">{stageConfig.emoji}</span>
+ <!-- Rive monster animation -->
+ <Monster {monster} bind:this={monsterRef} />
```

**Fallback Strategy:**

- If Rive fails to load, show emoji placeholder
- Detect Rive support via `'WebGL' in window`
- Use intersection observer to pause off-screen animations

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
- BottomNav icons
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

		// Check for milestone
		if (habit.streak + 1 === 7 || habit.streak + 1 === 30) {
			celebrate(event.currentTarget as HTMLElement);
		}
	}
</script>
```

### MonsterDisplay.svelte

| Trigger         | Animation              | Package    |
| --------------- | ---------------------- | ---------- |
| Page load       | Idle loop              | Rive       |
| Habit completed | Happy + feed animation | Rive       |
| Stage evolution | Evolution transition   | Rive       |
| User touch      | Touched response       | Rive       |
| Container mount | Scale-in entrance      | Motion One |

### BottomNav.svelte

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
│   ├── Monster.svelte           # Rive canvas wrapper (new)
│   └── MonsterDisplay.svelte    # Updated to use Monster.svelte
├── animations/
│   ├── transitions.ts           # Motion One utilities (new)
│   └── rive-utils.ts            # Rive helper functions (new)
└── stores/
    └── monster.ts               # Already exists

static/animations/
└── monster.riv                  # Rive animation file (new)
```

---

## Implementation Checklist

### Pre-requisites

- [ ] Phase 1-4 complete
- [ ] Monster.riv asset created in Rive editor
- [ ] State machine tested in Rive preview

### Installation

- [ ] Install @rive-app/canvas
- [ ] Install motion (Motion One)
- [ ] Configure Vite chunking for Rive

### Components

- [ ] Create Monster.svelte Rive wrapper
- [ ] Update MonsterDisplay.svelte with fallback
- [ ] Add animations/transitions.ts utilities
- [ ] Integrate buttonSpring in HabitCard
- [ ] Add page transitions to +layout.svelte

### Testing

- [ ] Verify 60fps on mobile devices
- [ ] Test reduced motion preference
- [ ] Verify offline functionality preserved
- [ ] Test emoji fallback when Rive fails
- [ ] Lighthouse performance audit

### Documentation

- [ ] Update UI.md with animation components
- [ ] Update STATUS.md with Phase 5 progress

---

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [UI.md](./UI.md) - UI component documentation
- [STATUS.md](../STATUS.md) - Implementation status
- [ROADMAP.md](./ROADMAP.md) - Development phases
