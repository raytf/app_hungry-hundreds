# Feature: Onboarding Flow (Redesign)

## Purpose

Replace the legacy wizard (welcome → monster naming → full HabitForm) with a conversational,
one-question-per-screen flow that gets a user's first habit created in under 60 seconds with
no account required.

## User Story

As a first-time visitor, I want to understand what the app is about and set up my first habit
through a friendly, low-friction conversation so that I start building a habit immediately —
without having to sign up or fill out a form.

---

## Implementation Approach

### First-Run Detection

**Key:** `localStorage['hh:onboarded']` (value `'1'` when onboarding has been completed or explicitly skipped).

**Trigger logic** (in `src/routes/+layout.svelte` → `onMount`):

- `browser` must be `true`
- `localStorage['hh:onboarded']` is not set, AND
- `db.habits.count() === 0`
- If both conditions met → `goto(resolve('/onboard'), { replaceState: true })`

`replaceState: true` prevents the back button from returning to the onboarding route.

**Reset replay:** `handleReset()` in `src/routes/settings/+page.svelte` must also:

1. Clear `localStorage['hh:onboarded']`
2. Navigate to `/onboard` (replace state)

**Sign-up redirect fix:** `src/routes/auth/signup/+page.svelte` currently redirects to `/onboard`
on success. Change to `/` so a returning authed user lands on Home; the first-run check will
redirect to `/onboard` if they have zero habits.

### Technical Design

**Components / files changed or created:**

| File                                  | Action               | Notes                                          |
| ------------------------------------- | -------------------- | ---------------------------------------------- |
| `src/routes/onboard/+page.svelte`     | **Replace entirely** | New 7-screen conversational flow               |
| `src/routes/+layout.svelte`           | **Edit**             | Add first-run detection in `onMount`           |
| `src/routes/settings/+page.svelte`    | **Edit**             | `handleReset` clears flag + replays onboarding |
| `src/routes/auth/signup/+page.svelte` | **Edit**             | Redirect to `/` not `/onboard` on success      |
| `src/lib/stores/toast.svelte.ts`      | **Edit**             | Add optional action button support for CTA     |
| `src/lib/components/Toast.svelte`     | **Edit**             | Render optional toast action button            |

No new stores or composables — all draft state lives in the single `+page.svelte` using Svelte 5 `$state`.

**Draft habit shape (in-memory until Screen 7):**

```ts
interface OnboardingDraft {
	name: string;
	emoji: string;
	color: string;
	reminderTime: string | null; // HH:MM or null
	schedule: HabitSchedule;
}
```

Defaults: `emoji = '📌'`, `color = habitColors[0]`, `schedule = { type: 'daily' }`.
When a suggestion pill is tapped, its `emoji`, `color`, and `reminderTime` override the defaults.

**Commit point:** Only on Screen 7 (Reveal / Home transition):

1. `habits.add(draft)` → creates habit in Dexie
2. `localStorage['hh:onboarded'] = '1'`
3. `goto(resolve('/'), { replaceState: true })`

### Screen Flow

```
Screen 1  Egg          →  Screen 2  Identity (framing)
Screen 2  Identity     →  Screen 3  Habit Selection
Screen 3  Habit        →  Screen 4  When? (reminder time)
Screen 4  When?        →  Screen 5  Frequency
Screen 5  Frequency    →  Screen 6  Notifications (skip if no reminderTime)
Screen 6  Notify       →  Screen 7  Reveal → /
Screen 7              Commit to Dexie + set flag + goto('/')
```

### Screen-by-Screen Spec

**Screen 1 — The Egg**

- Gonn dialogue: _"I'm hungry. Are you?"_
- CTA pill: `Feed me a habit →`
- No skip, no data.

**Screen 2 — Identity Framing**

- Gonn dialogue: _"Who do you want to become?"_
- 4 pills: 🏃 Healthier · 🧠 Sharper · 🧘 Calmer · ✨ More disciplined
- Gonn replies for ~1.2 s after selection (e.g. "Calm tastes good."), then auto-advances.
- Skip link below pills. **Nothing persisted.**

**Screen 3 — Habit Selection**

- Gonn dialogue: _"What do you want to get hungry for?"_
- Autofocus text input. Enter or `Continue →` pill (disabled until ≥ 2 chars).
- As user types: up to 4 suggestion pills from `suggestedHabits.ts` (substring match on `name`).
- When empty: show 4 default suggestion pills.
- Tapping a pill **fills the input** (doesn't auto-submit) so user can edit.
- On Continue: if name exactly matches a suggestion, inherit its `emoji`, `color`, `reminderTime`.

**Screen 4 — When?**

- Gonn dialogue: _"When do you usually have time?"_
- 4 pills: 🌅 Morning (08:00) · 🍱 Lunch (12:30) · 🌆 Evening (19:00) · 🌙 Before bed (22:00)
- If a suggestion was selected and had a `reminderTime`, pre-select the nearest pill.
- `Pick a specific time` link → expands inline `<input type="time">` on same screen (no sheet).
- Skip link: `Skip — I don't want a reminder`

**Screen 5 — Frequency**

- Gonn dialogue: _"How often?"_
- 3 pills (pre-selects "Every day"):
  - `Every day` → `schedule: { type: 'daily' }`
  - `A few times a week` → reveals sub-pills 3× / 4× / 5× / 6× → `{ type: 'weekly', timesPerWeek }`
  - `Every few days` → reveals sub-pills 2 / 3 / 5 / 7 days → `{ type: 'every-x-days', intervalDays }`
- `Continue →` pill.

**Screen 6 — Notifications** _(skipped entirely if `reminderTime` is null)_

- Gonn dialogue: _"Want me to remind you?"_
- Two pills: `Yes, remind me` / `Not now`
- `Yes` → calls `pushStore.requestPermission()` then advances.
- `Not now` → advances without prompting.

**Screen 7 — Reveal**

- Commits draft to Dexie, sets localStorage flag, navigates to `/` (replaceState).
- The Home page's normal empty-state-to-habit-card transition acts as the reveal moment.
- `triggerGonnDialogue('app-open')` fires on the Home page as normal.

### Soft Sign-Up Prompt

After the first habit is created (i.e., after `habits.add()` succeeds), if `!$isAuthenticated`:

- Show a dismissable toast via existing `showToast()`: _"Save your progress → Create account"_
- Toast action button → `goto(resolve('/auth/signup'))`.
- No additional screen; does not block the habit reveal.

### Notifications — no browser prompt on screen 6 until user taps "Yes"

`pushStore.requestPermission()` triggers the OS prompt. We call it only on explicit user tap.

---

## Integration Points

- **`src/lib/data/suggestedHabits.ts`** — habit autocomplete source (existing, unchanged).
- **`src/lib/stores/habits.ts`** — `habits.add()` for final commit.
- **`src/lib/notifications`** — `pushStore.requestPermission()` on Screen 6.
- **`src/lib/stores/toast.svelte`** — `showToast()` for soft sign-up prompt.
- **`src/lib/data/mockData.ts`** — `habitColors`, `habitEmojis` for defaults.

---

## Acceptance Criteria

- [ ] First-time visitor (no flag, zero habits) is redirected to `/onboard` automatically.
- [ ] Existing user with habits is **not** redirected to `/onboard`.
- [ ] All 7 screens render with correct Gonn dialogue.
- [ ] Tapping a suggestion pill fills the text input (does not auto-submit).
- [ ] Freeform habit name without a matching suggestion uses `📌` and `habitColors[0]`.
- [ ] Matching suggestion inherits emoji, color, and pre-selects the nearest "When?" pill.
- [ ] "Pick a specific time" expands inline on Screen 4 (no bottom sheet).
- [ ] Screen 6 is skipped when `reminderTime` is null.
- [ ] Notification permission prompt fires only after user taps "Yes" on Screen 6.
- [ ] Habit is committed to Dexie only on Screen 7.
- [ ] `localStorage['hh:onboarded']` is set on Screen 7 commit.
- [ ] Back button cannot return to `/onboard` after completion.
- [ ] "Reset All Data" in Settings clears the flag and replays onboarding.
- [ ] Sign-up success redirects to `/` not `/onboard`.
- [ ] Soft sign-up toast appears for unauthenticated users after habit creation.
- [ ] Identity framing screen is purely motivational — nothing is persisted from it.
