/**
 * Database Module Index
 *
 * Re-exports all database types and operations for convenient imports.
 *
 * Usage:
 *   import { db, createHabit, toggleHabitCompletion } from '$lib/db';
 */

// Database instance and types
export {
	db,
	formatDateLocal,
	getTodayDate,
	now,
	clearAllUserData,
	type Habit,
	type HabitLog,
	type SyncQueue
} from './db';

// Habit CRUD operations
export {
	createHabit,
	getAllHabits,
	getHabitById,
	getHabitCount,
	updateHabit,
	deleteHabit,
	seedHabitsIfEmpty,
	type CreateHabitInput,
	type UpdateHabitInput
} from './habits';

// HabitLog operations
export {
	logHabitCompletion,
	removeHabitCompletion,
	toggleHabitCompletion,
	isHabitCompletedOnDate,
	getHabitCompletionDates,
	getHabitLogsInRange,
	calculateStreak,
	calculateStreaksForHabits,
	getCompletedTodayMap
} from './habitLogs';
