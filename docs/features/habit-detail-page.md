# Feature: Habit Detail Page & Compact Home Cards

## Purpose

Simplify the home page by showing compact habit cards that focus on the essential action (completing the habit), while providing a dedicated detail page for viewing full habit information, statistics, and partial completion options.

## User Story

As a user, I want the home page to show a clean list of habits that I can quickly complete, and I want to tap on a habit to see its full details, completion history, and partial completion option.

---

## Implementation Approach

### Technical Design

#### Feature 1: Customizable Partial Completion Criteria

**Data Model Changes (`src/lib/db/db.ts`):**
```typescript
export interface Habit {
  // ... existing fields ...
  partialCriteria?: string; // User-defined partial completion description
}
```

**HabitForm Changes:**
- Add optional text input field for `partialCriteria`
- Placeholder: "e.g., 20 pushups instead of full gym session"

**Sync & Storage:**
- Add `partial_criteria` to Supabase habits table
- Include in sync queue payload for habit create/update

#### Feature 2: Compact Home Cards + Detail Page

**HabitCardCompact Component:**
- Shows: emoji, name, streak (fire emoji + number), completion button
- Hides: reminder time, progress indicators, partial button, edit button
- Click behavior: card navigates to `/habits/[id]`, button completes habit

**Habit Detail Page (`/habits/[id]/+page.svelte`):**
- Full habit information display
- Completion actions (full + partial with criteria)
- Edit and delete buttons
- Completion history (stretch goal)

### Components Changed

| File | Change |
|------|--------|
| `src/lib/db/db.ts` | Add `partialCriteria` to Habit interface, bump version |
| `src/lib/db/habits.ts` | Include partialCriteria in CRUD operations |
| `src/lib/components/HabitForm.svelte` | Add partialCriteria input field |
| `src/lib/sync/queue.ts` | Add `partialCriteria` to habit payload |
| `src/lib/supabase/types.ts` | Add `partial_criteria` to habits types |
| `src/lib/components/HabitCardCompact.svelte` | NEW: Compact card for home page |
| `src/routes/+page.svelte` | Use HabitCardCompact |
| `src/routes/habits/[id]/+page.svelte` | NEW: Habit detail page |
| `supabase/migrations/` | Add partial_criteria column |

### UI/UX Design

#### HabitCardCompact (Home Page)
```
┌─────────────────────────────────────────────────┐
│ 🏃  Morning Run            🔥 5    [  ✓  ]     │
└─────────────────────────────────────────────────┘
   │                          │        └── Completion button (stops propagation)
   └── Tap anywhere else → navigate to /habits/[id]
```

#### Habit Detail Page
```
┌─────────────────────────────────────────────────┐
│ ← Back                                    [Edit]│
├─────────────────────────────────────────────────┤
│           🏃                                    │
│     Morning Run                                 │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ 🔥 Current Streak: 5 days               │   │
│  │ 📊 Total Completions: 42                │   │
│  │ ⏰ Reminder: 7:00 AM                    │   │
│  │ 📅 Frequency: Every day                 │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │ Partial Completion                       │   │
│  │ "20 pushups or 15-minute run"           │   │
│  │ [Mark as Partial]                       │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
│  [═══════ Mark as Complete ═══════]            │
│                                                 │
│  [Delete Habit]                                 │
└─────────────────────────────────────────────────┘
```

---

## Acceptance Criteria

### Partial Completion Criteria
- [ ] User can define partial completion criteria when creating/editing a habit
- [ ] Partial criteria displays on habit detail page
- [ ] Partial criteria syncs correctly to Supabase

### Compact Home Cards
- [ ] Home page shows simplified habit cards
- [ ] Cards display: emoji, name, streak, completion button
- [ ] Tapping completion button marks habit complete
- [ ] Tapping elsewhere navigates to habit detail page
- [ ] Completion button click doesn't trigger navigation

### Habit Detail Page
- [ ] Shows all habit information (name, emoji, color, reminder, frequency)
- [ ] Shows current streak and total completions
- [ ] Shows partial completion criteria if defined
- [ ] Full completion button works
- [ ] Partial completion button works (with criteria displayed)
- [ ] Edit button links to edit page
- [ ] Delete button removes habit with confirmation
- [ ] Back navigation returns to home page

---

## Performance Considerations

- Compact cards reduce DOM complexity on home page
- Detail page loads habit data from store (already cached)
- No additional network requests needed

---

## Migration Strategy

1. Add `partial_criteria` column to Supabase (nullable, no default needed)
2. Bump Dexie schema version with upgrade handler (set to undefined)
3. Existing habits have no partial criteria (optional field)

