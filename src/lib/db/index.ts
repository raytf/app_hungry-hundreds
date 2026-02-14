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
	type SyncQueue,
	type FrequencyType,
	type CompletionType
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
	getCompletedTodayMap,
	// Flexible streak calculation (Phase 1)
	calculateFlexibleStreak,
	calculateFlexibleStreaksForHabits,
	getWeekBounds,
	getCompletionsInRange,
	getTotalCompletions,
	calculateWeekStreak,
	type FlexibleStreakResult,
	// Partial completion (Phase 2)
	markPartialCompletion,
	hasPartialCompletionOnDate,
	getCompletionTypeForDate,
	getFullCompletionsForDate,
	getFullCompletionsInRange
} from './habitLogs';
