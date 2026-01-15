/**
 * Habit CRUD Operations
 *
 * Provides functions for managing habits in IndexedDB via Dexie.js.
 * All operations are local-first and will sync to Supabase in Phase 4.
 *
 * @see docs/API.md for data model documentation
 */
import { db, now, type Habit } from './db';

// ============================================================================
// Create Operations
// ============================================================================

export type CreateHabitInput = Pick<Habit, 'name' | 'emoji' | 'color'> &
	Partial<Pick<Habit, 'reminderTime'>>;

/**
 * Create a new habit
 * @returns The ID of the created habit
 */
export async function createHabit(input: CreateHabitInput): Promise<number> {
	const timestamp = now();
	const habit: Habit = {
		name: input.name,
		emoji: input.emoji,
		color: input.color,
		reminderTime: input.reminderTime,
		createdAt: timestamp,
		updatedAt: timestamp
	};

	return await db.habits.add(habit);
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get all habits ordered by creation date (newest first)
 */
export async function getAllHabits(): Promise<Habit[]> {
	return await db.habits.orderBy('createdAt').reverse().toArray();
}

/**
 * Get a single habit by ID
 */
export async function getHabitById(id: number): Promise<Habit | undefined> {
	return await db.habits.get(id);
}

/**
 * Get total habit count
 */
export async function getHabitCount(): Promise<number> {
	return await db.habits.count();
}

// ============================================================================
// Update Operations
// ============================================================================

export type UpdateHabitInput = Partial<Pick<Habit, 'name' | 'emoji' | 'color' | 'reminderTime'>>;

/**
 * Update an existing habit
 * @returns Number of records updated (0 or 1)
 */
export async function updateHabit(id: number, updates: UpdateHabitInput): Promise<number> {
	return await db.habits.update(id, {
		...updates,
		updatedAt: now()
	});
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete a habit and all its associated logs
 * Uses a transaction to ensure atomicity
 */
export async function deleteHabit(id: number): Promise<void> {
	await db.transaction('rw', [db.habits, db.logs], async () => {
		// Delete all logs for this habit
		await db.logs.where('habitId').equals(id).delete();
		// Delete the habit
		await db.habits.delete(id);
	});
}

// ============================================================================
// Seed Data (for development/migration)
// ============================================================================

/**
 * Seed the database with initial habits if empty
 * Used for migrating from mock data
 */
export async function seedHabitsIfEmpty(
	habits: CreateHabitInput[]
): Promise<{ seeded: boolean; count: number }> {
	const count = await db.habits.count();
	if (count > 0) {
		return { seeded: false, count };
	}

	const timestamp = now();
	const habitsToAdd: Habit[] = habits.map((h) => ({
		name: h.name,
		emoji: h.emoji,
		color: h.color,
		reminderTime: h.reminderTime,
		createdAt: timestamp,
		updatedAt: timestamp
	}));

	await db.habits.bulkAdd(habitsToAdd);
	return { seeded: true, count: habitsToAdd.length };
}

