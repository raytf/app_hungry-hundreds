/**
 * Supabase Database Types
 *
 * TypeScript definitions for the Supabase PostgreSQL database schema.
 * These types are used by the Supabase client for type-safe queries.
 *
 * Note: In production, these should be auto-generated using:
 * npx supabase gen types typescript --project-id YOUR_PROJECT > src/lib/supabase/types.ts
 *
 * @see docs/API.md for schema documentation
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
	public: {
		Tables: {
			habits: {
				Row: {
					id: string;
					user_id: string;
					name: string;
					emoji: string;
					color: string;
					reminder_time: string | null;
					created_at: string;
					updated_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					name: string;
					emoji?: string;
					color?: string;
					reminder_time?: string | null;
					created_at?: string;
					updated_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					name?: string;
					emoji?: string;
					color?: string;
					reminder_time?: string | null;
					created_at?: string;
					updated_at?: string;
				};
			};
			habit_logs: {
				Row: {
					id: string;
					user_id: string;
					habit_id: string;
					logged_date: string;
					logged_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					habit_id: string;
					logged_date: string;
					logged_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					habit_id?: string;
					logged_date?: string;
					logged_at?: string;
				};
			};
			push_subscriptions: {
				Row: {
					id: string;
					user_id: string;
					fcm_token: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					user_id: string;
					fcm_token: string;
					created_at?: string;
				};
				Update: {
					id?: string;
					user_id?: string;
					fcm_token?: string;
					created_at?: string;
				};
			};
		};
		Functions: {
			get_habit_streak: {
				Args: { p_habit_id: string };
				Returns: number;
			};
		};
	};
}

// Convenience type aliases for common use
export type Tables<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Row'];
export type InsertDto<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Insert'];
export type UpdateDto<T extends keyof Database['public']['Tables']> =
	Database['public']['Tables'][T]['Update'];

// Export specific table types for ease of use
export type HabitRow = Tables<'habits'>;
export type HabitInsert = InsertDto<'habits'>;
export type HabitUpdate = UpdateDto<'habits'>;

export type HabitLogRow = Tables<'habit_logs'>;
export type HabitLogInsert = InsertDto<'habit_logs'>;
export type HabitLogUpdate = UpdateDto<'habit_logs'>;

export type PushSubscriptionRow = Tables<'push_subscriptions'>;
export type PushSubscriptionInsert = InsertDto<'push_subscriptions'>;
export type PushSubscriptionUpdate = UpdateDto<'push_subscriptions'>;

