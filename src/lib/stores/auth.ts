/**
 * Auth Store
 *
 * Provides reactive authentication state using Svelte stores.
 * Automatically syncs with Supabase auth state changes.
 *
 * @see docs/API.md for authentication documentation
 */
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, onAuthStateChange, signIn, signUp, signOut, getSession } from '$lib/supabase';

// ============================================================================
// Types
// ============================================================================

export interface AuthState {
	user: User | null;
	session: Session | null;
	loading: boolean;
	initialized: boolean;
}

// ============================================================================
// Core Auth Store
// ============================================================================

function createAuthStore() {
	const { subscribe, set, update } = writable<AuthState>({
		user: null,
		session: null,
		loading: true,
		initialized: false
	});

	// Initialize auth state in browser
	if (browser) {
		// Get initial session
		getSession().then((session) => {
			update((state) => ({
				...state,
				user: session?.user ?? null,
				session,
				loading: false,
				initialized: true
			}));
		});

		// Subscribe to auth state changes
		onAuthStateChange((event, session) => {
			update((state) => ({
				...state,
				user: session?.user ?? null,
				session,
				loading: false,
				initialized: true
			}));

			// Log auth events for debugging
			console.log('[auth] State change:', event, session?.user?.email ?? 'signed out');
		});
	} else {
		// SSR - mark as initialized but not loading
		set({
			user: null,
			session: null,
			loading: false,
			initialized: true
		});
	}

	return {
		subscribe,

		/**
		 * Sign in with email and password
		 */
		signIn: async (email: string, password: string) => {
			update((state) => ({ ...state, loading: true }));

			const result = await signIn(email, password);

			if (!result.success) {
				update((state) => ({ ...state, loading: false }));
			}
			// Success case is handled by onAuthStateChange

			return result;
		},

		/**
		 * Sign up with email and password
		 */
		signUp: async (email: string, password: string) => {
			update((state) => ({ ...state, loading: true }));

			const result = await signUp(email, password);

			if (!result.success) {
				update((state) => ({ ...state, loading: false }));
			}
			// Success case is handled by onAuthStateChange

			return result;
		},

		/**
		 * Sign out
		 */
		signOut: async () => {
			update((state) => ({ ...state, loading: true }));

			const result = await signOut();

			if (!result.success) {
				update((state) => ({ ...state, loading: false }));
			}
			// Success case is handled by onAuthStateChange

			return result;
		}
	};
}

export const auth = createAuthStore();

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * Simple boolean indicating if user is authenticated
 */
export const isAuthenticated = derived(auth, ($auth) => $auth.session !== null);

/**
 * Current user's ID (useful for database queries)
 */
export const userId = derived(auth, ($auth) => $auth.user?.id ?? null);

/**
 * Current user's email
 */
export const userEmail = derived(auth, ($auth) => $auth.user?.email ?? null);

/**
 * Whether auth is still loading/initializing
 */
export const authLoading = derived(auth, ($auth) => $auth.loading || !$auth.initialized);

