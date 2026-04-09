# Gonn — Rive Artboard Specification

**Audience:** Rive animator / designer  
**File:** `static/animations/gonn.riv`  
**Last Updated:** April 2026

This document is the single source of truth for everything the Rive editor must provide.
The SvelteKit app is already fully wired — all inputs, properties, and triggers listed here
are consumed by `Monster.svelte` at runtime. Anything marked **⏳ Pending** is not yet in
the .riv file and is blocking the feature it describes.

---

## 1. Artboard & State Machine

| Setting | Value |
|---------|-------|
| Artboard name | `Artboard` |
| State machine name | `State Machine 1` |
| View Model name | `CharacterVM` |
| Layout fit | Cover |
| Layout alignment | Bottom-center |

The app loads Gonn with `autoBind: true`, so the View Model must be bound to the artboard
in the Rive editor for auto-binding to work. Do **not** rename the artboard, state machine,
or view model — the app references them by name.

---

## 2. View Model — CharacterVM

All properties are read from the VM instance after load. The app will silently skip any
property it cannot find, so missing properties degrade gracefully (no crash). Properties
marked **⏳ Pending** are not yet in the .riv file.

### 2.1 Number Properties

| Property | Range | Purpose | Status |
|----------|-------|---------|--------|
| `headX` | −1 to 1 | Horizontal gaze direction (−1 = far left, +1 = far right) | ✅ Exists |
| `headY` | −1 to 1 | Vertical gaze direction (−1 = look up, +1 = look down) | ✅ Exists |
| `emotion` | 0 – 7 | Active emotion state (see §3) | ✅ Exists |
| `intensity` | 0 – 1 | Blend weight / animation intensity | ✅ Exists |

`headX` / `headY` are updated at ~60 fps by a smooth `requestAnimationFrame` loop when the
user moves their cursor over the home screen, and by the rule engine at lower frequency
otherwise. The Rive state machine should read these as continuous inputs driving a
look-direction blend tree.

### 2.2 String Properties

| Property | Max length | Purpose | Status |
|----------|-----------|---------|--------|
| `expression` | — | Named expression override: `"normal"`, `"excited"`, `"bored"`, `"surprised"` | ✅ Exists |
| `dialogueText` | ~80 chars | Text content for the speech bubble text run | ⏳ Pending |

`dialogueText` is written character-by-character (typewriter, 30 ms/char) by the app.
The text run bound to this property must reflow gracefully as the string grows.

### 2.3 Boolean Properties

| Property | Purpose | Status |
|----------|---------|--------|
| `dialogueVisible` | Show / hide the speech bubble layer | ⏳ Pending |

When `dialogueVisible` is `false` the speech bubble should be fully hidden (opacity 0 or
moved off-artboard). When it transitions to `true` it should animate in (scale + fade).
The app controls visibility; the Rive animation controls the entrance/exit easing.

---

## 3. Emotion States

The `emotion` number property drives the primary animation state. The state machine should
use it as a condition to enter the corresponding animation layer/state.

| Value | Name | Visual behaviour |
|-------|------|-----------------|
| 0 | `idle` | Gentle breathing loop, neutral face, occasional idle fidget |
| 1 | `happy` | Soft smile, relaxed posture, slow tail wag |
| 2 | `excited` | Wide eyes, bouncy idle, faster movement |
| 3 | `tired` | Drooping eyes, slumped posture, slow movements |
| 4 | `sad` | Downcast eyes, still posture (reserved for future use) |
| 5 | `sleeping` | Eyes closed, slow breathing, Zzz particles (reserved) |
| 6 | `eating` | Chewing/munching action (used during habit completion) |
| 7 | `celebrating` | Arms up, excited bounce, particles — used for evolution & Day 100 feast |

`intensity` (0–1) blends within the current emotion. At intensity 0.1 the emotion is barely
perceptible; at 1.0 it is fully expressive. Use it as a blend weight on the emotion
animation layer.

The `expression` string property can temporarily override `emotion`. The app sets it for 3
seconds (e.g. on tap) then returns control to the rule engine.

---

## 4. Evolution Stages — 5 Bodies

Gonn has five distinct visual forms. The **app does not** switch artboards or state machines
between stages — instead, the Rive artboard must contain all five forms and show/hide them
based on the `emotion` + `intensity` values and the Solo mechanism or a dedicated
`evolutionStage` layer condition.

> **Recommended approach:** use a Rive **Solo** group with five nested artboards/clips,
> one per stage. The code sends `evolutionStage` indirectly via the mascot state; you can
> use a separate Number VM property for explicit stage control if needed (add
> `evolutionStage` as a Number, range 1–5, and the app will populate it automatically from
> the `emotion` property context — or add it explicitly if you need a direct binding).

| Stage | Name | Satiation | Visual character |
|-------|------|-----------|-----------------|
| 1 | Egg | 0 – 9 | Smooth egg, no limbs, subtle pulse |
| 2 | Hatchling | 10 – 24 | Small cracked shell, tiny arm buds, large blinking eyes |
| 3 | Juvenile | 25 – 49 | Visible limbs, small horns, bigger jaw, playful energy |
| 4 | Adult | 50 – 79 | Full body, pronounced horns, tail, confident posture |
| 5 | Apex | 80 – 100 | Massive kaiju, glowing eyes, large tail, imposing frame |

Stage transitions are triggered by the rule engine when satiation crosses a threshold. The
app fires them as discrete events, not continuous interpolations — so a hard cut between
stages (wrapped in a short transition animation) is appropriate.

---

## 5. Event Sequences & Cutscenes

The app sets `trigger` values in the MascotState. These currently are not wired to
explicit Rive trigger inputs (they drive LLM dialogue), but the following cutscene timings
should guide the animations the Rive file plays on state changes.

### 5.1 Evolution Cutscene (~1 s) — trigger: `levelUp`

| Time | Action |
|------|--------|
| 0.00 – 0.30 s | Current form glows, particles build |
| 0.30 s | Solo cuts to next stage form |
| 0.30 – 0.70 s | New form scales in with spring overshoot |
| 0.70 – 1.00 s | Settle, big smile, brief `celebrating` pose |

Plays once automatically when the stage number increases. Should loop back to idle after
completing.

### 5.2 Regression Cutscene (~1.5 s) — trigger: `regress`

Slow and gentle. No flash, no punitive feel.

| Time | Action |
|------|--------|
| 0.00 – 0.50 s | Slow scale-down, colours desaturate slightly |
| 0.50 s | Solo cuts to smaller stage form |
| 0.50 – 1.00 s | Smaller form settles with slight droop |
| 1.00 – 1.50 s | Gonn looks up at the user, blinks, neutral expression |

### 5.3 Day 100 Feast (~1.5 s) — trigger: `celebrate100`

Played when a single habit reaches 100 completions.

| Time | Action |
|------|--------|
| 0.00 – 0.40 s | Eating pose (emotion 6), large stylised food item appears |
| 0.40 – 1.00 s | Exaggerated chew/gulp, food disappears |
| 1.00 – 1.50 s | Celebration burst (emotion 7), particles, big grin |

If evolution fires on the same event, the feast plays first, then the evolution cutscene
follows immediately after.

---

## 6. Speech Bubble — Implemented on the Svelte Side ✅

The speech bubble is **not inside the .riv file**. It is rendered as an HTML/CSS overlay
by `src/lib/components/SpeechBubble.svelte`, positioned in a fixed layer directly above
Gonn's canvas (see Phase C of `docs/features/design-guide-implementation.md`).

### How it works

```
monsterSetDialogue(text)
  → showDialogue(text)        # updates dialogueStore ($state)
    → SpeechBubble.svelte     # reacts to store, runs typewriter effect
```

`SpeechBubble.svelte` renders above Gonn at `z-[15]`, positioned via
`bottom: calc(var(--gonn-size) + 8px)`. It handles its own typewriter animation,
entrance/exit transitions, `prefers-reduced-motion`, and screen-reader announcements.

### What this means for Rive

The `dialogueText` (string) and `dialogueVisible` (boolean) VM properties **do not need
to be added to the Rive artboard**. The code still binds to them at runtime (as dead code
kept for forward-compat), but if they are absent from the artboard the app degrades
gracefully with no errors — `setDialogue()` on the Rive side becomes a no-op.

If a native Rive speech bubble is ever desired for visual polish, it can be added later
as an enhancement, but it is **not a blocker for any current feature**.

---

## 7. Head Tracking — Gaze System

`headX` and `headY` are written continuously (up to 60 fps). The Rive state machine should
expose a smooth blend tree or constraint system that rotates Gonn's eyes and head slightly
in the direction indicated. Suggested implementation:

- **Eyes:** offset pupils by up to ±10% of eye width using `headX`/`headY`
- **Head tilt:** rotate head bone by ±8° on Y (horizontal) and ±5° on X (vertical)
- **Lag:** add a small spring/follow constraint inside Rive so micro-jitter from mouse
  movement is smoothed (the app also eases the values, so double-smoothing is fine)

---

## 8. Technical Constraints

| Constraint | Detail |
|-----------|--------|
| Renderer | `@rive-app/canvas` v2.37.0 — canvas renderer (not WebGL Rive renderer) |
| Auto-bind | `autoBind: true` — VM must be attached to artboard in Rive editor |
| HiDPI | Canvas is resized to device pixel ratio on load and window resize |
| Pause on hide | Rive is paused via IntersectionObserver when < 10% visible |
| Pause on tab | Rive is paused when `document.visibilityState` is hidden |
| Emoji fallback | If WebGL is unavailable, Rive is not loaded at all; emoji is shown |
| Asset path | `/animations/gonn.riv` (relative to `static/`) |

---

## 9. Summary Checklist

### Already in gonn.riv ✅

- [ ] Artboard `Artboard` with state machine `State Machine 1`
- [ ] CharacterVM view model with `headX`, `headY`, `emotion`, `intensity`, `expression`
- [ ] 5 evolution stage forms (Egg → Hatchling → Juvenile → Adult → Apex)
- [ ] 8 emotion animations (idle, happy, excited, tired, sad, sleeping, eating, celebrating)
- [ ] Head tracking / gaze blend tree
- [ ] Evolution and regression cutscenes

### No longer needed in Rive ✅ (resolved — Svelte-side)

~~`dialogueText` / `dialogueVisible` / speech bubble layer~~ — The speech bubble is
implemented as an HTML/CSS component (`SpeechBubble.svelte`). The Rive artboard does
**not** need these. See §6 for details.

### Nothing currently blocking

All Rive requirements for the current feature set are either already in the file or no
longer needed. The checklist above (Artboard, CharacterVM, stage forms, emotions,
head tracking, cutscenes) represents the full scope of work required from the Rive editor.
