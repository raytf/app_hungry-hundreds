<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
	import MonsterDisplay from '$lib/components/MonsterDisplay.svelte';
	import GonnChat from '$lib/components/GonnChat.svelte';
	import { syncStore } from '$lib/sync';
	import { pwaStore } from '$lib/stores/pwa';
	import { pushStore } from '$lib/notifications';
	import { refreshStatus } from '$lib/stores/habits';
	import { refreshStats } from '$lib/stores/stats';
	import { monster } from '$lib/stores/monster';

	let { children } = $props();

	// Chat panel visibility
	let chatVisible = $state(false);

	// Routes that require authentication (empty for now - can be enabled later)
	// Set to ['/habits', '/dashboard', '/settings'] to require auth for those routes
	const protectedRoutes: string[] = [];

	// Check if current route should show monster (homepage and monster test page)
	const showMonster = $derived.by(() => {
		const path = page.url.pathname;
		return path === '/' || path === '/monster';
	});

	// Check if current route requires auth
	const requiresAuth = $derived.by(() => {
		const path = page.url.pathname;
		return protectedRoutes.some((route) => path === route || path.startsWith(route + '/'));
	});

	// Track the date when the app was last active to detect day changes
	let lastActiveDate = '';

	// Handle visibility change to refresh habits when returning to the app on a new day
	function handleVisibilityChange() {
		if (document.visibilityState === 'visible') {
			const today = new Date().toISOString().split('T')[0];
			if (lastActiveDate && lastActiveDate !== today) {
				// Day changed while app was in background - refresh habit status and stats
				refreshStatus();
				refreshStats();
			}
			lastActiveDate = today;
		}
	}

	// Initialize app systems on mount
	onMount(() => {
		if (browser) {
			// Track the current date for detecting day changes
			lastActiveDate = new Date().toISOString().split('T')[0];

			// Refresh habit status and stats to recalculate for the current date
			// This handles the case where the app was open yesterday and habits need to reset
			refreshStatus();
			refreshStats();

			// Listen for visibility changes (tab becomes visible, app returns from background)
			document.addEventListener('visibilitychange', handleVisibilityChange);

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
			document.removeEventListener('visibilitychange', handleVisibilityChange);
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
	<meta name="viewport" content="width=device-width, initial-scale=1" />

	<!-- Theme colors -->
	<meta name="theme-color" content="#E8713A" media="(prefers-color-scheme: light)" />
	<meta name="theme-color" content="#1A1412" media="(prefers-color-scheme: dark)" />

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
	<div class="h-screen bg-surface">
		{#if showMonster}
			<!-- Layer 1 (z-ground=5): Ground surface behind Gonn — full viewport width -->
			<div
				class="pointer-events-none fixed inset-x-0 bottom-0 z-ground bg-ground-gradient"
				style="height: calc(var(--gonn-size) + env(safe-area-inset-bottom, 0px))"
				aria-hidden="true"
			></div>

			<!-- Layer 2 (z-rive=10): Gonn canvas — square, centered, max 430px -->
			<div
				class="pointer-events-none fixed bottom-0 left-1/2 z-rive -translate-x-1/2"
				style="width: var(--gonn-size); height: var(--gonn-size);"
			>
				<MonsterDisplay monster={$monster} />
			</div>

			<!-- Layer 3 (z-11): Tap zone — lower half of Gonn opens chat -->
			<button
				class="fixed bottom-0 left-1/2 z-[11] -translate-x-1/2 cursor-pointer"
				style="width: var(--gonn-size); height: calc(var(--gonn-size) * 0.5); background: transparent; border: none;"
				onclick={() => (chatVisible = true)}
				aria-label="Chat with Gonn"
			></button>
		{/if}

		{@render children()}

		<!-- Gonn Chat panel -->
		<GonnChat bind:visible={chatVisible} />
	</div>

	<!-- PWA Install Prompt -->
	<InstallPrompt />

	<!-- PWA Update Prompt -->
	<UpdatePrompt />
</AuthGuard>
