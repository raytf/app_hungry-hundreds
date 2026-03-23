# Hungry Hundreds: Rule Engine Specification

**Last Updated:** March 2026  
**Status:** Architecture locked for MVP build

This document is the single source of truth for how Gonn (the AI kaiju companion) responds to user habit data. It covers: data model, satiation/evolution, regression, multi-habit aggregation, danger zones, mood engine, celebrations, and food metaphor.

For design rationale and alternatives considered, see `DECISION-LOG.md`.

---

## Table of Contents

1. [Data Model](#1-data-model)
2. [Satiation & Evolution](#2-satiation--evolution)
3. [Multi-Habit Aggregation](#3-multi-habit-aggregation)
4. [Danger Zones](#4-danger-zones)
5. [Mood Engine](#5-mood-engine)
6. [Celebrations](#6-celebrations)
7. [Regression](#7-regression)
8. [Food Metaphor](#8-food-metaphor)
9. [Edge Cases](#9-edge-cases)

---

## 1. Data Model

### 1.1 Habit Schedule

Stored on each habit. Defines expected frequency. Weekly habits are flexible — "3x/week" means any 3 days, no fixed day assignments.

```typescript
interface HabitSchedule {
  type: 'daily' | 'weekly' | 'every-x-days';
  timesPerWeek?: number;   // 1–7, for 'weekly'
  intervalDays?: number;   // 2–30, for 'every-x-days'
}
```

### 1.2 Window Status

Evaluated per habit on every relevant event. Describes whether the current evaluation window has been met.

```typescript
interface WindowStatus {
  windowMet: boolean;           // target reached for current window
  completionsInWindow: number;  // done so far this window
  targetForWindow: number;      // needed (1 for daily, N for weekly)
  windowProgress: number;       // 0–1
  windowDeadline: string;       // ISO date when window closes
  daysRemaining: number;        // days left in current window
  isScheduledToday: boolean;    // should the user act today?
}
```

**isScheduledToday logic:**

| Type | `true` when | `false` when |
|------|-------------|--------------|
| Daily | Always | Never |
| Weekly (3x) | Target not yet met this week | Already hit 3 this week |
| Every 5 days | Last completion was 4+ days ago | Completed within last 3 days |

When `isScheduledToday` is false, the habit is in "off-day" state: no urgency contribution, counts as "met" for mood.

### 1.3 Window Evaluation

```typescript
function evaluateWindow(habit: Habit, logs: HabitLog[]): WindowStatus {
  switch (habit.schedule.type) {
    case 'daily':
      return {
        windowMet: hasCompletionToday(logs),
        completionsInWindow: hasCompletionToday(logs) ? 1 : 0,
        targetForWindow: 1,
        windowProgress: hasCompletionToday(logs) ? 1 : 0,
        windowDeadline: endOfToday(),
        daysRemaining: 0,
        isScheduledToday: true,
      };

    case 'weekly':
      const weekLogs = logsThisWeek(logs);
      const target = habit.schedule.timesPerWeek;
      const remaining = daysLeftInWeek();
      const needed = target - weekLogs.length;
      return {
        windowMet: weekLogs.length >= target,
        completionsInWindow: weekLogs.length,
        targetForWindow: target,
        windowProgress: Math.min(1, weekLogs.length / target),
        windowDeadline: endOfWeek(),
        daysRemaining: remaining,
        isScheduledToday: needed > 0,
      };

    case 'every-x-days':
      const interval = habit.schedule.intervalDays;
      const lastLog = mostRecentLog(logs);
      const daysSince = lastLog ? daysBetween(lastLog.date, today()) : interval;
      return {
        windowMet: daysSince < interval,
        completionsInWindow: daysSince < interval ? 1 : 0,
        targetForWindow: 1,
        windowProgress: daysSince < interval ? 1 : 0,
        windowDeadline: lastLog ? addDays(lastLog.date, interval) : today(),
        daysRemaining: Math.max(0, interval - daysSince),
        isScheduledToday: daysSince >= interval - 1,
      };
  }
}
```

### 1.4 Habit Snapshot

Emitted per habit on every relevant event (habit logged, day changed, streak broken, app opened).

```typescript
interface HabitSnapshot {
  habitId: string;
  habitName: string;
  flavorTag: string;              // 'brain-food' | 'protein' | 'dessert' | 'soul-food' | 'vitamins' | 'mystery-meal'
  schedule: HabitSchedule;

  // Streak: consecutive evaluation windows met
  streakLength: number;
  streakHealth: 'strong' | 'steady' | 'fragile' | 'broken';

  // Completion tracking
  completionCount: number;        // total completions ever (never resets)
  hitCompletion100: boolean;      // just reached 100 completions

  // Window status
  window: WindowStatus;
  completedToday: boolean;

  // Danger zone (mapped to completionCount)
  dangerZone: boolean;
  dangerZoneLabel?: string;

  missedWindows: number;
  lastCompletionTime: string;
}
```

### 1.5 Gonn State

Persistent mascot state. Stored in Dexie (`gonnState` table), synced to Supabase. Updated on every habit completion, every app open, and at midnight rollover.

```typescript
interface GonnState {
  satiation: number;              // 0–100, drives evolution stage
  evolutionStage: number;         // 1–5, derived from satiation + hysteresis
  peakStage: number;              // highest stage ever reached (for LLM memory)

  lastFedAt: string;              // ISO timestamp of last completion (any habit)
  daysSinceLastFed: number;       // calendar days with zero completions across all habits
  expectedDailyFeeds: number;     // calibrated from habit schedules

  totalCompletions: number;       // lifetime total across all habits, never resets
}
```

**Key separation:** `satiation` fluctuates and drives evolution. `totalCompletions` only grows and drives Day 100 Feast per habit. They are independent.

### 1.6 Global Snapshot

Aggregated from all per-habit snapshots. This is what the mood engine operates on.

```typescript
interface GlobalSnapshot {
  habits: HabitSnapshot[];
  gonn: GonnState;

  totalHabits: number;
  scheduledTodayCount: number;
  completedTodayCount: number;     // scheduled AND done + off-day habits
  allCompletedToday: boolean;

  anyInDangerZone: boolean;        // scheduled habits only
  anyBroken: boolean;

  pendingEvolution: boolean;
  pendingRegression: boolean;
  pendingFeast: HabitSnapshot[];
}
```

### 1.7 Mascot State

Output of the rule engine. Drives Rive animation inputs. Produced instantly (no LLM).

```typescript
interface MascotState {
  primaryEmotion: 'idle' | 'happy' | 'excited' | 'tired' | 'sad' | 'sleeping' | 'eating' | 'celebrating';
  emotionIntensity: number;       // 0–100
  lookX: number;                  // 0–100 (joystick)
  lookY: number;                  // 0–100 (joystick)
  evolutionStage: number;         // 1–5
  trigger?: 'levelUp' | 'regress' | 'celebrate100' | 'streakSave' | 'nudge';
  context: MascotContext;
}

interface MascotContext {
  type: 'ambient' | 'feast' | 'evolution' | 'regression';
  urgentHabit?: HabitSnapshot;
  completionRatio?: number;
  feastHabit?: HabitSnapshot;
  regressionFrom?: number;
  regressionTo?: number;
}
```

### 1.8 LLM Dialogue Request

Sent async to the LLM after the rule engine produces MascotState. The LLM generates dialogue only — it does not drive animation.

```typescript
interface DialogueRequest {
  mascotState: MascotState;
  gonn: GonnState;

  habits: Array<{
    name: string;
    flavorTag: string;
    schedule: HabitSchedule;
    completionCount: number;
    streakLength: number;
    window: {
      isScheduledToday: boolean;
      completionsInWindow: number;
      targetForWindow: number;
      daysRemaining: number;
      urgency: number;
    };
    dangerZone: boolean;
    dangerZoneLabel?: string;
  }>;

  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  eventType: 'habit-complete' | 'app-open' | 'tap' | 'lapse-return' | 'feast' | 'evolution' | 'regression';
  completedHabitName?: string;

  permanentMemory: MemoryEntry[];
  shortTermMemory: MemoryEntry[];
}
```

---

## 2. Satiation & Evolution

### 2.1 Core Concept

Gonn has a satiation level (0–100) representing "body mass." Completions add satiation (feeding). Without feeding, satiation decays (starvation). Gonn's evolution stage is derived from current satiation. **Gonn can regress all the way to Egg.**

### 2.2 Feeding

Each habit completion adds an equal fraction of a "full day's feeding":

```typescript
function feedAmount(totalActiveHabits: number): number {
  return 1.0 / totalActiveHabits;
}
// 4 habits, all completed today = +1.0 satiation
// 4 habits, 2 completed today = +0.5 satiation
```

Over ~100 days of full completion across all habits, satiation climbs from 0 to ~100.

Non-daily habits contribute the same per completion but complete less often. Decay is calibrated to expected frequency (see 2.3).

### 2.3 Decay

Satiation decays when Gonn isn't fed. Slow at first, accelerating exponentially.

**Expected daily feeds** (calibrates decay rate to user's habit schedule):

```typescript
function expectedDailyFeeds(habits: Habit[]): number {
  return habits.reduce((sum, h) => {
    switch (h.schedule.type) {
      case 'daily': return sum + 1;
      case 'weekly': return sum + (h.schedule.timesPerWeek / 7);
      case 'every-x-days': return sum + (1 / h.schedule.intervalDays);
    }
  }, 0);
}
```

**The exponential decay formula:**

```typescript
function decayAmount(
  daysSinceLastFed: number,
  expectedDailyFeeds: number,
  totalActiveHabits: number
): number {
  if (daysSinceLastFed <= 1) return 0;  // 1-day grace period

  const starveDays = daysSinceLastFed - 1;
  const baseDailyDecay = expectedDailyFeeds / totalActiveHabits;
  const acceleration = Math.pow(1.08, starveDays);

  return baseDailyDecay * acceleration;
}
```

**Decay timeline** (4 daily habits, Apex Gonn at satiation 85, total abandonment):

| Days Without Feeding | Daily Decay | Cumulative | Satiation | Stage |
|-----|-----|-----|-----|-----|
| Day 1 | 0 (grace) | 0 | 85 | Apex |
| Day 7 | ~1.6 | ~8.4 | ~76.6 | Adult |
| Day 14 | ~2.7 | ~22.9 | ~62.1 | Adult |
| Day 21 | ~4.6 | ~47.3 | ~37.7 | Juvenile |
| Day 30 | ~9.3 | ~94.2 | ~0 | Egg |

**Critical safety valve:** Any completion on any habit resets `daysSinceLastFed` to 0, killing the exponential acceleration. The starvation spiral only triggers during consecutive days of zero activity across ALL habits.

**When decay is calculated:** On app open (apply accumulated decay) and midnight rollover (if app is open). Never in real-time while the user watches.

### 2.4 Evolution Stage Thresholds (with Hysteresis)

Separate entry and exit boundaries prevent flickering:

| Stage | Enter At (Growing) | Exit At (Shrinking) | Buffer |
|-------|-------------------|--------------------|----|
| 1 — Egg | — (default) | — (floor) | — |
| 2 — Hatchling | satiation ≥ 10 | satiation < 6 | 6–10 |
| 3 — Juvenile | satiation ≥ 25 | satiation < 18 | 18–25 |
| 4 — Adult | satiation ≥ 50 | satiation < 40 | 40–50 |
| 5 — Apex | satiation ≥ 80 | satiation < 70 | 70–80 |

```typescript
function deriveEvolutionStage(satiation: number, currentStage: number): number {
  // Growth
  if (satiation >= 80 && currentStage < 5) return 5;
  if (satiation >= 50 && currentStage < 4) return 4;
  if (satiation >= 25 && currentStage < 3) return 3;
  if (satiation >= 10 && currentStage < 2) return 2;

  // Regression
  if (currentStage === 5 && satiation < 70) return 4;
  if (currentStage === 4 && satiation < 40) return 3;
  if (currentStage === 3 && satiation < 18) return 2;
  if (currentStage === 2 && satiation < 6) return 1;

  return currentStage;
}
```

### 2.5 Full Satiation Update Flow

```typescript
function updateSatiation(
  current: GonnState,
  event: 'app-open' | 'habit-complete' | 'midnight',
  habits: Habit[]
): GonnState {
  let { satiation, evolutionStage, peakStage, lastFedAt, totalCompletions } = current;
  const daysSince = daysBetween(lastFedAt, now());
  const expected = expectedDailyFeeds(habits);
  const totalActive = habits.length;

  // Step 1: Apply accumulated decay
  if (event === 'app-open' || event === 'midnight') {
    for (let d = 1; d <= daysSince; d++) {
      satiation -= decayAmount(d, expected, totalActive);
    }
    satiation = Math.max(0, satiation);
  }

  // Step 2: Apply feeding
  if (event === 'habit-complete') {
    satiation = Math.min(100, satiation + feedAmount(totalActive));
    lastFedAt = now();
    totalCompletions += 1;
  }

  // Step 3: Derive stage with hysteresis
  const newStage = deriveEvolutionStage(satiation, evolutionStage);
  const grew = newStage > evolutionStage;
  const regressed = newStage < evolutionStage;

  evolutionStage = newStage;
  peakStage = Math.max(peakStage, evolutionStage);

  // Step 4: Trigger events
  if (grew) triggerEvolutionCutscene(evolutionStage);
  if (regressed) triggerRegressionCutscene(evolutionStage);

  return { satiation, evolutionStage, peakStage, lastFedAt,
    daysSinceLastFed: daysSince, expectedDailyFeeds: expected, totalCompletions };
}
```

### 2.6 Re-evolution After Regression

Same rate as first time. No shortcut. Growth is always earned. `totalCompletions` is preserved — the Day 100 journey continues. `peakStage` is preserved — the LLM can say "I remember being big."

---

## 3. Multi-Habit Aggregation

### 3.1 One Gonn, Multiple Habits

Users track 3–5 habits. Each has its own streak, schedule, completion count, and danger zone. Gonn is account-level and reflects aggregate state.

### 3.2 Building the Global Snapshot

```typescript
function buildGlobalSnapshot(habits: HabitSnapshot[], gonn: GonnState): GlobalSnapshot {
  const scheduledToday = habits.filter(h => h.window.isScheduledToday);
  const offToday = habits.filter(h => !h.window.isScheduledToday);

  // Off-day habits count as "met" for mood
  const completedCount =
    scheduledToday.filter(h => h.completedToday).length + offToday.length;

  return {
    habits, gonn,
    totalHabits: habits.length,
    scheduledTodayCount: scheduledToday.length,
    completedTodayCount: completedCount,
    allCompletedToday: completedCount === habits.length,
    anyInDangerZone: scheduledToday.some(h => h.dangerZone),
    anyBroken: habits.some(h => h.streakHealth === 'broken'),
    pendingEvolution: /* set by satiation update */,
    pendingRegression: /* set by satiation update */,
    pendingFeast: habits.filter(h => h.hitCompletion100),
  };
}
```

### 3.3 Streak Model

Streaks count **consecutive evaluation windows met**, not calendar days.

| Type | Window | Breaks When | Grace Mechanism |
|------|--------|------------|-----------------|
| Daily | 1 calendar day | Midnight, no completion | Streak freeze (1–2/month) |
| Weekly (3x) | Mon–Sun week | Sunday midnight, < target | None needed — week IS grace |
| Every 5 days | Rolling interval | Interval elapses, no completion | Streak freeze |

**"Never Miss Twice" adapts to frequency:** Daily = 2 days. Weekly = 2 weeks. Every-X = 2 intervals.

### 3.4 Weekly Urgency Ramp

```typescript
function weeklyUrgency(window: WindowStatus): number {
  if (window.windowMet) return 0;
  const needed = window.targetForWindow - window.completionsInWindow;
  const remaining = window.daysRemaining;
  if (remaining <= 0 || needed > remaining) return 1;
  return needed / remaining;
}
```

| Urgency | Scenario | Gonn Behavior |
|---------|----------|---------------|
| 0.0 | Target met for the week | Content idle. References rest positively. |
| 0.1–0.3 | Monday, 0/3 done | Normal idle. Softly mentions the habit. |
| 0.6–0.8 | Friday, 1/3 done | Noticeably concerned. Tired posture creeps in. |
| 0.8–1.0 | Saturday, 1/3 done | Full urgency. Equivalent to pending daily habit. |

### 3.5 Off-Day Behavior

When `isScheduledToday` is false:
- No urgency contribution
- Counts as "met" for `allCompletedToday`
- Gonn can reference rest positively: "No workout today. Three this week was the goal. Rest is protein too."
- Bonus completions count toward `totalCompletions` and feed Gonn: "Extra protein! I didn't even ask."
- If ALL habits are off-day, Gonn is content: "All fed up for the week. Just vibing."

---

## 4. Danger Zones

### 4.1 Definitions (Mapped to Completion Count)

"Day 100" = 100 completions, so danger zones map to completions, not calendar days:

| Completions | Label | Why It's Hard |
|------------|-------|---------------|
| 4–10 | `first-week cliff` | Novelty fades. Not yet routine. |
| 18–24 | `motivation plateau` | Excitement gone. All-or-nothing thinking. |
| 35–45 | `mid-term crisis` | Motivation desert. Not yet automatic. |
| 55–65 | `automaticity gap` | External motivation insufficient. |

```typescript
function isInDangerZone(completionCount: number): { inZone: boolean; label?: string } {
  const zones = [
    { min: 4, max: 10, label: 'first-week cliff' },
    { min: 18, max: 24, label: 'motivation plateau' },
    { min: 35, max: 45, label: 'mid-term crisis' },
    { min: 55, max: 65, label: 'automaticity gap' },
  ];
  const zone = zones.find(z => completionCount >= z.min && completionCount <= z.max);
  return zone ? { inZone: true, label: zone.label } : { inZone: false };
}
```

### 4.2 Visibility

**Invisible in UI.** No badges, no warning colors. Danger zones influence:
1. Gonn's mood/intensity (emotionIntensity increases when scheduled habit is in zone)
2. LLM dialogue ("Day 22. This is the plateau. Most people blink here.")
3. Notification content (more targeted during danger windows)

### 4.3 Multi-Habit Priority

```typescript
function dangerZonePriority(snapshot: HabitSnapshot): number {
  if (!snapshot.dangerZone) return 0;
  if (!snapshot.completedToday && !snapshot.window.windowMet) return 3;
  if (snapshot.streakHealth === 'fragile') return 2;
  return 1;
}
```

Highest-priority habit becomes `urgentHabit` in MascotContext. LLM receives ALL danger zone data for cross-habit encouragement.

---

## 5. Mood Engine

### 5.1 Mood Calculation

```typescript
function deriveMood(global: GlobalSnapshot): PrimaryEmotion {
  if (global.allCompletedToday) return 'happy';
  if (global.completedTodayCount > 0 && !global.anyBroken) {
    return global.anyInDangerZone ? 'idle' : 'happy';
  }
  if (global.completedTodayCount === 0) {
    return global.anyInDangerZone ? 'tired' : 'idle';
  }
  if (global.anyBroken) return 'tired';
  return 'idle';
}
```

### 5.2 Intensity Modulation

```typescript
function deriveIntensity(global: GlobalSnapshot): number {
  const scheduledToday = global.habits.filter(h => h.window.isScheduledToday);
  const scheduledCompleted = scheduledToday.filter(h => h.completedToday).length;
  const completionRatio = scheduledToday.length > 0
    ? scheduledCompleted / scheduledToday.length : 1;

  const dangerCount = scheduledToday.filter(h => h.dangerZone).length;
  const brokenCount = global.habits.filter(h => h.streakHealth === 'broken').length;

  let base = completionRatio * 80;
  base -= dangerCount * 10;
  base -= brokenCount * 20;
  return Math.max(10, Math.min(100, base));
}
```

### 5.3 Look Direction

```typescript
function deriveLookDirection(global: GlobalSnapshot): { lookX: number; lookY: number } {
  let lookX = 50, lookY = 50;

  if (global.anyInDangerZone && !global.allCompletedToday) {
    lookY = 60; lookX = 35 + Math.random() * 10;
  }
  if (global.anyBroken) { lookY = 65; }
  if (global.allCompletedToday) { lookX = 50; lookY = 45; }

  return { lookX, lookY };
}
```

### 5.4 The Complete deriveMascotState()

```typescript
function deriveMascotState(global: GlobalSnapshot): MascotState {
  // Priority 1: Celebrations/regression
  if (global.pendingFeast.length > 0) {
    return {
      primaryEmotion: 'celebrating', emotionIntensity: 100,
      lookX: 50, lookY: 50, evolutionStage: global.gonn.evolutionStage,
      trigger: 'celebrate100',
      context: { type: 'feast', feastHabit: global.pendingFeast[0] },
    };
  }
  if (global.pendingEvolution) {
    return {
      primaryEmotion: 'celebrating', emotionIntensity: 100,
      lookX: 50, lookY: 50, evolutionStage: global.gonn.evolutionStage,
      trigger: 'levelUp', context: { type: 'evolution' },
    };
  }
  if (global.pendingRegression) {
    return {
      primaryEmotion: 'tired', emotionIntensity: 30,
      lookX: 50, lookY: 60, evolutionStage: global.gonn.evolutionStage,
      trigger: 'regress',
      context: { type: 'regression', regressionFrom: /*prev*/, regressionTo: global.gonn.evolutionStage },
    };
  }

  // Priority 2: Ambient mood
  const mood = deriveMood(global);
  const intensity = deriveIntensity(global);
  const { lookX, lookY } = deriveLookDirection(global);

  const urgent = global.habits
    .filter(h => h.window.isScheduledToday)
    .sort((a, b) => dangerZonePriority(b) - dangerZonePriority(a))[0];

  return {
    primaryEmotion: mood, emotionIntensity: intensity,
    lookX, lookY, evolutionStage: global.gonn.evolutionStage,
    context: {
      type: 'ambient',
      urgentHabit: urgent?.dangerZone ? urgent : undefined,
      completionRatio: global.scheduledTodayCount > 0
        ? global.completedTodayCount / global.totalHabits : 1,
    },
  };
}
```

### 5.5 Event Sequences

**User completes a habit:**
1. Habit store updates streak
2. `updateSatiation(gonn, 'habit-complete', habits)`
3. All per-habit snapshots recompute
4. `buildGlobalSnapshot()` — checks for pending evolution/feast
5. `deriveMascotState(global)` — **instant**
6. Rive Bridge updates inputs immediately
7. Async: LLM fires with full DialogueRequest
8. Speech bubble appears 1–2s later

**User opens app:**
1. `updateSatiation(gonn, 'app-open', habits)` — applies decay
2. Snapshots compute, GlobalSnapshot aggregates
3. If regression occurred: regression cutscene plays
4. Ambient mood renders
5. Async: LLM generates greeting

---

## 6. Celebrations

### 6.1 Two Separate Event Types

**Evolution Events (satiation-driven):**
- Trigger: satiation crosses growth threshold
- Frequency: up to 4 growth events; can happen again after regression
- Animation: full cutscene (~1s) — glow, flash, Solo swap, body transformation
- About: Gonn's overall growth

**Day 100 Feast Events (per-habit, completion-driven):**
- Trigger: a specific habit's `completionCount` reaches 100
- Frequency: once per habit (up to 5 for 5 habits)
- Animation: special feast — Gonn "eats" themed meal, celebration FX
- About: mastery of a specific habit
- Can fire at any Gonn stage (honors commitment, not current size)

### 6.2 When Both Fire Simultaneously

Sequence: habit completion → **Day 100 Feast** → **Evolution cutscene**

Feast first (specific, personal), evolution follows ("and look what that did to me"). LLM ties them together: "100 days of running. And it made me THIS."

### 6.3 Feast Dialogue Examples

| Habit Flavor | Gonn Says |
|-------------|-----------|
| brain-food | "100 servings of brain food. That's not a streak — that's who you are." |
| protein | "100 protein meals. I'm built different now. Because YOU built different." |
| Any | "100. You fed me this meal a hundred times. Most people never get here." |

---

## 7. Regression

### 7.1 Framing: Biology, Not Punishment

- No guilt language. Never "you let me down."
- Biology framing: "This is what my body does."
- Immediate pivot to hope.
- No punitive animations.

### 7.2 Regression Animation (~1.5s)

Slower and gentler than evolution. No flash or particles.

| Time | Action |
|------|--------|
| 0.00–0.50s | Slow scale-down. Colors slightly desaturate. |
| 0.50s | Solo swap to smaller stage |
| 0.50–1.00s | Smaller form settles with slight droop |
| 1.00–1.50s | Gonn looks up at user. Eyes adjust last. Blink. |

### 7.3 Regression Dialogue

| Transition | Gonn Says |
|-----------|-----------|
| Apex → Adult | "I'm a little smaller. That's what happens. Still here though. Still hungry." |
| Adult → Juvenile | "Body's shrinking. It needs fuel. You know what to do." |
| Juvenile → Hatchling | "I'm getting really small again. Remember how we fixed this last time? One meal." |
| Hatchling → Egg | "I'm back in the egg. But I remember being big. Feed me and I'll show you I remember." |
| General | "This is just what my body does. Not your fault. Kaiju biology. But I'd love to eat." |

**peakStage dialogue** (when gap between peak and current is large):
- "I used to be huge. You made me huge. We can do it again."
- "I remember teeth. Horns. A tail that could knock things over. Feed me and those come back."

### 7.4 Multi-Stage Regression

If Gonn dropped multiple stages between sessions, play ONE regression cutscene for the full drop, not separate ones per stage.

### 7.5 Regression + Lapse Recovery

1. Regression cutscene plays first
2. Lapse recovery dialogue fires
3. Gonn combines both: "I got smaller. And you missed some days. Both are just facts. What matters: you came back."

---

## 8. Food Metaphor

### 8.1 Flavor Tags

Assigned during habit creation. Stored as a string on the habit, passed to LLM.

| Category | Tag | Gonn's Metaphor |
|----------|-----|-----------------|
| Meditation / Mindfulness | `brain-food` | "Brain food. My neurons are dancing." |
| Exercise / Fitness | `protein` | "Pure protein. Feel these arms getting bigger." |
| Reading / Learning | `dessert` | "Dessert for the mind. Sweet knowledge." |
| Journaling / Writing | `soul-food` | "Soul food. Feeds the parts you can't see." |
| Health / Hydration | `vitamins` | "Vitamins. The boring stuff that actually matters." |
| Custom / Other | `mystery-meal` | "Mystery meal. My favorite kind." |

The rule engine passes flavor tags through unchanged — they're purely a dialogue concern.

---

## 9. Edge Cases

| Scenario | Behavior |
|----------|----------|
| **User adds habit mid-journey** | Feed rate per completion drops (1/N). Satiation growth slows temporarily. Gonn: "A new challenge? I'm hungrier already." |
| **User removes a habit** | Feed rate increases. Expected daily feeds recalculates. Feast badges persist. |
| **All habits broken simultaneously** | Satiation decays. Gonn at current stage but deeply tired. "I'm still here. When you're ready, I'm ready." |
| **Multiple habits hit completion 100 same day** | Each gets its own feast, queued sequentially. |
| **Streak goes past 100 completions** | Completions still feed Gonn normally. Feast fires only once per habit. |
| **Weekly habit created mid-week** | First week target pro-rated: `ceil(target * daysRemaining / 7)` |
| **Every-X-days completed early** | Counts normally. Window resets from today. "Early feed! My kind of impatience." |
| **User changes habit frequency** | completionCount preserved. Streak resets (different window type). Satiation unchanged. |
| **All habits off-day** | Gonn fully content. "All fed up for the week. Just vibing." |
| **App open at 3 AM** | Gonn in sleeping state. Decay calculated normally. |