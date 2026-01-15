/**
 * Supabase Client Configuration
 *
 * Initializes the Supabase client for authentication and database operations.
 * Uses SvelteKit's environment variables for configuration.
 *
 * Supports both new API keys (sb_publishable_...) and legacy keys (anon JWT):
 * - PUBLIC_SUPABASE_PUBLISHABLE_KEY: New publishable key (recommended)
 * - PUBLIC_SUPABASE_ANON_KEY: Legacy anon key (still supported)
 *
 * The client will use whichever is provided. The new publishable key format
 * (sb_publishable_...) is recommended as it offers better security and rotation.
 *
 * @see https://supabase.com/docs/guides/api/api-keys
 * @see docs/API.md for database schema documentation
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_PUBLISHABLE_KEY,
	PUBLIC_SUPABASE_ANON_KEY
} from '$env/static/public';
import type { Database } from './types';

// Use new publishable key if available, otherwise fall back to legacy anon key
const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.warn(
		'[supabase] Missing environment variables. Set PUBLIC_SUPABASE_URL and either PUBLIC_SUPABASE_PUBLISHABLE_KEY (recommended) or PUBLIC_SUPABASE_ANON_KEY in .env'
	);
}

/**
 * Supabase client singleton
 *
 * Use this client for all Supabase operations:
 * - Authentication (sign up, login, logout)
 * - Database queries (habits, habit_logs)
 * - Realtime subscriptions (Phase 4)
 *
 * Note: The client works identically with both new publishable keys (sb_publishable_...)
 * and legacy anon keys. No code changes required when switching between them.
 */
export const supabase: SupabaseClient<Database> = createClient<Database>(
	supabaseUrl || 'https://placeholder.supabase.co',
	supabaseKey || 'placeholder-key',
	{
		auth: {
			// Persist session in localStorage
			persistSession: true,
			// Auto refresh token before expiry
			autoRefreshToken: true,
			// Detect session from URL (for OAuth redirects)
			detectSessionInUrl: true
		}
	}
);
