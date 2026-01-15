/**
 * Supabase Authentication Helpers
 *
 * Provides authentication functions for sign up, sign in, sign out,
 * and session management. Uses Supabase Auth with email/password.
 *
 * @see docs/API.md for authentication flow documentation
 */
import { supabase } from './client';
import type { AuthError, Session, User } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface AuthResult {
	success: boolean;
	user?: User | null;
	session?: Session | null;
	error?: AuthError | null;
}

// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Sign up a new user with email and password
 */
export async function signUp(email: string, password: string): Promise<AuthResult> {
	const { data, error } = await supabase.auth.signUp({
		email,
		password
	});

	if (error) {
		return { success: false, error };
	}

	return {
		success: true,
		user: data.user,
		session: data.session
	};
}

/**
 * Sign in an existing user with email and password
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password
	});

	if (error) {
		return { success: false, error };
	}

	return {
		success: true,
		user: data.user,
		session: data.session
	};
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<{ success: boolean; error?: AuthError | null }> {
	const { error } = await supabase.auth.signOut();

	if (error) {
		return { success: false, error };
	}

	return { success: true };
}

/**
 * Get the current session
 */
export async function getSession(): Promise<Session | null> {
	const { data } = await supabase.auth.getSession();
	return data.session;
}

/**
 * Get the current user
 */
export async function getUser(): Promise<User | null> {
	const { data } = await supabase.auth.getUser();
	return data.user;
}

/**
 * Send password reset email
 */
export async function resetPassword(
	email: string
): Promise<{ success: boolean; error?: AuthError | null }> {
	const { error } = await supabase.auth.resetPasswordForEmail(email);

	if (error) {
		return { success: false, error };
	}

	return { success: true };
}

/**
 * Update user password (requires user to be authenticated)
 */
export async function updatePassword(
	newPassword: string
): Promise<{ success: boolean; error?: AuthError | null }> {
	const { error } = await supabase.auth.updateUser({
		password: newPassword
	});

	if (error) {
		return { success: false, error };
	}

	return { success: true };
}

/**
 * Subscribe to auth state changes
 * Returns an unsubscribe function
 */
export function onAuthStateChange(
	callback: (event: string, session: Session | null) => void
): () => void {
	const {
		data: { subscription }
	} = supabase.auth.onAuthStateChange((event, session) => {
		callback(event, session);
	});

	return () => subscription.unsubscribe();
}

