# API Documentation

## Overview

This document describes the data models for Hungry Hundreds, covering both local storage (Dexie.js/IndexedDB) and remote database (Supabase PostgreSQL). The app follows an offline-first architecture where all operations save locally first, then sync to Supabase.

## Local Data Models (Dexie.js)

### Habit

Represents a user's habit stored locally in IndexedDB.

```typescript
// src/lib/db.ts
interface Habit {
  id?: number;           // Auto-incremented local ID
  serverId?: string;     // Supabase UUID (set after sync)
  name: string;          // Habit name (e.g., "Morning Run")
  color: string;         // Hex color code (e.g., "#3498db")
  reminderTime?: string; // HH:MM format (24-hour)
  createdAt: number;     // Unix timestamp
  updatedAt: number;     // Unix timestamp
}
```

**Example:**

```json
{
	"id": 1,
	"serverId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	"name": "Morning Run",
	"color": "#22c55e",
	"reminderTime": "07:00",
	"createdAt": 1705305600000,
	"updatedAt": 1705305600000
}
```

### HabitLog

Records each habit completion event.

```typescript
interface HabitLog {
  id?: number;           // Auto-incremented local ID
  serverId?: string;     // Supabase UUID (set after sync)
  habitId: number;       // Local habit ID
  date: string;          // YYYY-MM-DD format
  completedAt: number;   // Unix timestamp
  synced: boolean;       // Whether synced to Supabase
}
```

**Example:**

```json
{
	"id": 42,
	"serverId": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
	"habitId": 1,
	"date": "2025-01-15",
	"completedAt": 1705312800000,
	"synced": true
}
```

### SyncQueue

Tracks pending operations for offline sync.

```typescript
interface SyncQueue {
  id?: number;           // Auto-incremented ID
  action: 'create' | 'update' | 'delete';
  table: 'habits' | 'logs';
  payload: any;          // Data to sync
  timestamp: number;     // When operation occurred
  retries: number;       // Number of sync attempts
}
```

### Dexie Schema Definition

```typescript
// src/lib/db.ts
import Dexie, { type Table } from 'dexie';

export class HungryHundredsDB extends Dexie {
  habits!: Table<Habit>;
  logs!: Table<HabitLog>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super('HungryHundreds');
    this.version(1).stores({
      habits: '++id, serverId, createdAt',
      logs: '++id, serverId, [habitId+date], completedAt, synced',
      syncQueue: '++id, timestamp'
    });
  }
}

export const db = new HungryHundredsDB();
```

## Remote Database (Supabase PostgreSQL)

### habits Table

```sql
CREATE TABLE habits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#3498db',
  reminder_time TIME,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, name)
);
```

### habit_logs Table

```sql
CREATE TABLE habit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, habit_id, logged_date)
);
```

### push_subscriptions Table

```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, fcm_token)
);
```

### Row Level Security

```sql
-- Enable RLS on all tables
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users manage own habits" ON habits
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own logs" ON habit_logs
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own subscriptions" ON push_subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

### Performance Indexes

```sql
CREATE INDEX idx_logs_user_date ON habit_logs(user_id, logged_date);
CREATE INDEX idx_logs_habit_date ON habit_logs(habit_id, logged_date);
```

### Streak Calculation Function

```sql
CREATE OR REPLACE FUNCTION get_habit_streak(p_habit_id UUID)
RETURNS INTEGER AS $$
DECLARE
  streak INTEGER := 0;
  check_date DATE := CURRENT_DATE;
BEGIN
  LOOP
    IF EXISTS (
      SELECT 1 FROM habit_logs
      WHERE habit_id = p_habit_id AND logged_date = check_date
    ) THEN
      streak := streak + 1;
      check_date := check_date - 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  RETURN streak;
END;
$$ LANGUAGE plpgsql;
```

## Supabase Edge Functions

### POST /functions/v1/complete-habit

Completes a habit for a specific date and returns the updated streak.

**Request:**

```json
{
	"habit_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
	"logged_date": "2025-01-15"
}
```

**Response:**

```json
{
	"log": {
		"id": "b2c3d4e5-f6a7-8901-bcde-f23456789012",
		"habit_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
		"logged_date": "2025-01-15",
		"logged_at": "2025-01-15T08:30:00Z"
	},
	"streak": 12
}
```

### POST /functions/v1/daily-reminder (Scheduled)

Scheduled function triggered by Supabase cron. Sends push notifications to users whose reminder time matches the current hour.

## Supabase Client Configuration

```typescript
// src/lib/api.ts
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);
```

## Sync Strategy

### Priority: Local-first, Server-authoritative

**On action (create/update/delete):**

1. Apply to Dexie immediately
2. Add to syncQueue with timestamp

**On connectivity restored:**

1. Process syncQueue oldest-first
2. For each item:
   - POST to Supabase
   - On success: remove from queue, update serverId
   - On conflict (409): fetch server state, merge (last-write-wins)
   - On failure: increment retries, retry with backoff (max 5)
3. After queue empty: full sync (GET all user data since lastSync)

## Validation Rules

### Habit

- `name`: Required, 1-100 characters
- `color`: Required, valid hex color (#RRGGBB)
- `reminderTime`: Optional, HH:MM format (24-hour)
- Maximum 10 habits per user (MVP)

### HabitLog

- `date`: Required, YYYY-MM-DD format
- Cannot complete future dates
- Can backfill past 7 days only

## Related Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Development workflow
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment process
- [TECH_SPEC.md](./TECH_SPEC.md) - Full technical specification
