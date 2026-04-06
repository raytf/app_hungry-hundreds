<script lang="ts">
	import './layout.css';
	import { browser } from '$app/environment';
	import { onMount, onDestroy } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';
	import AuthGuard from '$lib/components/AuthGuard.svelte';
	import InstallPrompt from '$lib/components/InstallPrompt.svelte';
	import UpdatePrompt from '$lib/components/UpdatePrompt.svelte';
	import Toast from '$lib/components/Toast.svelte';
	import { syncStore } from '$lib/sync';
	import { pwaStore } from '$lib/stores/pwa';
	import { showToast } from '$lib/stores/toast.svelte';
	import { pushStore } from '$lib/notifications';
	import { refreshStatus } from '$lib/stores/habits';
	import { refreshStats } from '$lib/stores/stats';

	let { children } = $props();

	// Show a toast whenever sync transitions into an error state
	let prevSyncStatus = $state($syncStore.status);
	$effect(() => {
		const status = $syncStore.status;
		if (status === 'error' && prevSyncStatus !== 'error') {
			showToast('Sync failed — changes saved locally');
		}
		prevSyncStatus = status;
	});

	// Auth is not enforced on any route currently.
	// To protect routes, restore the page import from $app/state and add paths here.
	const requiresAuth = false;

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
		{@render children()}
	</div>

	<!-- PWA Install Prompt -->
	<InstallPrompt />

	<!-- PWA Update Prompt -->
	<UpdatePrompt />

	<!-- Global toast notifications -->
	<Toast />
</AuthGuard>
