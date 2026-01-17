<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import { syncStore } from '$lib/sync';

	let { children } = $props();

	// Routes that don't show BottomNav
	const noNavRoutes = ['/auth', '/onboard'];

	// Routes that require authentication (empty for now - can be enabled later)
	// Set to ['/habits', '/dashboard', '/settings'] to require auth for those routes
	const protectedRoutes: string[] = [];

	// Check if current route should show nav
	const showNav = $derived(() => {
		const path = page.url.pathname;
		return !noNavRoutes.some((route) => path.startsWith(route));
	});

	// Check if current route requires auth
	const requiresAuth = $derived(() => {
		const path = page.url.pathname;
		return protectedRoutes.some((route) => path === route || path.startsWith(route + '/'));
	});

	// Initialize sync system on app load
	onMount(() => {
		if (browser) {
			syncStore.init();
		}
	});

	// Cleanup sync listeners on unmount
	onDestroy(() => {
		if (browser) {
			syncStore.destroy();
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<meta name="theme-color" content="#f9fafb" />
	<title>Hungry Hundreds</title>
</svelte:head>

<AuthGuard requireAuth={requiresAuth()}>
	<div class="min-h-screen bg-gray-50">
		{@render children()}
		{#if showNav()}
			<BottomNav />
		{/if}
	</div>
</AuthGuard>
