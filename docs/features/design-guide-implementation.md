# Feature: Design Guide Implementation (Phase 9)

## Purpose

Apply the visual and interaction design specified in `docs/DESIGN_GUIDE.md` to the existing codebase. This replaces the current green "hungry-" theme with the warm neutral palette, establishes the correct home screen layout (fixed Gonn canvas, fire progress bar, sky/ground environment, speech bubble zone), and builds out the component library defined in the guide.

## User Story

As a user, the app feels warm, focused, and character-driven — Gonn is the visual center, habits feel effortless to check off, and the interface never competes with the mascot for attention.

---

## Scope

- **In scope:** Home screen layout, design tokens, typography, HabitCard (home), Header, Drawer, fire bar, speech bubble, component library (buttons/input/toast/bottom-sheet), confetti, `/dashboard` → `/journey` rename.
- **Out of scope (deferred):** Onboarding redesign, evolution cutscene, dark mode, GSAP environment animations, Rive speech bubble artboard.
- **Unchanged:** `/habits` list page layout, `/habits/new` and `/habits/[id]/edit` full-page forms, habit data layer.

---

## Technical Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Icon library | `lucide-svelte` | Recommended in design guide; stroke, rounded, matches aesthetic |
| Confetti | `canvas-confetti` | Lightweight, battle-tested physics; install as dependency |
| Speech bubble rendering | Svelte-side HTML/CSS | Design guide explicit: bubble is NOT inside `.riv` file |
| Dialogue wiring | New `dialogueStore` (`$state`) | `monsterSetDialogue()` rewired to update store; Rive VM binding kept as dead code for Phase 7 forward-compat |
| CSS tokens | Tailwind CSS 4 `@theme {}` block | Project uses Tailwind 4; design guide's `tailwind.config.js` format translated to `@theme` CSS variables |
| Gonn canvas sizing | CSS `min(100vw, 430px)` | Expressed as `--gonn-size` custom property on `:root` for reuse across layout |
| Habits scroll clearance | CSS `calc(var(--gonn-size) + 80px)` bottom padding | Pure CSS; no JS measurements needed |

---

## Phase Breakdown

### Phase A — Foundation
**Goal:** Install dependencies, establish design tokens, load fonts. Zero visible UI changes.

**Install:**
```bash
pnpm add lucide-svelte canvas-confetti
pnpm add -D @types/canvas-confetti
```

**Files to modify:**

| File | Change |
|---|---|
| `src/routes/layout.css` | Replace `@theme` block with full design system tokens (colors, type scale, shadows, z-index, border-radius, background images). Add DM Sans to Google Fonts `@import`. |
| `src/app.html` | Update `theme-color` meta from green to `#E8713A` (light) / `#1A1412` (dark). |

**Token translation (Tailwind 4 `@theme` format):**
All design guide colors map to `--color-*` custom properties. Type scale maps to `--text-*`. Shadows map to `--shadow-*`. Full mapping in Appendix A below.

**Acceptance criteria:**
- [ ] DM Sans and Fredoka both load correctly (verify in Network tab)
- [ ] All `--color-*`, `--shadow-*`, `--text-*` tokens present in computed styles
- [ ] No `hungry-*` green tokens remain (replaced by design system tokens)
- [ ] Build passes (`pnpm check`)

---

### Phase B — Home Screen Layout
**Goal:** Restructure the home screen to match design guide §4.2–4.4. Gonn fixed at bottom as a full-width square, fire bar below top bar, sky gradient on habits scroll, ground behind Gonn.

**Files to modify:**

| File | Change |
|---|---|
| `src/routes/+layout.svelte` | Remove `fixed inset-0 z-40` MonsterDisplay wrapper. Add ground layer div (`fixed bottom-0 z-5`, ground-gradient). Rewrap MonsterDisplay in `fixed bottom-0 z-10` square container (`width: min(100vw, 430px)`, `height: var(--gonn-size)`). Define `--gonn-size` on `:root`. |
| `src/routes/+page.svelte` | Remove ProgressRing summary card. Restructure into: fixed-aware top spacer → `FireProgressBar` → scrollable habits area (sky gradient, bottom clearance = `calc(var(--gonn-size) + 80px)`). Add `box-shadow: inset 0 -20px 20px -10px ...` horizon seam at scroll bottom. |
| `src/lib/components/MonsterDisplay.svelte` | Remove `h-full w-full items-end` layout wrapper; simplify to just render `<Monster>` filling its container. Remove evolution progress bar and stage badge (replaced by Gonn state from Rive). |

**Files to create:**

| File | Purpose |
|---|---|
| `src/lib/components/FireProgressBar.svelte` | 6px full-bleed bar. Props: `pct: number`. Gradient fill `accent-warm → gonn-red`. 400ms ease-out width transition. Glow pulse when `pct === 100`. `role="progressbar"` with ARIA attrs. |

**Key CSS (`+page.svelte`):**
```css
.habits-scroll {
  padding-bottom: calc(var(--gonn-size) + 80px);
  background: linear-gradient(to bottom, var(--color-sky-top), var(--color-sky-bottom));
}
```

**Responsive cap (`+layout.svelte`):**
```css
:root { --gonn-size: min(100vw, 430px); }
.gonn-container { width: var(--gonn-size); height: var(--gonn-size); }
.gonn-ground { width: 100vw; height: calc(var(--gonn-size) + env(safe-area-inset-bottom, 0px)); }
```

**Acceptance criteria:**
- [ ] Gonn canvas is a full-width square fixed to the bottom, capped at 430px, centered
- [ ] Ground gradient fills behind Gonn and extends behind the home indicator
- [ ] Habits list has a sky gradient background that scrolls with the cards
- [ ] Fire progress bar appears as a 6px stripe directly below the header
- [ ] Habit cards never overlap Gonn or the speech bubble zone
- [ ] No layout breakage on iPhone SE (375px) or wide screens (768px+)

---

### Phase C — Speech Bubble System
**Goal:** Create the Svelte-side HTML/CSS speech bubble that shows Gonn's dialogue. Rewire the existing dialogue pipeline to a reactive store.

**Files to create:**

| File | Purpose |
|---|---|
| `src/lib/stores/dialogue.ts` | Svelte 5 `$state`-based store exposing `{ text, visible, charDelayMs, displayMs }`. Exports `showDialogue(text, opts?)` and `hideDialogue()`. |
| `src/lib/components/SpeechBubble.svelte` | HTML/CSS bubble subscribing to `dialogueStore`. Typewriter reveal (character-by-character at `charDelayMs`ms). CSS triangle tail pointing down. Fade in (250ms) + scale 0.9→1.0 on appear; fade out (200ms) on dismiss. `role="status"` `aria-live="polite"`. Positioned in the fixed zone between habits scroll and Gonn canvas. |

**Files to modify:**

| File | Change |
|---|---|
| `src/lib/stores/monster.ts` | `monsterSetDialogue()` updates `dialogueStore` instead of calling `_setDialogueFn`. Keep `_setDialogueFn` registration API intact as dead code (Rive VM forward-compat). |
| `src/lib/components/Monster.svelte` | `setDialogue()` export kept as-is (still used by `registerMonsterSetDialogue`); Rive VM binding remains; effectively becomes a no-op since `monsterSetDialogue` no longer calls it. |
| `src/routes/+page.svelte` | Add `<SpeechBubble>` in the fixed zone between habits scroll and Gonn container. |

**SpeechBubble positioning:**
```css
.speech-bubble-zone {
  position: fixed;
  bottom: calc(var(--gonn-size) + 8px);
  left: 0; right: 0;
  z-index: 15; /* var(--z-bubble) */
  display: flex;
  justify-content: center;
  pointer-events: none;
}
```

**Typewriter logic:** On `text` change, iterate characters with `setTimeout` at `charDelayMs` intervals. On `displayMs` elapsed after typing completes, call `hideDialogue()`. Respect `prefers-reduced-motion`: show full text instantly.

**Acceptance criteria:**
- [ ] Gonn's dialogue from `monsterSetDialogue()` appears in the HTML bubble above Gonn
- [ ] Text streams in character-by-character (30ms default)
- [ ] Bubble fades in/out with correct animations
- [ ] Bubble never overlaps habit cards or Gonn's body
- [ ] `aria-live="polite"` announces text to screen readers
- [ ] `prefers-reduced-motion`: text appears instantly

---

### Phase D — HabitCard Redesign (Home Screen)
**Goal:** Redesign `HabitCardCompact.svelte` to match design guide §5.2. Keep `HabitCard.svelte` (used on `/habits` list) unchanged.

**Files to modify:** `src/lib/components/HabitCardCompact.svelte`

**Visual spec (from design guide §5.2):**

| Property | Value |
|---|---|
| Background | `bg-secondary` (#F5F0E8) |
| Completed bg | `success-soft` (#E8F5E9) tint |
| Partially completed bg | amber-50 (keep existing) |
| Border radius | `16px` (card token) |
| Padding | `16px` |
| Gap between cards | `12px` (set in `+page.svelte`) |
| Shadow | `shadow-card` |
| Layout | flex row, `align-items: center` |
| Flavor icon | 32×32px, `bg-tertiary` container, emoji centered |
| Habit name | `body-lg` (DM Sans 400, 16px), `text-primary` |
| Streak line | `body-sm` (DM Sans 500, 12px), `text-tertiary` — e.g. "Streak: 14 days" |
| Completion circle | 28×28px, right side |
| Circle (incomplete) | `border-light` 2px border, hollow, `bg-primary` fill |
| Circle (complete) | `success` (#5BA867) fill, white checkmark (16px) |
| Completed text | No strikethrough (remove existing `line-through` class) |
| Partial completion | Keep existing amber styling |

**Interaction:** Tap circle → toggle. Tap card body → navigate to `/habits/[id]` (unchanged). Remove the green-filled square toggle button; replace with the 28px circle.

**Animation:** Circle completion: scale 1 → 1.2 → 1 + fill, 300ms spring. Card bg shift to `success-soft`: 200ms ease-out.

**Acceptance criteria:**
- [ ] Card uses warm neutral colors (no green `hungry-` classes)
- [ ] No strikethrough on completed habits
- [ ] 28px circle indicator with hollow/filled states
- [ ] `success-soft` background tint on completed cards
- [ ] Spring animation on completion circle tap
- [ ] Streak line shows "Streak: N days" in `text-tertiary`
- [ ] Partial completion amber styling retained
- [ ] Card body tap still navigates to detail page

---

### Phase E — Top Bar + Drawer Redesign
**Goal:** Redesign `Header.svelte` to match design guide §4.5 and §5.5.

**Files to modify:** `src/lib/components/Header.svelte`

**Top bar spec:**

| Property | Value |
|---|---|
| Height | `48px` (`h-12`) |
| Background | `bg-primary/90` + `backdrop-blur-sm` |
| Padding | `0 24px` |
| z-index | `z-top-bar` (30) |
| Left | Lucide `Menu` icon, 24×24, `text-secondary` |
| Center | Today's date, `body` size (DM Sans 500 14px), `text-primary`. Format: "Thursday, Apr 6". Use `<time>` element. |
| Right | 8×8px sync dot. `success` (#5BA867) = synced. `accent-soft` (#F2C78A) + pulse = syncing. `text-tertiary` = offline. |

**Date format code:**
```typescript
const formatted = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date());
// → "Thursday, Apr 6"
```

**Drawer spec:**

| Property | Value |
|---|---|
| Width | `280px` |
| Background | `bg-secondary` (#F5F0E8) |
| Border radius | `0 20px 20px 0` (right corners only) |
| Top padding | `48px` (space-12) |
| Side padding | `24px` (space-6) |
| Animation | Slide from left, 250ms `cubic-bezier(0.25, 0.1, 0.25, 1)` |
| Overlay | `surface-overlay` (`rgba(26, 20, 18, 0.4)`) |

**Drawer nav items (MVP):**

| # | Label | Icon (Lucide) | Route |
|---|---|---|---|
| 1 | Home | `Home` | `/` |
| 2 | Journey | `TrendingUp` | `/journey` |
| 3 | Add Habit | `Plus` | `/habits/new` |
| 4 | Settings | `Settings` | `/settings` |

Menu item style: height 48px, `12px` border-radius, DM Sans 500 16px, `text-primary`, 24px Lucide icon `text-secondary`, 12px gap. Active: `accent-warm` text + `rgba(232,113,58,0.08)` bg.

**Acceptance criteria:**
- [ ] Header is exactly 48px tall
- [ ] Date displays in "Thursday, Apr 6" format using `<time>` element
- [ ] Sync dot correctly reflects online/syncing/offline states
- [ ] Drawer slides in from left with correct animation and overlay
- [ ] Drawer uses `bg-secondary` warm background, not white
- [ ] Nav shows Home, Journey, Add Habit, Settings with Lucide icons
- [ ] Active item highlighted with `accent-warm` text

---

### Phase F — Component Library
**Goal:** Update utility classes and create reusable Toast and BottomSheet components.

**Files to modify:**

| File | Change |
|---|---|
| `src/routes/layout.css` | Update `.btn-primary`, `.btn-secondary`; add `.btn-ghost`; update `.card` and `.input-field` to use design system tokens. |

**Button specs:**

| Class | Background | Text | Height | Radius | Border |
|---|---|---|---|---|---|
| `.btn-primary` | `accent-warm` | `bg-primary` | `52px` | `16px` | none, `shadow-button` |
| `.btn-secondary` | transparent | `accent-warm` | `44px` | `12px` | `1.5px solid border-light` |
| `.btn-ghost` | transparent | `text-secondary` | `40px` | `8px` | none |

**Input spec:** height `48px`, `bg-secondary`, `border-light` 1.5px, focus `border-focus`, `12px` radius, DM Sans 400 16px.

**Files to create:**

| File | Purpose |
|---|---|
| `src/lib/stores/toast.ts` | Svelte 5 runes store: `{ message, visible }`. `showToast(message)` sets visible for 2.5s then fades. One toast at a time. |
| `src/lib/components/Toast.svelte` | Top-center, `16px` below fire bar. `text-primary` bg, `bg-primary` text. Slide up 8px + fade in (200ms). Fade out (200ms). `max-w-[320px]`. |
| `src/lib/components/BottomSheet.svelte` | Reusable slide-up sheet. Props: `open: boolean`, `onclose: () => void`, `children` snippet. `85vh` max. Handle bar. `role="dialog"` `aria-modal="true"`. Drag-to-dismiss + overlay tap. |

**Integration:** Add `<Toast>` to `+layout.svelte`. `BottomSheet` available for future use (habit creation flow, habit detail).

**Acceptance criteria:**
- [ ] `.btn-primary` is orange, full-width, 52px
- [ ] `.btn-secondary` is outlined, transparent, 44px
- [ ] `.btn-ghost` is subtle, 40px
- [ ] `.card` uses `bg-secondary` and `shadow-card`
- [ ] `.input-field` uses `bg-secondary`, focus border is `accent-warm`
- [ ] Toast appears top-center and auto-dismisses after 2.5s
- [ ] BottomSheet slides up and can be dismissed by overlay tap or drag

---

### Phase G — Confetti
**Goal:** Add celebration particles for habit milestone completions (7, 30, 100 day streaks).

**Files to create:**

| File | Purpose |
|---|---|
| `src/lib/animations/confetti.ts` | Thin wrapper around `canvas-confetti`. `celebrateMilestone(element?)`: fires 30–50 particles in `gonn-gold`, `accent-soft`, `accent-warm` at 60% opacity. Burst from top-center. Respects `prefers-reduced-motion`. |

**Files to modify:**

| File | Change |
|---|---|
| `src/lib/components/HabitCardCompact.svelte` | Replace inline `celebrate()` call with `celebrateMilestone()` from new wrapper. Trigger on streak milestones 7, 30, 100. |

**Particle spec (from design guide §8.4):**
- Count: 30–50
- Colors: `#EFD67C` (gonn-gold), `#F2C78A` (accent-soft), `#E8713A` (accent-warm) at 60% opacity
- Shape: circles (3–6px via `scalar` option)
- Duration: 1.5s, gravity pull, random horizontal drift

**Acceptance criteria:**
- [ ] Confetti fires on 7, 30, 100 streak milestones
- [ ] Uses correct warm/gold color palette
- [ ] No confetti when `prefers-reduced-motion` is active
- [ ] No confetti on un-completion (toggle off)

---

### Phase H — Route + Navigation Rename
**Goal:** Rename `/dashboard` to `/journey`. Update all internal references.

**Files to change:**

| Action | Details |
|---|---|
| Move | `src/routes/dashboard/+page.svelte` → `src/routes/journey/+page.svelte` |
| Update page title | "Statistics" → "Your Journey" |
| Update Header.svelte | Nav item href `/dashboard` → `/journey`, label "Journey" |
| Update `<svelte:head>` | `<title>Statistics` → `<title>Journey` |
| Update `docs/UI.md` | Route table entry `/dashboard` → `/journey` |
| Update `STATUS.md` | References to `/dashboard` → `/journey` |

**Acceptance criteria:**
- [ ] `/journey` loads the stats page
- [ ] `/dashboard` returns 404
- [ ] Drawer nav shows "Journey" with correct active state
- [ ] No remaining `/dashboard` hrefs in codebase (run `grep -r "/dashboard"`)

---

## Integration Points

- **`todaysProgress` store** — already exports `{ total, completed, pct }`. `FireProgressBar` consumes `pct` directly.
- **`monsterSetDialogue()`** — existing call sites in `src/lib/ai/dialogue.ts` require no changes; signature unchanged.
- **`sortedHabits` store** — unchanged; `HabitCardCompact` still consumes it.
- **Sync store** — `SyncStatusIndicator` compact mode drives the top bar sync dot.
- **`GonnChat.svelte`** — tap zone button in `+layout.svelte` may need `bottom` offset updated after Gonn container is repositioned.

---

## Appendix A — Tailwind 4 Token Mapping

The design guide's `tailwind.config.js` (v3 format) translates to Tailwind 4 `@theme {}` CSS custom properties:

```css
@theme {
  /* Gonn character palette */
  --color-gonn-red: #D03731;
  --color-gonn-gold: #EFD67C;
  --color-gonn-dark: #240302;

  /* UI surface palette */
  --color-bg-primary: #FEFCF8;
  --color-bg-secondary: #F5F0E8;
  --color-bg-tertiary: #EDE6D8;

  /* Text palette */
  --color-text-primary: #1A1412;
  --color-text-secondary: #6B5E52;
  --color-text-tertiary: #9C8E80;

  /* Accent */
  --color-accent-warm: #E8713A;
  --color-accent-warm-hover: #D4622E;
  --color-accent-soft: #F2C78A;

  /* Semantic */
  --color-success: #5BA867;
  --color-success-soft: #E8F5E9;
  --color-border-light: #E8E0D4;
  --color-border-focus: #E8713A;
  --color-surface-overlay: rgba(26, 20, 18, 0.4);

  /* Environment */
  --color-sky-top: #D6ECFA;
  --color-sky-bottom: #FEFCF8;
  --color-ground-surface: #E8DCC8;
  --color-ground-shadow: #D6CBAE;
  --color-ground-highlight: #F2EADC;

  /* Typography */
  --font-display: 'Fredoka', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;

  /* Custom font sizes (Tailwind 4 format) */
  --text-display-lg: 1.75rem;
  --text-display-lg--line-height: 1.2;
  --text-display-md: 1.375rem;
  --text-display-md--line-height: 1.25;
  --text-heading: 1.125rem;
  --text-heading--line-height: 1.3;
  --text-body-lg: 1rem;
  --text-body-lg--line-height: 1.5;
  --text-body: 0.875rem;
  --text-body--line-height: 1.5;
  --text-body-sm: 0.75rem;
  --text-body-sm--line-height: 1.4;
  --text-label: 0.875rem;
  --text-label--line-height: 1.2;
  --text-gonn-speech: 0.9375rem;
  --text-gonn-speech--line-height: 1.4;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(26, 20, 18, 0.06);
  --shadow-card-hover: 0 2px 6px rgba(26, 20, 18, 0.1);
  --shadow-button: 0 2px 8px rgba(232, 113, 58, 0.25);
  --shadow-button-hover: 0 4px 12px rgba(232, 113, 58, 0.35);
  --shadow-sheet: 0 -4px 20px rgba(26, 20, 18, 0.1);
  --shadow-toast: 0 4px 12px rgba(26, 20, 18, 0.15);
  --shadow-bubble: 0 2px 8px rgba(36, 3, 2, 0.08);
  --shadow-fire-glow: 0 0 8px rgba(208, 55, 49, 0.3);

  /* Border radius */
  --radius-card: 16px;
  --radius-button: 16px;
  --radius-button-sm: 12px;
  --radius-input: 12px;
  --radius-sheet: 24px;

  /* Z-index */
  --z-ground: 5;
  --z-rive: 10;
  --z-bubble: 15;
  --z-habits: 20;
  --z-fire-bar: 25;
  --z-top-bar: 30;
  --z-drawer: 40;
  --z-modal: 50;

  /* Background images */
  --bg-fire-gradient: linear-gradient(to right, #E8713A, #D03731);
  --bg-sky-gradient: linear-gradient(to bottom, #D6ECFA, #FEFCF8);
  --bg-ground-gradient: linear-gradient(to bottom, #F2EADC 0%, #E8DCC8 15%, #E8DCC8 75%, #D6CBAE 100%);
}
```

> **Note on `--color-text-*` tokens:** Tailwind 4 reserves `--color-*` for all color utilities. Using `--color-text-primary` means the Tailwind class is `text-text-primary` (verbose). An alternative is to use semantic aliases like `--color-content-primary`. Decide at implementation time which naming feels cleaner and apply consistently.

---

## Acceptance Criteria (Full)

- [ ] All 8 phases complete
- [ ] No `hungry-*` green tokens remain in component files
- [ ] Home screen matches design guide §6.1 layout exactly
- [ ] `pnpm check` passes (no TypeScript errors)
- [ ] `pnpm test:unit` passes
- [ ] App works offline (PWA service worker unaffected)
- [ ] Gonn dialogue appears in Svelte speech bubble (not Rive)
- [ ] Fire bar fills on habit completion with gradient animation
- [ ] Confetti fires on 7/30/100 streak milestones
- [ ] `/journey` route works; `/dashboard` returns 404

