/**
 * Supabase API Wrapper Functions
 *
 * Provides typed database operations for habits and habit logs.
 * These functions will be used by the sync layer (Phase 4) to push local
 * changes to Supabase and pull remote changes.
 *
 * Note: Type assertions are used because the Supabase client requires a
 * connected database for full type inference. Once connected, these work correctly.
 *
 * @see docs/API.md for data model documentation
 */
import { supabase } from './client';
import type { HabitRow, HabitInsert, HabitUpdate, HabitLogRow, HabitLogInsert } from './types';

// ============================================================================
// Types
// ============================================================================

export interface ApiResult<T> {
	data: T | null;
	error: Error | null;
}

// ============================================================================
// Habits API
// ============================================================================

/**
 * Fetch all habits for the current user
 */
export async function fetchHabits(): Promise<ApiResult<HabitRow[]>> {
	const { data, error } = await supabase
		.from('habits')
		.select('*')
		.order('created_at', { ascending: true });

	return { data: data as HabitRow[] | null, error };
}

/**
 * Fetch a single habit by ID
 */
export async function fetchHabit(id: string): Promise<ApiResult<HabitRow>> {
	const { data, error } = await supabase.from('habits').select('*').eq('id', id).single();

	return { data: data as HabitRow | null, error };
}

/**
 * Create a new habit
 */
export async function createRemoteHabit(
	habit: Omit<HabitInsert, 'user_id'>,
	userId: string
): Promise<ApiResult<HabitRow>> {
	const insertData: HabitInsert = { ...habit, user_id: userId };

	const { data, error } = await supabase
		.from('habits')
		.insert(insertData as never)
		.select()
		.single();

	return { data: data as HabitRow | null, error };
}

/**
 * Update an existing habit
 */
export async function updateRemoteHabit(
	id: string,
	updates: HabitUpdate
): Promise<ApiResult<HabitRow>> {
	const { data, error } = await supabase
		.from('habits')
		.update(updates as never)
		.eq('id', id)
		.select()
		.single();

	return { data: data as HabitRow | null, error };
}

/**
 * Delete a habit
 */
export async function deleteRemoteHabit(id: string): Promise<{ error: Error | null }> {
	const { error } = await supabase.from('habits').delete().eq('id', id);

	return { error };
}

// ============================================================================
// Habit Logs API
// ============================================================================

/**
 * Fetch all habit logs for the current user
 * Optionally filter by date range
 */
export async function fetchHabitLogs(options?: {
	habitId?: string;
	startDate?: string;
	endDate?: string;
}): Promise<ApiResult<HabitLogRow[]>> {
	let query = supabase.from('habit_logs').select('*');

	if (options?.habitId) {
		query = query.eq('habit_id', options.habitId);
	}
	if (options?.startDate) {
		query = query.gte('logged_date', options.startDate);
	}
	if (options?.endDate) {
		query = query.lte('logged_date', options.endDate);
	}

	const { data, error } = await query.order('logged_date', { ascending: false });

	return { data: data as HabitLogRow[] | null, error };
}

/**
 * Create a habit log (complete a habit)
 */
export async function createRemoteHabitLog(
	log: Omit<HabitLogInsert, 'user_id'>,
	userId: string
): Promise<ApiResult<HabitLogRow>> {
	const insertData: HabitLogInsert = { ...log, user_id: userId };

	const { data, error } = await supabase
		.from('habit_logs')
		.insert(insertData as never)
		.select()
		.single();

	return { data: data as HabitLogRow | null, error };
}

/**
 * Delete a habit log (uncomplete a habit)
 */
export async function deleteRemoteHabitLog(
	habitId: string,
	date: string
): Promise<{ error: Error | null }> {
	const { error } = await supabase
		.from('habit_logs')
		.delete()
		.eq('habit_id', habitId)
		.eq('logged_date', date);

	return { error };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the streak for a habit using the database function
 */
export async function getRemoteHabitStreak(habitId: string): Promise<ApiResult<number>> {
	const { data, error } = await supabase.rpc('get_habit_streak', {
		p_habit_id: habitId
	} as never);

	return { data: data as number | null, error };
}
