/**
 * Supabase Client Configuration
 *
 * Initializes the Supabase client for authentication and database operations.
 * Uses SvelteKit's environment variables for configuration.
 *
 * Required environment variables:
 * - PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - PUBLIC_SUPABASE_PUBLISHABLE_KEY: Publishable API key (sb_publishable_...)
 *
 * @see https://supabase.com/docs/guides/api/api-keys
 * @see docs/API.md for database schema documentation
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_KEY } from '$env/static/public';
import type { Database } from './types';

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
	console.warn(
		'[supabase] Missing environment variables. Set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env'
	);
}

/**
 * Supabase client singleton
 *
 * Use this client for all Supabase operations:
 * - Authentication (sign up, login, logout)
 * - Database queries (habits, habit_logs)
 * - Realtime subscriptions (Phase 4)
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
