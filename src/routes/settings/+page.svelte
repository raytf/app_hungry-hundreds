<script lang="ts">
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import { habits } from '$lib/stores/habits';
	import { mockMonster } from '$lib/data/mockData';
	import { auth, isAuthenticated, userEmail } from '$lib/stores/auth';

	let monsterName = $state(mockMonster.name);
	let showResetConfirm = $state(false);
	let signingOut = $state(false);

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

	<!-- App Settings -->
	<section class="mb-6">
		<h3 class="mb-3 font-semibold text-gray-700">App Settings</h3>
		<div class="space-y-3">
			<div class="card flex items-center justify-between">
				<div>
					<p class="font-medium text-gray-800">Notifications</p>
					<p class="text-sm text-gray-500">Remind me about habits</p>
				</div>
				<div class="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-500">
					Coming Soon
				</div>
			</div>

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
			<p class="text-sm text-gray-500">Version 0.1.0 (Phase 1 - UI Foundation)</p>
			<p class="mt-2 text-xs text-gray-400">
				Build better habits with your evolving monster companion
			</p>
		</div>
	</section>
</main>
