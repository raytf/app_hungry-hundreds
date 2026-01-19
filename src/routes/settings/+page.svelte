<script lang="ts">
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import SyncStatusIndicator from '$lib/components/SyncStatusIndicator.svelte';
	import { habits } from '$lib/stores/habits';
	import { mockMonster } from '$lib/data/mockData';
	import { auth, isAuthenticated, userEmail } from '$lib/stores/auth';
	import { syncStore, isOnline, isSyncing } from '$lib/sync';
	import { pushStore } from '$lib/notifications';

	let monsterName = $state(mockMonster.name);
	let showResetConfirm = $state(false);
	let signingOut = $state(false);
	let showToken = $state(false);

	function handleReset() {
		habits.reset();
		showResetConfirm = false;
	}

	async function handleSignOut() {
		signingOut = true;
		const result = await auth.signOut();
		if (result.success) {
			goto('/auth/signin');
		}
		signingOut = false;
	}

	function handleManualSync() {
		syncStore.sync();
	}

	// Format last sync time for display
	function formatLastSyncTime(timestamp: number | null): string {
		if (!timestamp) return 'Never synced';
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now.getTime() - timestamp;

		// Within last minute
		if (diff < 60000) return 'Just now';

		// Within last hour
		if (diff < 3600000) {
			const mins = Math.floor(diff / 60000);
			return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
		}

		// Within today
		if (date.toDateString() === now.toDateString()) {
			return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
		}

		// Yesterday
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);
		if (date.toDateString() === yesterday.toDateString()) {
			return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
		}

		// Older
		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

<svelte:head>
	<title>Settings | Hungry Hundreds</title>
</svelte:head>

<Header title="Settings" />

<main class="page-container pt-4">
	<!-- Monster Settings -->
	<section class="mb-6">
		<h3 class="mb-3 font-semibold text-gray-700">Your Monster</h3>
		<div class="card">
			<label for="monster-name" class="mb-2 block text-sm font-medium text-gray-700">
				Monster Name
			</label>
			<input
				id="monster-name"
				type="text"
				bind:value={monsterName}
				class="input-field"
				placeholder="Enter your monster's name"
			/>
			<p class="mt-2 text-sm text-gray-400">
				Your monster is currently a <span class="font-medium capitalize">{mockMonster.stage}</span>
			</p>
		</div>
	</section>

	<!-- Account -->
	<section class="mb-6">
		<h3 class="mb-3 font-semibold text-gray-700">Account</h3>
		<div class="card">
			{#if $isAuthenticated}
				<div class="mb-4">
					<p class="text-sm text-gray-500">Signed in as</p>
					<p class="font-medium text-gray-800">{$userEmail}</p>
				</div>
				<button onclick={handleSignOut} class="btn-secondary w-full" disabled={signingOut}>
					{#if signingOut}
						<span class="inline-flex items-center gap-2">
							<span
								class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"
							></span>
							Signing out...
						</span>
					{:else}
						Sign Out
					{/if}
				</button>
			{:else}
				<p class="mb-4 text-sm text-gray-600">
					Sign in to sync your habits across devices and never lose your progress.
				</p>
				<div class="flex gap-2">
					<a href="/auth/signin" class="btn-primary flex-1 text-center">Sign In</a>
					<a href="/auth/signup" class="btn-secondary flex-1 text-center">Sign Up</a>
				</div>
			{/if}
		</div>
	</section>

	<!-- Sync Status -->
	<section class="mb-6">
		<h3 class="mb-3 font-semibold text-gray-700">Sync Status</h3>
		<div class="card">
			<!-- Connection Status -->
			<div class="mb-4 flex items-center gap-3">
				<div
					class="flex h-10 w-10 items-center justify-center rounded-full"
					class:bg-green-100={$isOnline}
					class:bg-gray-100={!$isOnline}
				>
					<span class="text-lg">{$isOnline ? '🌐' : '📡'}</span>
				</div>
				<div>
					<p class="font-medium text-gray-800">
						{$isOnline ? 'Online' : 'Offline'}
					</p>
					<p class="text-sm text-gray-500">
						{$isOnline ? 'Connected to the internet' : 'Working offline - changes will sync later'}
					</p>
				</div>
			</div>

			<!-- Sync Status Detail -->
			<div class="mb-4 border-t border-gray-100 pt-4">
				<SyncStatusIndicator showText />
			</div>

			<!-- Pending Changes -->
			{#if $syncStore.pendingCount > 0}
				<div class="mb-4 rounded-lg bg-amber-50 p-3">
					<div class="flex items-center gap-2">
						<span class="text-amber-600">📤</span>
						<span class="text-sm font-medium text-amber-800">
							{$syncStore.pendingCount} pending change{$syncStore.pendingCount !== 1 ? 's' : ''}
						</span>
					</div>
					<p class="mt-1 text-xs text-amber-600">
						{$isOnline ? 'Will sync automatically' : 'Will sync when back online'}
					</p>
				</div>
			{/if}

			<!-- Error Display -->
			{#if $syncStore.status === 'error' && $syncStore.error}
				<div class="mb-4 rounded-lg bg-red-50 p-3">
					<div class="flex items-center gap-2">
						<span class="text-red-500">⚠️</span>
						<span class="text-sm font-medium text-red-800">Sync Error</span>
					</div>
					<p class="mt-1 text-xs text-red-600">{$syncStore.error}</p>
				</div>
			{/if}

			<!-- Last Sync Time -->
			<div class="text-sm text-gray-500">
				<span class="font-medium">Last synced:</span>
				{formatLastSyncTime($syncStore.lastSync)}
			</div>

			<!-- Manual Sync Button -->
			{#if $isAuthenticated}
				<button
					onclick={handleManualSync}
					disabled={$isSyncing || !$isOnline}
					class="btn-secondary mt-4 w-full"
				>
					{#if $isSyncing}
						<span class="inline-flex items-center gap-2">
							<span
								class="h-4 w-4 animate-spin rounded-full border-2 border-gray-500 border-t-transparent"
							></span>
							Syncing...
						</span>
					{:else}
						Sync Now
					{/if}
				</button>
			{:else}
				<p class="mt-4 text-center text-sm text-gray-500">Sign in to enable cloud sync</p>
			{/if}
		</div>
	</section>

	<!-- Notifications -->
	<section class="mb-6">
		<h3 class="mb-3 font-semibold text-gray-700">Notifications</h3>
		<div class="card">
			{#if !$pushStore.isSupported}
				<div class="flex items-center gap-3">
					<span class="text-2xl">🔕</span>
					<div>
						<p class="font-medium text-gray-800">Not Available</p>
						<p class="text-sm text-gray-500">
							Push notifications are not supported in this browser or Firebase is not configured.
						</p>
					</div>
				</div>
			{:else if $pushStore.permission === 'denied'}
				<div class="flex items-center gap-3">
					<span class="text-2xl">🚫</span>
					<div>
						<p class="font-medium text-gray-800">Notifications Blocked</p>
						<p class="text-sm text-gray-500">
							You've blocked notifications. Enable them in your browser settings.
						</p>
					</div>
				</div>
			{:else if $pushStore.isEnabled && $pushStore.token}
				<div class="flex items-center gap-3">
					<span class="text-2xl">🔔</span>
					<div>
						<p class="font-medium text-gray-800">Notifications Enabled</p>
						<p class="text-sm text-gray-500">You'll receive habit reminders</p>
					</div>
				</div>

				<!-- Token for testing (dev only) -->
				<div class="mt-4 border-t border-gray-100 pt-4">
					<button
						onclick={() => (showToken = !showToken)}
						class="text-sm text-gray-500 hover:text-gray-700"
					>
						{showToken ? 'Hide' : 'Show'} FCM Token (for testing)
					</button>
					{#if showToken}
						<div class="mt-2">
							<p class="mb-1 text-xs text-gray-400">
								Copy this token to Firebase Console → Cloud Messaging → Send test message
							</p>
							<textarea
								readonly
								class="h-20 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-600"
								value={$pushStore.token}
							></textarea>
							<button
								onclick={() => navigator.clipboard.writeText($pushStore.token ?? '')}
								class="btn-secondary mt-2 w-full text-sm"
							>
								📋 Copy Token
							</button>
						</div>
					{/if}
				</div>

				<button onclick={() => pushStore.disable()} class="btn-secondary mt-4 w-full">
					Disable Notifications
				</button>
			{:else}
				<div class="flex items-center gap-3">
					<span class="text-2xl">🔔</span>
					<div>
						<p class="font-medium text-gray-800">Enable Notifications</p>
						<p class="text-sm text-gray-500">Get reminded about your daily habits</p>
					</div>
				</div>
				<button
					onclick={() => pushStore.requestPermission()}
					disabled={$pushStore.isLoading}
					class="btn-primary mt-4 w-full"
				>
					{#if $pushStore.isLoading}
						<span class="inline-flex items-center gap-2">
							<span
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
							></span>
							Enabling...
						</span>
					{:else}
						Enable Notifications
					{/if}
				</button>
			{/if}

			{#if $pushStore.error}
				<div class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-600">
					{$pushStore.error}
				</div>
			{/if}
		</div>
	</section>

	<!-- App Settings -->
	<section class="mb-6">
		<h3 class="mb-3 font-semibold text-gray-700">App Settings</h3>
		<div class="space-y-3">
			<div class="card flex items-center justify-between">
				<div>
					<p class="font-medium text-gray-800">Dark Mode</p>
					<p class="text-sm text-gray-500">Switch to dark theme</p>
				</div>
				<div class="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
					Coming Soon
				</div>
			</div>
		</div>
	</section>

	<!-- Data Management -->
	<section class="mb-6">
		<h3 class="mb-3 font-semibold text-gray-700">Data</h3>
		<div class="card">
			{#if showResetConfirm}
				<p class="mb-3 text-sm text-red-600">
					Are you sure? This will reset all habits to their initial state.
				</p>
				<div class="flex gap-2">
					<button onclick={() => (showResetConfirm = false)} class="btn-secondary flex-1">
						Cancel
					</button>
					<button
						onclick={handleReset}
						class="flex-1 rounded-xl bg-red-500 px-6 py-3 font-semibold text-white transition-all hover:bg-red-600"
					>
						Reset
					</button>
				</div>
			{:else}
				<button onclick={() => (showResetConfirm = true)} class="btn-secondary w-full">
					Reset All Data
				</button>
			{/if}
		</div>
	</section>

	<!-- About -->
	<section>
		<h3 class="mb-3 font-semibold text-gray-700">About</h3>
		<div class="card text-center">
			<p class="mb-1 text-2xl">🦖</p>
			<h4 class="font-display text-lg font-bold text-hungry-600">Hungry Hundreds</h4>
			<p class="text-sm text-gray-500">Version 0.5.0 (Phase 5 - Animation)</p>
			<p class="mt-2 text-xs text-gray-400">
				Build better habits with your evolving monster companion
			</p>
		</div>
	</section>
</main>
