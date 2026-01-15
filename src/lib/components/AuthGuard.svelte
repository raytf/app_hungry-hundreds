<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { isAuthenticated, authLoading } from '$lib/stores/auth';
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		/**
		 * If true, redirects to signin when not authenticated.
		 * If false, allows unauthenticated access (for optional auth routes).
		 */
		requireAuth?: boolean;
		/**
		 * URL to redirect to when not authenticated.
		 */
		redirectTo?: string;
	}

	let { children, requireAuth = false, redirectTo = '/auth/signin' }: Props = $props();

	// Track if we've done the initial auth check
	let hasChecked = $state(false);

	// Handle auth redirect in browser
	$effect(() => {
		if (!browser) return;

		// Wait for auth to be initialized
		if ($authLoading) return;

		// Mark as checked once auth is ready
		hasChecked = true;

		// If auth is required and user is not authenticated, redirect
		if (requireAuth && !$isAuthenticated) {
			const currentPath = page.url.pathname;
			// Don't redirect if already on auth pages
			if (!currentPath.startsWith('/auth')) {
				goto(`${redirectTo}?redirect=${encodeURIComponent(currentPath)}`);
			}
		}
	});

	// Determine if we should show content
	const showContent = $derived(() => {
		// During SSR, show content (hydration will handle redirect)
		if (!browser) return true;

		// While loading, don't show content if auth is required
		if ($authLoading) return !requireAuth;

		// After loading, show content if auth not required OR user is authenticated
		return !requireAuth || $isAuthenticated;
	});

	// Show loading state while checking auth
	const showLoading = $derived(() => {
		if (!browser) return false;
		return requireAuth && ($authLoading || !hasChecked);
	});
</script>

{#if showLoading()}
	<div class="flex min-h-screen items-center justify-center bg-gray-50">
		<div class="text-center">
			<div
				class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-hungry-500 border-t-transparent"
			></div>
			<p class="text-gray-500">Loading...</p>
		</div>
	</div>
{:else if showContent()}
	{@render children()}
{/if}
