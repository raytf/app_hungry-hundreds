# Hungry Hundreds — Design Guide

**Purpose:** This document is the single source of truth for all visual and interaction design decisions in Hungry Hundreds. It is written for an AI agent building the UI in SvelteKit + Tailwind CSS. Follow every specification literally. When in doubt, default to simplicity.

**Last Updated:** April 2026

---

## 1. Design Philosophy

Hungry Hundreds sits between Duolingo's bold playfulness and Finch's soft emotional warmth. The UI should feel **clean, warm, and confident** — never clinical, never cluttered.

### Core Principles

1. **Gonn is the interface, not a feature.** The mascot occupies the visual center of the app. Every screen either shows Gonn or leads back to Gonn. The UI exists to frame the character, not compete with it.

2. **One action per screen.** Each view has a single primary action. No screen should present more than one decision at a time. Inspired by Duolingo's lesson flow and Finch's gentle progressive disclosure.

3. **Quiet UI, loud character.** The surrounding interface is muted and minimal. Color, animation, and personality live in Gonn — not in the chrome. Buttons, cards, and backgrounds are deliberately understated so Gonn commands attention.

4. **Warmth over precision.** Rounded corners, soft shadows, generous whitespace, and warm neutrals. The app should feel like a cozy space, not a productivity dashboard. Inspired by Finch's "emotional safety through softness."

5. **No guilt, ever.** Visual design must never communicate failure, shame, or urgency through aggressive color (no red badges, no warning icons on missed habits). Concern is expressed through Gonn's animation state, never through UI elements.

6. **Progressive disclosure.** Show only what's needed right now. Advanced details (stats, settings, history) are available but never prominent. The home screen is Gonn + today's habits. That's it.

---

## 2. Color System

### 2.1 Gonn's Palette (Character Only)

These colors are reserved exclusively for Gonn's rendered body and associated character elements (speech bubbles, evolution effects). They must **never** appear as UI chrome colors (button backgrounds, card borders, nav elements).

| Token       | Hex       | Usage                                 |
| ----------- | --------- | ------------------------------------- |
| `gonn-red`  | `#D03731` | Gonn's primary body color             |
| `gonn-gold` | `#EFD67C` | Gonn's belly, accents, highlights     |
| `gonn-dark` | `#240302` | Gonn's outlines, eyes, shadow details |

### 2.2 UI Palette

The UI palette is deliberately muted and warm to let Gonn pop visually. Think cream paper, soft stone, and muted earth tones.

| Token               | Hex                     | Role                    | Usage                                         |
| ------------------- | ----------------------- | ----------------------- | --------------------------------------------- |
| `bg-primary`        | `#FEFCF8`               | Page background         | Default background for all screens            |
| `bg-secondary`      | `#F5F0E8`               | Card/surface background | Habit cards, drawer background, modals        |
| `bg-tertiary`       | `#EDE6D8`               | Subtle emphasis         | Active states, pressed cards, dividers        |
| `text-primary`      | `#1A1412`               | Primary text            | Headings, habit names, primary labels         |
| `text-secondary`    | `#6B5E52`               | Secondary text          | Timestamps, secondary labels, descriptions    |
| `text-tertiary`     | `#9C8E80`               | Muted text              | Placeholders, disabled states, footnotes      |
| `accent-warm`       | `#E8713A`               | Primary action          | CTA buttons, active indicators, links         |
| `accent-warm-hover` | `#D4622E`               | Hover/pressed CTA       | Darkened CTA on interaction                   |
| `accent-soft`       | `#F2C78A`               | Soft highlight          | Progress fills, completion indicators, badges |
| `success`           | `#5BA867`               | Positive feedback       | Completion checkmarks, streak indicators      |
| `success-soft`      | `#E8F5E9`               | Positive background     | Behind success states                         |
| `surface-overlay`   | `rgba(26, 20, 18, 0.4)` | Overlay                 | Drawer backdrop, modal dimming                |
| `border-light`      | `#E8E0D4`               | Borders                 | Card outlines, separators                     |
| `border-focus`      | `#E8713A`               | Focus ring              | Keyboard/accessibility focus state            |

### 2.3 Environment Palette

The home screen features a layered environmental background behind the habits list and Gonn. These colors create the "world" Gonn lives in — a sky gradient behind the habits area and a distinct ground surface Gonn stands on. Managed via HTML/CSS/GSAP on the Svelte side, not inside the `.riv` file.

| Token              | Value     | Role                                            |
| ------------------ | --------- | ----------------------------------------------- |
| `sky-top`          | `#D6ECFA` | Top of sky gradient (cool, airy)                |
| `sky-bottom`       | `#FEFCF8` | Bottom of sky gradient (blends into bg-primary) |
| `ground-surface`   | `#E8DCC8` | Base ground color Gonn stands on                |
| `ground-shadow`    | `#D6CBAE` | Subtle shadow/depth beneath Gonn                |
| `ground-highlight` | `#F2EADC` | Lighter ground near the horizon line            |

**Rules for environment colors:**

- The sky gradient is rendered as a CSS `linear-gradient` on the scrollable habits container background. It scrolls with the content — it IS the background of the habits area.
- The ground surface is rendered behind the fixed Gonn canvas. It does not scroll.
- The ground and sky meet at the top edge of the Gonn canvas. The transition should feel natural (no hard line — use a soft gradient or blur at the seam).
- Environment colors may be adjusted per evolution stage or time-of-day in future iterations. The guide specifies the default (daytime) palette above.
- These environment colors are **decorative only** — no text or interactive elements should be placed directly on them without a card or surface behind.

### 2.4 Color Rules

- **Never use pure black (`#000`) or pure white (`#FFF`).** Always use the warm variants above.
- **Never use red for errors or warnings in the habit context.** Missed habits are communicated through Gonn's emotional state, not UI color. Use `text-secondary` for "not yet completed" states.
- **Exception — the fire progress bar.** The daily progress bar uses a gradient from `accent-warm` (#E8713A) to `gonn-red` (#D03731). This is the only place `gonn-red` appears in UI chrome. It is intentional — the bar represents Gonn's feeding, so the character color bleeds into this single element.
- **The only other saturated color in the UI is `accent-warm`** (the CTA orange). Everything else is desaturated and warm.
- **Gonn's colors bleed into two places only:** (1) the speech bubble background uses `gonn-gold` at 15% opacity (`rgba(239, 214, 124, 0.15)`) with a `gonn-dark` text color, and (2) the fire progress bar fill gradient.

---

## 3. Typography

### 3.1 Font Stack

| Role               | Family      | Weight(s)                               | Fallback                |
| ------------------ | ----------- | --------------------------------------- | ----------------------- |
| Display / Headings | **Fredoka** | 500 (Medium), 600 (SemiBold)            | `system-ui, sans-serif` |
| Body / UI          | **DM Sans** | 400 (Regular), 500 (Medium), 700 (Bold) | `system-ui, sans-serif` |

**Loading:** Import via Google Fonts. Use `font-display: swap` to prevent FOIT. Only load the weights listed above — no extras.

```html
<link
	href="https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600&family=DM+Sans:wght@400;500;700&display=swap"
	rel="stylesheet"
/>
```

### 3.2 Type Scale

Mobile-first. All sizes in `rem` (base 16px). Line heights are unitless multipliers.

| Token         | Size               | Weight | Font    | Line Height | Usage                                   |
| ------------- | ------------------ | ------ | ------- | ----------- | --------------------------------------- |
| `display-lg`  | `1.75rem` (28px)   | 600    | Fredoka | 1.2         | Day 100 Feast headline, evolution title |
| `display-md`  | `1.375rem` (22px)  | 600    | Fredoka | 1.25        | Screen titles ("Day 42"), greeting      |
| `heading`     | `1.125rem` (18px)  | 500    | Fredoka | 1.3         | Section headers, card titles            |
| `body-lg`     | `1rem` (16px)      | 400    | DM Sans | 1.5         | Primary body text, habit names          |
| `body`        | `0.875rem` (14px)  | 400    | DM Sans | 1.5         | Secondary text, descriptions            |
| `body-sm`     | `0.75rem` (12px)   | 500    | DM Sans | 1.4         | Captions, timestamps, metadata          |
| `label`       | `0.875rem` (14px)  | 700    | DM Sans | 1.2         | Button labels, tab labels               |
| `gonn-speech` | `0.9375rem` (15px) | 500    | Fredoka | 1.4         | Gonn's dialogue bubble text             |

### 3.3 Typography Rules

- **Fredoka is for display and Gonn only.** Never use Fredoka for body text, form labels, or meta info.
- **DM Sans carries the UI.** All interactive elements, descriptions, and data use DM Sans.
- **Letter spacing:** Fredoka at `display-lg` gets `-0.01em`. All other text uses default tracking.
- **Max line width:** Body text should never exceed `36ch` on mobile. Use container constraints, not text-specific max-widths.
- **No ALL CAPS** anywhere in the app. Fredoka's character is in its rounded forms — all caps kills it.

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

Use a consistent 4px base grid. All spacing is a multiple of 4.

| Token      | Value  | Common Use                              |
| ---------- | ------ | --------------------------------------- |
| `space-1`  | `4px`  | Icon-to-label gap                       |
| `space-2`  | `8px`  | Tight internal padding                  |
| `space-3`  | `12px` | Card internal padding (compact)         |
| `space-4`  | `16px` | Default card padding, element gaps      |
| `space-5`  | `20px` | Section gaps                            |
| `space-6`  | `24px` | Screen horizontal padding               |
| `space-8`  | `32px` | Section separators, Gonn-to-content gap |
| `space-10` | `40px` | Major section breaks                    |
| `space-12` | `48px` | Top-of-screen safe area + padding       |

### 4.2 Screen Structure

Every screen follows a vertical stack layout. The **home screen** has a unique split layout where Gonn is fixed at the bottom and habits scroll above. Other screens use a simpler scrollable content area.

#### Home Screen Structure (Primary Layout)

```
┌─────────────────────────────────┐
│  Status bar (system)            │  ← OS-managed
├─────────────────────────────────┤
│  Top bar                        │  ← 48px: [☰] left, date center, sync right
├─────────────────────────────────┤
│  Fire progress bar              │  ← 6px: gradient fill, today's completion %
├─────────────────────────────────┤  ─┐
│                                 │   │
│  Today's Habits (scrollable)    │   │ ← flex-1, overflow-y: auto
│  ┌───────────────────────────┐  │   │    Sky gradient background
│  │  Habit Card 1             │  │   │
│  └───────────────────────────┘  │   │
│  ┌───────────────────────────┐  │   │
│  │  Habit Card 2             │  │   │
│  └───────────────────────────┘  │   │
│                                 │   │
├─────────────────────────────────┤  ─┘
│  ┌─────────────────────────┐    │
│  │  "Morning! Feed me."    │    │  ← Speech bubble (floats above Rive canvas)
│  └──────────┬──────────────┘    │
│             ▼                   │
│  ┌─────────────────────────────┐│  ─┐
│  │                             ││   │
│  │        🦎 GONN 🦎            ││   │ ← Rive canvas: full-width square,
│  │     (Rive animation)        ││   │    fixed to bottom, ground surface bg
│  │                             ││   │
│  └─────────────────────────────┘│  ─┘
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← safe-area-inset-bottom
└─────────────────────────────────┘
```

**Key structural rules:**

- The Rive canvas is **fixed to the bottom** of the viewport. It does not scroll.
- The habits container fills the remaining vertical space between the fire progress bar and the top edge of the Gonn canvas/speech bubble.
- The speech bubble sits in a **fixed zone between the habits list and the Rive canvas**. It does not scroll with habits. It floats above the canvas and below the scrollable area.
- The habits list scrolls independently. When scrolled, habit cards may disappear behind the top bar but never overlap the speech bubble or Gonn.

#### Other Screens Structure

```
┌─────────────────────────────────┐
│  Status bar (system)            │  ← OS-managed
├─────────────────────────────────┤
│  Top bar                        │  ← 48px: [☰] left, screen title center
├─────────────────────────────────┤
│                                 │
│  Content area (scrollable)      │  ← flex-1, overflow-y: auto
│                                 │
└─────────────────────────────────┘
```

Non-home screens (Journey, Settings, etc.) do NOT show the Rive canvas or speech bubble. They use the full viewport height for scrollable content.

- **No bottom tab bar.** Navigation is through Gonn (tap for interaction) and a hamburger drawer (top-left).
- **Screen horizontal padding:** `24px` (space-6) on both sides. The Rive canvas and fire progress bar are full-bleed (no horizontal padding).
- **Safe area handling:** Use `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` for notch/home-bar devices. The Rive canvas container accounts for bottom safe area (ground surface extends behind the home indicator).

### 4.3 Gonn Viewport

Gonn's Rive canvas (exported as `monster.riv` at 400×400px, transparent background) is fixed to the bottom of the home screen. The Svelte side provides the environmental background — Gonn never floats on a bare page.

| Property         | Value                       | Notes                                                 |
| ---------------- | --------------------------- | ----------------------------------------------------- |
| Width            | `100vw`                     | Full viewport width, no horizontal padding            |
| Height           | Equal to width              | Maintains 1:1 aspect ratio (square)                   |
| Position         | `fixed`, bottom of viewport | Anchored above `safe-area-inset-bottom`               |
| z-index          | `10`                        | Above page background, below modals/sheets/drawer     |
| Background       | Ground surface (see 4.4)    | Rendered behind the `<canvas>`, not inside the `.riv` |
| Touch target     | Entire canvas               | Tapping anywhere on Gonn triggers interaction         |
| Rive source      | `monster.riv` (400×400px)   | Scales to fill container; `fit: RiveFit.contain`      |
| Canvas rendering | `@rive-app/canvas`          | WebGL2 preferred; canvas fallback                     |

**Sizing on real devices:**

| Device            | Screen width | Canvas size | % of viewport height |
| ----------------- | ------------ | ----------- | -------------------- |
| iPhone SE         | 375px        | 375×375     | ~56%                 |
| iPhone 14         | 390px        | 390×390     | ~46%                 |
| iPhone 14 Pro Max | 430px        | 430×430     | ~46%                 |
| Pixel 7           | 412px        | 412×412     | ~47%                 |

On standard phones, Gonn takes ~46% of viewport height. This is intentional — Gonn is the star. The remaining ~54% holds the top bar, fire bar, and habits list.

**Responsive cap:** On screens wider than `430px`, the Gonn container caps at `430px` width (and therefore 430px height), centered horizontally. The ground surface extends full-width behind it.

### 4.4 Environmental Background

The home screen has a layered environmental background managed entirely on the Svelte side via HTML, CSS, and GSAP. The `.riv` file has a transparent background — all environment rendering happens outside Rive.

#### Ground Layer (Behind Gonn Canvas)

The ground is a distinct surface Gonn stands on. It occupies the same fixed container as the Rive canvas but renders behind it.

```
┌─────────────────────────────────┐
│  ground-highlight (#F2EADC)     │  ← Top 15%: horizon glow
│  ground-surface (#E8DCC8)       │  ← Middle 60%: main ground
│  ground-shadow (#D6CBAE)        │  ← Bottom 25%: depth/shadow
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← safe-area fills with ground-shadow
└─────────────────────────────────┘
```

| Property      | Value                                                                                |
| ------------- | ------------------------------------------------------------------------------------ |
| Rendering     | CSS `linear-gradient(to bottom, #F2EADC 0%, #E8DCC8 15%, #E8DCC8 75%, #D6CBAE 100%)` |
| Width         | `100vw` (full bleed)                                                                 |
| Height        | Same as Gonn canvas + `env(safe-area-inset-bottom)`                                  |
| Position      | `fixed`, bottom `0`                                                                  |
| z-index       | `5` (behind Rive canvas at `10`)                                                     |
| Border radius | `0` (no rounding — bleeds to screen edges)                                           |

#### Sky Layer (Behind Habits List)

The scrollable habits container has a sky gradient as its background. This creates the sense that habit cards float in Gonn's sky.

| Property    | Value                                                      |
| ----------- | ---------------------------------------------------------- |
| Rendering   | CSS `linear-gradient(to bottom, #D6ECFA 0%, #FEFCF8 100%)` |
| Application | `background` on the scrollable habits container            |
| Scrolls     | Yes — the sky moves with the habit cards                   |

#### Horizon Seam

Where the sky (scrollable) meets the ground (fixed), avoid a hard edge:

- Apply a `box-shadow: inset 0 -20px 20px -10px rgba(232, 220, 200, 0.5)` on the bottom of the habits scroll container to create a soft atmospheric fade.
- Alternatively, the speech bubble zone (between habits and Gonn) can serve as a natural visual break.

#### GSAP Animation Hooks (Future)

The environment system is designed to support GSAP-driven animation in future iterations:

- **Time-of-day shifts:** Sky gradient transitions from dawn (warm peach) → day (cool blue) → dusk (amber) → night (deep blue). Driven by user's local time via GSAP timeline.
- **Evolution stage shifts:** Ground texture/color subtly changes as Gonn evolves (e.g., barren → grassy → lush). Each stage has a ground palette variant.
- **Mood-reactive:** Subtle sky desaturation when Gonn is tired; brighter when happy.

For MVP, use the static default palette defined above. The CSS custom properties structure should support swapping these values via GSAP without layout changes.

### 4.5 Top Bar

Always visible on the home screen. Fixed at top (does not scroll).

```
┌─────────────────────────────────────────┐
│  [☰]       Thursday, Apr 6       [●]   │
└─────────────────────────────────────────┘
  ↑ hamburger    ↑ today's date     ↑ sync status
```

| Property   | Value                                                                  |
| ---------- | ---------------------------------------------------------------------- |
| Height     | `48px`                                                                 |
| Background | `bg-primary` (#FEFCF8) with 90% opacity + `backdrop-filter: blur(8px)` |
| Padding    | `0 24px` (space-6)                                                     |
| z-index    | `30` (above everything except modals)                                  |
| Layout     | Flexbox row, `justify-content: space-between`, `align-items: center`   |

**Elements:**

- **Hamburger icon** (left): 24×24px, `text-secondary` color. Tap opens drawer.
- **Date** (center): Today's date in `body` size (DM Sans 500, 14px), `text-primary`. Format: `"Thursday, Apr 6"` (day name + short month + day number). No year.
- **Sync status** (right): Small dot indicator, 8×8px.
  - Synced: `success` (#5BA867), no label.
  - Syncing: `accent-soft` (#F2C78A), subtle pulse animation (opacity 0.5 → 1, 1s loop).
  - Offline: `text-tertiary` (#9C8E80), no animation.

### 4.6 Fire Progress Bar

Sits directly below the top bar. Represents today's habit completion progress (0% = no habits done, 100% = all scheduled habits completed today). The fire metaphor: completing habits feeds Gonn, and the bar fills with growing flame-like warmth.

| Property           | Value                                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| Position           | Directly below top bar, full viewport width                            |
| Height             | `6px`                                                                  |
| Background (track) | `bg-tertiary` (#EDE6D8)                                                |
| Background (fill)  | `linear-gradient(to right, #E8713A, #D03731)` (accent-warm → gonn-red) |
| Border radius      | `0` (full-bleed, no rounding — bleeds to screen edges)                 |
| z-index            | `25` (below top bar, above habits scroll)                              |
| Width (fill)       | `(completedToday / scheduledToday) * 100%`                             |
| Padding            | `0` (no horizontal padding — truly edge-to-edge)                       |

**Behavior:**

- At 0%: Only the track is visible (muted warm gray). No fill.
- As habits are completed: Fill grows from left to right. The gradient means the left edge is warm orange and the leading edge pushes toward red — visually simulating fire spreading.
- At 100%: Full bar is the complete gradient. A subtle glow effect appears: `box-shadow: 0 0 8px rgba(208, 55, 49, 0.3)` on the bar, pulsing gently (opacity 0.2 → 0.4, 2s ease-in-out loop).
- **Animation:** Fill width transitions with `400ms ease-out` on each completion. The gradient always stretches to the fill width (not fixed across the full bar).
- **If no habits are scheduled today:** Bar shows at 100% (full gradient) — off-days are already fed.
- **On `prefers-reduced-motion`:** No glow pulse. Fill transitions remain (they're functional, not decorative).

---

## 5. Component Library

### 5.1 Buttons

#### Primary Button (CTA)

The single most important action on screen. Maximum one per view.

```
Background:    accent-warm (#E8713A)
Text:          #FEFCF8 (bg-primary)
Font:          DM Sans 700, 14px (label)
Height:        52px
Border radius: 16px
Padding:       0 24px
Width:         100% of parent (full-width on mobile)
Shadow:        0 2px 8px rgba(232, 113, 58, 0.25)
```

**States:**

- Hover/Press: `accent-warm-hover` background, shadow increases to `0 4px 12px`
- Disabled: 40% opacity, no shadow, `pointer-events: none`
- Loading: Text replaced by spinner (20px, `bg-primary` color), button stays same size

#### Secondary Button

For non-primary actions (e.g., "Skip", "Maybe later", "View details").

```
Background:    transparent
Text:          accent-warm (#E8713A)
Font:          DM Sans 500, 14px
Height:        44px
Border:        1.5px solid border-light (#E8E0D4)
Border radius: 12px
Padding:       0 20px
```

**States:**

- Hover/Press: `bg-secondary` background
- Disabled: 40% opacity

#### Ghost Button

For tertiary actions, settings items, inline links.

```
Background:    transparent
Text:          text-secondary (#6B5E52)
Font:          DM Sans 500, 14px
Height:        40px
Border:        none
Border radius: 8px
Padding:       0 12px
```

**States:**

- Hover/Press: `bg-tertiary` background

### 5.2 Habit Card

The primary repeating unit on the home screen. One card per active habit.

```
┌─────────────────────────────────────────┐
│  [Flavor icon]  Habit Name         [●]  │
│                 Streak: 14 days         │
└─────────────────────────────────────────┘
```

| Property             | Value                              |
| -------------------- | ---------------------------------- |
| Background           | `bg-secondary` (#F5F0E8)           |
| Border radius        | `16px`                             |
| Padding              | `16px`                             |
| Margin between cards | `12px`                             |
| Shadow               | `0 1px 3px rgba(26, 20, 18, 0.06)` |
| Min height           | `72px`                             |
| Layout               | Flexbox row, `align-items: center` |

**Elements within:**

- **Flavor icon** (left): 32×32px, muted illustration matching the habit's flavor tag. Use a simple rounded container with `bg-tertiary` background if no custom icon.
- **Habit name** (center-left, flex-1): `body-lg` (DM Sans 400, 16px), `text-primary`.
- **Streak line** (below name): `body-sm` (DM Sans 500, 12px), `text-tertiary`.
- **Completion indicator** (right): 28×28px circle.
  - Not completed: `border-light` border (2px), hollow, `bg-primary` fill.
  - Completed: `success` (#5BA867) fill, white checkmark icon (16px).
  - Tapping this circle is the "complete" action.

**Completed state:** Entire card gets a subtle `success-soft` (#E8F5E9) background tint. Text remains unchanged (no strikethrough).

**Interaction:**

- Tap card body → expands to show detail (anchor reminder, stats). Use a smooth height animation (200ms ease-out).
- Tap completion circle → triggers completion. Circle fills with spring animation. Gonn reacts above.
- Swipe → No swipe actions. Keep it simple.

### 5.3 Speech Bubble

Gonn's dialogue appears in a fixed zone between the scrollable habits list and the Rive canvas. It does not scroll with habits and does not overlap Gonn's body.

```
  ┌───────────────────────────┐
  │  "First meal's the most   │
  │   important. Don't leave  │
  │   me hungry."             │
  └─────────┬─────────────────┘
            ▼ (tail pointing toward Gonn below)
```

| Property             | Value                                                                                         |
| -------------------- | --------------------------------------------------------------------------------------------- |
| Position             | Fixed zone between habits scroll container bottom and Rive canvas top                         |
| z-index              | `15` (above Rive canvas at 10, below top bar at 30)                                           |
| Background           | `rgba(239, 214, 124, 0.15)` (gonn-gold at 15%)                                                |
| Border               | `1px solid rgba(239, 214, 124, 0.3)`                                                          |
| Border radius        | `16px`                                                                                        |
| Padding              | `14px 18px`                                                                                   |
| Max width            | `280px`                                                                                       |
| Horizontal alignment | Centered in viewport                                                                          |
| Margin bottom        | `8px` above Rive canvas top edge                                                              |
| Font                 | Fredoka 500, 15px (`gonn-speech`)                                                             |
| Text color           | `text-primary` (#1A1412)                                                                      |
| Tail                 | CSS triangle, 12px, same background color, centered on bottom edge, pointing down toward Gonn |
| Shadow               | `0 2px 8px rgba(36, 3, 2, 0.08)`                                                              |

**Layout integration:**

- The speech bubble occupies a reserved strip of height between the habits scroll and Gonn. When the bubble is visible, the habits scroll container shrinks by the bubble's height (~60–80px depending on text length).
- When the bubble is hidden, the habits scroll container expands to fill the space (smooth height transition, 200ms ease-out).
- The bubble must never be clipped or overlapped by scrolling habit cards.

**Animation:**

- Appears: Fade in + scale from 0.9 to 1.0, 250ms ease-out, 300ms delay after Gonn's state change.
- Disappears: Fade out 200ms. Never abrupt.
- Text streams in character-by-character at 30ms per character for dialogue (simulating typing). Static for short system messages.

### 5.4 Fire Progress Bar

Fully specified in **Section 4.6**. The fire progress bar is a layout-level element (part of the home screen structure), not a reusable component. Its specs live with the layout rather than the component library to avoid duplication.

### 5.5 Drawer Menu

Slides in from the left. Contains secondary navigation and settings.

| Property      | Value                                                   |
| ------------- | ------------------------------------------------------- |
| Width         | `280px`                                                 |
| Background    | `bg-secondary` (#F5F0E8)                                |
| Overlay       | `surface-overlay` on content behind                     |
| Animation     | Slide from left, 250ms cubic-bezier(0.25, 0.1, 0.25, 1) |
| Border radius | `0 20px 20px 0` (right corners only)                    |
| Padding       | `space-12` top (48px), `space-6` sides (24px)           |

**Menu Items:**

Each item is a ghost-button-style row:

```
Height:        48px
Padding:       0 16px
Border radius: 12px
Font:          DM Sans 500, 16px (body-lg)
Color:         text-primary
Icon:          24×24px, text-secondary, left-aligned
Gap:           12px between icon and label
```

Hover/active state: `bg-tertiary` background.

**Menu structure (MVP):**

1. 🏠 Home (Gonn + habits)
2. 📊 Journey (stats & history)
3. ➕ Add Habit
4. ⚙️ Settings

Use simple line icons, not filled. Icon style: rounded, 1.5px stroke, matching the warm/soft aesthetic.

### 5.6 Modal / Bottom Sheet

For confirmations, habit creation steps, and detail views. On mobile, always use a bottom sheet (slides up from bottom), not a centered modal.

| Property      | Value                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Background    | `bg-primary` (#FEFCF8)                                                |
| Border radius | `24px 24px 0 0` (top corners)                                         |
| Max height    | `85vh`                                                                |
| Padding       | `24px` sides, `20px` top, `env(safe-area-inset-bottom) + 20px` bottom |
| Handle        | `40px × 4px` rounded bar, `bg-tertiary`, centered at top              |
| Shadow        | `0 -4px 20px rgba(26, 20, 18, 0.1)`                                   |
| Overlay       | `surface-overlay`                                                     |
| Animation     | Slide up 300ms cubic-bezier(0.25, 0.1, 0.25, 1)                       |

Dismissible by: dragging down, tapping overlay, or tapping explicit close button.

### 5.7 Text Input

For habit naming, custom identity statements, and settings.

| Property          | Value                                |
| ----------------- | ------------------------------------ |
| Height            | `48px`                               |
| Background        | `bg-secondary` (#F5F0E8)             |
| Border            | `1.5px solid border-light` (#E8E0D4) |
| Border (focused)  | `1.5px solid border-focus` (#E8713A) |
| Border radius     | `12px`                               |
| Padding           | `0 16px`                             |
| Font              | DM Sans 400, 16px                    |
| Text color        | `text-primary`                       |
| Placeholder color | `text-tertiary`                      |
| Caret color       | `accent-warm`                        |

No floating labels. Use a static label above the input in `body-sm` weight 500, `text-secondary`.

### 5.8 Toast / Snackbar

For transient, non-blocking feedback (e.g., "Habit saved", "Synced").

| Property      | Value                                    |
| ------------- | ---------------------------------------- |
| Position      | Top center, 16px below fire progress bar |
| Background    | `text-primary` (#1A1412)                 |
| Text color    | `bg-primary` (#FEFCF8)                   |
| Font          | DM Sans 500, 14px                        |
| Border radius | `12px`                                   |
| Padding       | `12px 20px`                              |
| Shadow        | `0 4px 12px rgba(26, 20, 18, 0.15)`      |
| Duration      | 2.5 seconds, then fade out 200ms         |
| Max width     | `320px`                                  |

No action buttons in toasts. No stacking. One toast at a time.

---

## 6. Screen Layouts

These are structural blueprints, not wireframes. They define spatial relationships and content hierarchy for the AI agent to implement.

### 6.1 Home Screen (Dashboard)

The app's resting state. What users see 95% of the time. This is the only screen that contains the Rive canvas.

**Vertical zones (top to bottom):**

| Zone               | Height                        | Scrolls?                 | z-index | Content                                    |
| ------------------ | ----------------------------- | ------------------------ | ------- | ------------------------------------------ |
| Top bar            | `48px`                        | No (fixed top)           | 30      | Hamburger, date, sync indicator            |
| Fire progress bar  | `6px`                         | No (fixed below top bar) | 25      | Today's completion gradient                |
| Habits scroll area | Flex (fills remaining)        | **Yes**                  | 20      | Today's habit cards on sky gradient        |
| Speech bubble zone | Auto (~60–80px when visible)  | No (fixed)               | 15      | Gonn's dialogue bubble                     |
| Rive canvas        | `100vw × 100vw` (square)      | No (fixed bottom)        | 10      | Gonn animation on ground surface           |
| Safe area          | `env(safe-area-inset-bottom)` | No                       | 5       | Ground color extends behind home indicator |

**Habits scroll area rules:**

- Background: sky gradient (`linear-gradient(to bottom, #D6ECFA, #FEFCF8)`).
- Padding: `16px` top, `24px` horizontal (space-6), `16px` bottom.
- Cards stack vertically with `12px` gap between them.
- If the user has more habits than fit on screen, the list scrolls. Cards disappear behind the top bar (which has a blur backdrop).
- The scroll container's bottom edge is the top of the speech bubble zone (or the Rive canvas top if no bubble is showing).
- On scroll, apply a subtle `mask-image: linear-gradient(to bottom, black 90%, transparent 100%)` at the bottom edge so cards fade into the speech bubble zone rather than clipping hard.
- A "Today's Habits" section label is optional. If shown, use `heading` size (Fredoka 500, 18px), `text-secondary`, at the top of the scroll area before the first card. Alternatively, omit the label entirely — the context is obvious.

**When all habits are completed:**

- Fire bar is at 100% with glow effect.
- All habit cards show completed state.
- Gonn is in a happy/content animation state.
- No additional "all done" banner needed — Gonn's reaction and the full fire bar ARE the feedback.

**When no habits exist yet (empty state):**

- Fire bar is hidden (or full, since nothing is scheduled).
- Habits area shows a centered message: "Tap ☰ to add your first habit" in `body-lg`, `text-tertiary`.
- Gonn is in egg state with dialogue: "I'm hungry. Feed me a habit."

### 6.2 Onboarding Flow

Conversational, one question per screen, driven by Gonn's dialogue. No form fields visible until Gonn "asks."

**Screen sequence:**

1. **The Egg** — Dark to light fade. Egg appears center screen. Gonn bubble: "I'm hungry. Are you?" Single CTA: "Feed me a habit."
2. **Habit Selection** — Gonn asks: "What do you want to get hungry for?" Options appear as large pill-shaped buttons (not a dropdown). Gonn responds to selection.
3. **Anchor Habit** — Gonn asks: "What do you already do every day?" Selection of common anchors.
4. **Identity Framing** — Gonn asks: "Who do you want to become?" Short list of identity statements + custom option.
5. **Home Screen** — Egg + first habit card. Journey begins.

**Onboarding visual rules:**

- Background is `bg-primary` throughout.
- No progress stepper or numbered steps — the conversation IS the progress.
- Transition between screens: cross-fade (300ms) with Gonn staying in place.
- Pill buttons for selections: height `48px`, `bg-secondary` background, `border-light` border, `16px` radius, `body-lg` text. Selected state: `accent-warm` border, `rgba(232, 113, 58, 0.08)` background fill.

### 6.3 Journey / Stats Screen

Accessed via drawer menu. Shows habit history and milestones. Secondary screen — never competes with the home screen for attention.

**Layout:**

- Header: "Your Journey" in `display-md`.
- A simple vertical timeline showing milestones (Day 1, first evolution, streaks, etc.) as small cards.
- Habit-specific stats expandable per habit.
- Minimal charting. If a chart is needed, use a simple area fill (using `accent-soft` fill, `accent-warm` line) — no grid lines, no axes, no data labels unless tapped.

### 6.4 Habit Creation (Post-Onboarding)

When adding a new habit from the drawer, follow the same conversational pattern as onboarding but abbreviated:

1. "What habit?" → Text input + suggestions.
2. "When?" → Time picker or anchor selection.
3. "How often?" → Frequency selector (daily / Nx per week / every X days) as segmented pills.
4. "Flavor?" → Flavor tag selection (brain-food, protein, etc.) as illustrated pills.
5. Confirmation → Gonn reacts: "New meal on the menu."

Each step is a bottom sheet, not a full-screen transition.

### 6.5 Evolution Cutscene

When Gonn evolves, the entire screen becomes the stage:

- Background dims to `surface-overlay`.
- Gonn's Rive animation plays the evolution sequence (handled by Rive state machine).
- After transformation: screen brightens, confetti particles (using `gonn-gold` and `accent-soft` colors), speech bubble with evolution dialogue.
- Single CTA: "Keep going" returns to home screen.
- Duration: ~3 seconds for animation, then user-dismissed.

---

## 7. Navigation Architecture

### 7.1 Primary Navigation: Gonn

Gonn is the main navigation anchor. The home screen IS the app for 95% of usage.

| Interaction                      | Result                                                       |
| -------------------------------- | ------------------------------------------------------------ |
| Tap Gonn (idle)                  | Triggers dialogue. Gonn speaks (async LLM call).             |
| Tap Gonn (after habit complete)  | Celebration response. Already handled by rule engine → Rive. |
| Tap habit card completion circle | Completes habit. Gonn reacts.                                |
| Tap habit card body              | Expands card to show detail.                                 |

### 7.2 Secondary Navigation: Drawer

Accessed via hamburger icon (top-left, `24×24px`, `text-secondary` color).

**Drawer contents (MVP):**

1. Home
2. Your Journey
3. Add Habit
4. Settings

**Drawer behavior:**

- Opens over content (not push).
- Tapping overlay or swiping left closes.
- Current page highlighted with `accent-warm` text + `rgba(232, 113, 58, 0.08)` background on the menu item.

### 7.3 No Back Button

SvelteKit handles browser back. The app does not render its own back button on the home screen. Bottom sheets and modals have close/dismiss affordances. The drawer has its own close behavior. No redundant navigation controls.

---

## 8. Animation & Interaction Patterns

### 8.1 General Principles

- **Everything has easing.** Never use linear transitions for UI elements. Default: `cubic-bezier(0.25, 0.1, 0.25, 1)` (ease-out).
- **Duration budget:** UI transitions should be 150–300ms. Nothing exceeds 400ms except celebration sequences.
- **Gonn's animations are separate.** Rive handles all character animation. These specs cover only UI animation (cards, modals, transitions).
- **Respect `prefers-reduced-motion`.** When the OS reduces-motion preference is active: no springs, no particles, no character-by-character text streaming. Use simple fades and instant state changes.

### 8.2 Specific Animations

| Element                   | Trigger                | Animation                                | Duration    | Easing                           |
| ------------------------- | ---------------------- | ---------------------------------------- | ----------- | -------------------------------- |
| Habit completion circle   | Tap                    | Scale 1 → 1.2 → 1 + fill color           | 300ms       | Spring (0.5 damping)             |
| Habit card (completed)    | After circle animation | Background color shift to `success-soft` | 200ms       | ease-out                         |
| Speech bubble appear      | Gonn state change      | Fade in + scale 0.9 → 1.0                | 250ms       | ease-out, 300ms delay            |
| Speech bubble text        | After bubble appears   | Character-by-character reveal            | 30ms/char   | Linear                           |
| Drawer open               | Hamburger tap          | Slide from left, overlay fades in        | 250ms       | cubic-bezier(0.25, 0.1, 0.25, 1) |
| Bottom sheet open         | Trigger action         | Slide up from bottom                     | 300ms       | cubic-bezier(0.25, 0.1, 0.25, 1) |
| Toast appear              | System event           | Slide up 8px + fade in                   | 200ms       | ease-out                         |
| Toast disappear           | Timeout (2.5s)         | Fade out                                 | 200ms       | ease-in                          |
| Fire bar fill             | Habit completion       | Width grows with gradient                | 400ms       | ease-out                         |
| Fire bar glow             | All habits completed   | Box-shadow opacity pulse 0.2 → 0.4       | 2000ms loop | ease-in-out                      |
| Speech bubble zone resize | Bubble show/hide       | Habits scroll area height adjusts        | 200ms       | ease-out                         |
| Screen transition         | Navigation             | Cross-fade                               | 300ms       | ease-in-out                      |
| Card expand               | Tap card body          | Height auto-animate                      | 200ms       | ease-out                         |
| Confetti (evolution)      | Evolution complete     | Particle burst from center               | 1500ms      | Custom (gravity + drag)          |

### 8.3 Haptic Feedback

If the device supports it (via `navigator.vibrate` or Capacitor haptics):

| Event               | Pattern                                             |
| ------------------- | --------------------------------------------------- |
| Habit completed     | Single short pulse (10ms)                           |
| Evolution triggered | Double pulse (10ms, 50ms gap, 10ms)                 |
| Day 100 Feast       | Triple pulse (10ms, 30ms gap, 10ms, 30ms gap, 20ms) |
| Drawer open         | Light pulse (5ms)                                   |

### 8.4 Celebration Particles

Used for evolution and Day 100 Feast only. Keep it lightweight (CSS/Canvas, not a heavy library).

| Property       | Value                                                                                  |
| -------------- | -------------------------------------------------------------------------------------- |
| Particle count | 30–50                                                                                  |
| Colors         | `gonn-gold` (#EFD67C), `accent-soft` (#F2C78A), `accent-warm` (#E8713A) at 60% opacity |
| Shape          | Small circles (3–6px)                                                                  |
| Behavior       | Burst from center, gravity pull down, slight random horizontal drift                   |
| Duration       | 1.5 seconds total, particles fade out in last 500ms                                    |

---

## 9. Iconography

### 9.1 Icon Style

- **Stroke-based, rounded line icons.** 1.5px stroke weight.
- **Size:** 24×24px default. 20×20px for compact contexts. 32×32px for feature icons.
- **Color:** `text-secondary` (#6B5E52) by default. `accent-warm` for active/selected states.
- **Source recommendation:** Lucide icons (already available in the project via `lucide-svelte` or `lucide-react`). These match the rounded, friendly aesthetic.
- **No filled icons.** Keep everything outlined to maintain the light, airy feel.

### 9.2 Flavor Tag Icons

Each habit has a flavor tag. These get small illustrated icons (32×32px) in the habit card. If custom illustrations aren't available, use emoji as placeholders:

| Flavor Tag     | Emoji Placeholder | Future Icon Style                     |
| -------------- | ----------------- | ------------------------------------- |
| `brain-food`   | 🧠                | Simple brain outline with steam lines |
| `protein`      | 💪                | Flexed arm, rounded                   |
| `dessert`      | 🍰                | Small cake slice                      |
| `soul-food`    | 🧘                | Seated figure, simple                 |
| `vitamins`     | 💊                | Capsule with sparkle                  |
| `mystery-meal` | 🎲                | Dice or question mark                 |

---

## 10. Accessibility

### 10.1 Minimum Requirements

- **Color contrast:** All text meets WCAG 2.1 AA. `text-primary` on `bg-primary` = 15.2:1. `text-secondary` on `bg-primary` = 5.8:1. `accent-warm` on `bg-primary` = 3.8:1 (use only for large text or icons, never body text).
- **Touch targets:** Minimum 44×44px for all interactive elements (buttons, cards, icons).
- **Focus indicators:** `2px solid border-focus` (#E8713A) with `2px offset` on all focusable elements. Never remove focus outlines.
- **Screen reader:** All Gonn dialogue must be available as `aria-live="polite"` announcements. Rive canvas gets `role="img"` with descriptive `aria-label` reflecting Gonn's current state.
- **Reduced motion:** Respect `prefers-reduced-motion: reduce`. See section 8.1.

### 10.2 Semantic Structure

- Home screen: `<main>` wrapping the entire home layout. Habits list is a `<section>` containing a `<ul>` with `<li>` per card. Rive canvas wrapper has `role="img"` with `aria-label` reflecting Gonn's current state (e.g., "Gonn is happy and well-fed"). Fire progress bar has `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"`, and `aria-label="Today's habit completion"`.
- Speech bubble: `role="status"`, `aria-live="polite"`. Positioned in a `<div>` between habits scroll and Rive canvas.
- Drawer: `<nav>` with `aria-label="Main menu"`. Uses `<ul>/<li>` for menu items.
- Bottom sheets: `role="dialog"` with `aria-modal="true"` and proper focus trapping.
- Top bar: `<header>` with the date as a `<time>` element for semantic correctness.

---

## 11. Responsive Behavior

Hungry Hundreds is mobile-first. Tablet and desktop are secondary but should not break.

| Breakpoint                                   | Behavior                                                                                                                                                                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **< 375px** (small phones)                   | Gonn canvas = full viewport width (square). Habits scroll area is tight but functional. Cards get `12px` horizontal padding instead of `24px`.                                                                                        |
| **375–430px** (standard phones)              | Default layout. Gonn canvas = full viewport width (square). `24px` horizontal padding on habits area.                                                                                                                                 |
| **430–768px** (large phones / small tablets) | Gonn canvas caps at `430px` wide (and tall), centered. Ground surface extends full width. Habits area gets `max-width: 430px`, centered.                                                                                              |
| **> 768px** (tablet / desktop)               | Gonn canvas stays at `430px`, centered. Habits area maxes at `480px`, centered. Sky gradient and ground surface extend full width as ambient background. This is a phone app displayed on a big screen — don't try to fill the space. |

---

## 12. Dark Mode (Deferred — Post-MVP)

Not in scope for Day 100 release. When implemented, invert the surface hierarchy:

| Token            | Light Value | Dark Value |
| ---------------- | ----------- | ---------- |
| `bg-primary`     | `#FEFCF8`   | `#1A1412`  |
| `bg-secondary`   | `#F5F0E8`   | `#2A2220`  |
| `bg-tertiary`    | `#EDE6D8`   | `#3A322E`  |
| `text-primary`   | `#1A1412`   | `#F5F0E8`  |
| `text-secondary` | `#6B5E52`   | `#9C8E80`  |

Gonn's colors remain unchanged in dark mode — the character is always the same.

---

## 13. Do / Don't Quick Reference

| ✅ DO                                                                | ❌ DON'T                                        |
| -------------------------------------------------------------------- | ----------------------------------------------- |
| Let Gonn be the visual anchor, fixed at the bottom                   | Put competing mascots/illustrations in UI       |
| Use `accent-warm` for ONE CTA per screen                             | Use multiple orange buttons on one screen       |
| Keep cards and surfaces in warm neutrals                             | Use pure white or cool grays                    |
| Communicate missed habits through Gonn's mood                        | Show red badges, warning icons, or shame UI     |
| Use Fredoka for display text and Gonn only                           | Use Fredoka for body text or form labels        |
| Animate with purpose and easing                                      | Use linear transitions or animations > 400ms    |
| Respect reduced-motion preferences                                   | Assume everyone wants animation                 |
| Use bottom sheets on mobile                                          | Use centered desktop-style modals               |
| Keep one action per screen                                           | Present multiple competing CTAs                 |
| Use stroke-based rounded icons                                       | Use filled or sharp-cornered icons              |
| Let empty space breathe                                              | Fill every pixel with content                   |
| Stream Gonn's dialogue character by character                        | Show all text instantly (breaks character feel) |
| Render environment (sky + ground) on the Svelte side                 | Put background elements inside the `.riv` file  |
| Let the fire bar use `gonn-red` — it represents feeding              | Use `gonn-red` anywhere else in UI chrome       |
| Keep the Rive canvas full-width on mobile                            | Constrain Gonn to a small thumbnail             |
| Use the speech bubble zone as a visual break between habits and Gonn | Let habit cards overlap or clip behind Gonn     |

---

## 14. Tailwind CSS Configuration

For the AI agent implementing in SvelteKit + Tailwind:

```javascript
// tailwind.config.js
module.exports = {
	theme: {
		extend: {
			colors: {
				// Gonn's palette (character only — plus fire bar gradient)
				gonn: {
					red: '#D03731',
					gold: '#EFD67C',
					dark: '#240302'
				},
				// UI palette
				bg: {
					primary: '#FEFCF8',
					secondary: '#F5F0E8',
					tertiary: '#EDE6D8'
				},
				text: {
					primary: '#1A1412',
					secondary: '#6B5E52',
					tertiary: '#9C8E80'
				},
				accent: {
					warm: '#E8713A',
					'warm-hover': '#D4622E',
					soft: '#F2C78A'
				},
				success: {
					DEFAULT: '#5BA867',
					soft: '#E8F5E9'
				},
				border: {
					light: '#E8E0D4',
					focus: '#E8713A'
				},
				surface: {
					overlay: 'rgba(26, 20, 18, 0.4)'
				},
				// Environment palette
				sky: {
					top: '#D6ECFA',
					bottom: '#FEFCF8'
				},
				ground: {
					surface: '#E8DCC8',
					shadow: '#D6CBAE',
					highlight: '#F2EADC'
				}
			},
			fontFamily: {
				display: ['Fredoka', 'system-ui', 'sans-serif'],
				body: ['"DM Sans"', 'system-ui', 'sans-serif']
			},
			borderRadius: {
				card: '16px',
				button: '16px',
				'button-sm': '12px',
				input: '12px',
				sheet: '24px'
			},
			spacing: {
				// Extends default Tailwind spacing
				// Use default Tailwind values (1=4px, 2=8px, 3=12px, etc.)
			},
			fontSize: {
				'display-lg': ['1.75rem', { lineHeight: '1.2', fontWeight: '600' }],
				'display-md': ['1.375rem', { lineHeight: '1.25', fontWeight: '600' }],
				heading: ['1.125rem', { lineHeight: '1.3', fontWeight: '500' }],
				'body-lg': ['1rem', { lineHeight: '1.5', fontWeight: '400' }],
				body: ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],
				'body-sm': ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
				label: ['0.875rem', { lineHeight: '1.2', fontWeight: '700' }],
				'gonn-speech': ['0.9375rem', { lineHeight: '1.4', fontWeight: '500' }]
			},
			backgroundImage: {
				'fire-gradient': 'linear-gradient(to right, #E8713A, #D03731)',
				'sky-gradient': 'linear-gradient(to bottom, #D6ECFA, #FEFCF8)',
				'ground-gradient':
					'linear-gradient(to bottom, #F2EADC 0%, #E8DCC8 15%, #E8DCC8 75%, #D6CBAE 100%)'
			},
			boxShadow: {
				card: '0 1px 3px rgba(26, 20, 18, 0.06)',
				'card-hover': '0 2px 6px rgba(26, 20, 18, 0.1)',
				button: '0 2px 8px rgba(232, 113, 58, 0.25)',
				'button-hover': '0 4px 12px rgba(232, 113, 58, 0.35)',
				sheet: '0 -4px 20px rgba(26, 20, 18, 0.1)',
				toast: '0 4px 12px rgba(26, 20, 18, 0.15)',
				bubble: '0 2px 8px rgba(36, 3, 2, 0.08)',
				'fire-glow': '0 0 8px rgba(208, 55, 49, 0.3)',
				'horizon-fade': 'inset 0 -20px 20px -10px rgba(232, 220, 200, 0.5)'
			},
			zIndex: {
				ground: '5',
				rive: '10',
				bubble: '15',
				habits: '20',
				'fire-bar': '25',
				'top-bar': '30',
				drawer: '40',
				modal: '50'
			}
		}
	}
};
```

---
