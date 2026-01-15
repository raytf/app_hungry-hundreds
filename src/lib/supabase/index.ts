/**
 * Supabase Module Exports
 *
 * Re-exports all Supabase-related functionality for convenient imports.
 * Usage: import { supabase, signIn, signOut } from '$lib/supabase';
 */

// Client
export { supabase } from './client';

// Types
export type {
	Database,
	Tables,
	InsertDto,
	UpdateDto,
	HabitRow,
	HabitInsert,
	HabitUpdate,
	HabitLogRow,
	HabitLogInsert,
	HabitLogUpdate,
	PushSubscriptionRow,
	PushSubscriptionInsert,
	PushSubscriptionUpdate
} from './types';

// Auth
export * from './auth';

// API
export * from './api';
