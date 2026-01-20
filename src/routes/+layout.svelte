<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import BottomNav from '$lib/components/BottomNav.svelte';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import { syncStore } from '$lib/sync';
	import { pwaStore } from '$lib/stores/pwa';
	import { pushStore } from '$lib/notifications';

	let { children } = $props();

	// Routes that don't show BottomNav
	const noNavRoutes = ['/auth', '/onboard'];

	// Routes that require authentication (empty for now - can be enabled later)
	// Set to ['/habits', '/dashboard', '/settings'] to require auth for those routes
	const protectedRoutes: string[] = [];

	// Check if current route should show nav
	const showNav = $derived.by(() => {
		const path = page.url.pathname;
		return !noNavRoutes.some((route) => path.startsWith(route));
	});

	// Check if current route requires auth
	const requiresAuth = $derived.by(() => {
		const path = page.url.pathname;
		return protectedRoutes.some((route) => path === route || path.startsWith(route + '/'));
	});

	// Initialize app systems on mount
	onMount(() => {
		if (browser) {
			// Initialize sync system
			syncStore.init();

			// Initialize PWA install detection
			pwaStore.init();

			// Initialize push notifications
			pushStore.init();
		}
	});

	// Cleanup on unmount
	onDestroy(() => {
		if (browser) {
			syncStore.destroy();
		}
	});
</script>

<svelte:head>
	<!-- Favicon -->
	<link rel="icon" href={favicon} />

	<!-- PWA Manifest -->
	<link rel="manifest" href="/manifest.json" />

	<!-- Apple Touch Icon -->
	<link rel="apple-touch-icon" href="/icon-192.png" />

	<!-- Viewport with iOS safe areas -->
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

	<!-- Theme colors -->
	<meta name="theme-color" content="#22c55e" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#166534" media="(prefers-color-scheme: dark)" />

	<!-- PWA meta tags -->
	<meta name="mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Hungry Hundreds" />

	<!-- Description for SEO -->
	<meta
		name="description"
		content="Build habits, grow your monster companion. Track daily habits and watch your monster evolve!"
	/>

	<title>Hungry Hundreds</title>
</svelte:head>

<AuthGuard requireAuth={requiresAuth}>
	<div class="min-h-screen bg-gray-50">
		{@render children()}
		{#if showNav}
			<BottomNav />
		{/if}
	</div>

	<!-- PWA Install Prompt -->
	<InstallPrompt />
</AuthGuard>
