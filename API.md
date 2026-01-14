# API Documentation

## Overview

This document describes the data models and future API endpoints for Hungry Hundreds. Currently, the app uses mock data from `src/lib/data/mockData.js`. Future phases will implement these as REST API endpoints.

## Data Models

### Habit

Represents a user's habit to track.

```typescript
interface Habit {
  id: number;              // Unique identifier
  name: string;            // Habit name (e.g., "Morning Run")
  emoji: string;           // Icon emoji (e.g., "🏃")
  color: string;           // Hex color code (e.g., "#22c55e")
  streak: number;          // Current consecutive days completed
  completedToday: boolean; // Whether completed today
  reminderTime: string | null; // Time in HH:MM format or null
}
```

**Example:**
```json
{
  "id": 1,
  "name": "Morning Run",
  "emoji": "🏃",
  "color": "#22c55e",
  "streak": 12,
  "completedToday": false,
  "reminderTime": "07:00"
}
```

**Validation Rules:**
- `name`: Required, 1-50 characters
- `emoji`: Required, single emoji character
- `color`: Required, valid hex color code
- `streak`: Non-negative integer
- `reminderTime`: HH:MM format (24-hour) or null

### Monster

Represents the user's virtual pet that evolves based on habit completion.

```typescript
interface Monster {
  name: string;            // Monster's name (e.g., "Chompy")
  stage: MonsterStage;     // Current evolution stage
  evolutionProgress: number; // Progress to next stage (0-100)
}

type MonsterStage = 'egg' | 'baby' | 'teen' | 'adult' | 'elder';
```

**Example:**
```json
{
  "name": "Chompy",
  "stage": "teen",
  "evolutionProgress": 65
}
```

**Stage Progression:**
- `egg`: 0-20% overall completion
- `baby`: 21-40% overall completion
- `teen`: 41-60% overall completion
- `adult`: 61-80% overall completion
- `elder`: 81-100% overall completion

### Stats

Represents user statistics and analytics.

```typescript
interface Stats {
  completionRate: number;  // Overall completion percentage
  weeklyData: WeeklyDataPoint[];
}

interface WeeklyDataPoint {
  day: string;             // Day name (e.g., "Mon")
  completed: number;       // Habits completed that day
  total: number;           // Total habits for that day
}
```

**Example:**
```json
{
  "completionRate": 78,
  "weeklyData": [
    { "day": "Mon", "completed": 4, "total": 4 },
    { "day": "Tue", "completed": 3, "total": 4 },
    { "day": "Wed", "completed": 4, "total": 4 }
  ]
}
```

## Mock Data Location

Current implementation uses static mock data:

- **File**: `src/lib/data/mockData.js`
- **Exports**:
  - `mockHabits` - Array of sample habits
  - `mockMonster` - Sample monster state
  - `mockStats` - Sample statistics

## Store API

Current state management via Svelte stores in `src/lib/stores/habits.js`:

### habits Store

```typescript
interface HabitsStore {
  subscribe: (callback: (habits: Habit[]) => void) => Unsubscriber;
  toggle: (id: number) => void;
  add: (habit: Omit<Habit, 'id' | 'streak' | 'completedToday'>) => void;
  reset: () => void;
}
```

**Methods:**

- `toggle(id)` - Toggle habit completion for today
  - Updates `completedToday` boolean
  - Increments/decrements `streak`
  
- `add(habit)` - Add new habit
  - Generates unique ID
  - Initializes `streak` to 0
  - Sets `completedToday` to false
  
- `reset()` - Reset to mock data

### todaysProgress Store (Derived)

```typescript
interface TodaysProgress {
  total: number;      // Total habits
  completed: number;  // Completed today
  pct: number;        // Completion percentage (0-100)
}
```

Auto-calculated from habits store.

## Future API Endpoints

### Habits

#### GET /api/habits
Get all habits for authenticated user.

**Response:**
```json
{
  "habits": [
    { "id": 1, "name": "Morning Run", /* ... */ }
  ]
}
```

#### POST /api/habits
Create a new habit.

**Request:**
```json
{
  "name": "Morning Run",
  "emoji": "🏃",
  "color": "#22c55e",
  "reminderTime": "07:00"
}
```

**Response:**
```json
{
  "habit": { "id": 1, "name": "Morning Run", /* ... */ }
}
```

#### PATCH /api/habits/:id
Update a habit.

**Request:**
```json
{
  "name": "Evening Run",
  "reminderTime": "18:00"
}
```

#### DELETE /api/habits/:id
Delete a habit.

#### POST /api/habits/:id/toggle
Toggle habit completion for today.

**Response:**
```json
{
  "habit": { "id": 1, "completedToday": true, "streak": 13 }
}
```

### Monster

#### GET /api/monster
Get current monster state.

**Response:**
```json
{
  "monster": {
    "name": "Chompy",
    "stage": "teen",
    "evolutionProgress": 65
  }
}
```

#### PATCH /api/monster
Update monster name.

**Request:**
```json
{
  "name": "Fluffy"
}
```

### Stats

#### GET /api/stats
Get user statistics.

**Query Parameters:**
- `period`: `week` | `month` | `year` (default: `week`)

**Response:**
```json
{
  "completionRate": 78,
  "weeklyData": [/* ... */]
}
```

## Database Schema (Future)

### Cloudflare D1 Tables

#### habits
```sql
CREATE TABLE habits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL,
  color TEXT NOT NULL,
  reminder_time TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### completions
```sql
CREATE TABLE completions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  habit_id INTEGER NOT NULL,
  completed_at DATE NOT NULL,
  FOREIGN KEY (habit_id) REFERENCES habits(id),
  UNIQUE(habit_id, completed_at)
);
```

#### monsters
```sql
CREATE TABLE monsters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stage TEXT NOT NULL,
  evolution_progress INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## Integration Points

### Current (Phase 1)
- Mock data in `src/lib/data/mockData.js`
- Svelte stores in `src/lib/stores/habits.js`
- No external API calls

### Future (Phase 2+)
- Replace store methods with API calls
- Add `src/routes/api/` endpoints
- Use Cloudflare D1 for persistence
- Add authentication middleware

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment process

