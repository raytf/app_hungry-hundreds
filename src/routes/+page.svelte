<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import HabitCardCompact from '$lib/components/HabitCardCompact.svelte';
	import HabitSuggestions from '$lib/components/HabitSuggestions.svelte';
	import MonsterDisplay from '$lib/components/MonsterDisplay.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { sortedHabits, todaysProgress } from '$lib/stores/habits';
	import { monster } from '$lib/stores/monster';

	// Get current date for greeting
	const now = new Date();
	const hour = now.getHours();
	const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

	const dateOptions: Intl.DateTimeFormatOptions = {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	};
	const formattedDate = now.toLocaleDateString('en-US', dateOptions);

	// Monster happy state - triggered when a habit is completed
	let isMonsterHappy = $state(false);
	let happyTimeout: ReturnType<typeof setTimeout> | null = null;

	function triggerMonsterHappy() {
		// Clear any existing timeout
		if (happyTimeout) {
			clearTimeout(happyTimeout);
		}

		// Set happy state
		isMonsterHappy = true;

		// Reset after 2 seconds
		happyTimeout = setTimeout(() => {
			isMonsterHappy = false;
			happyTimeout = null;
		}, 2000);
	}
</script>

<svelte:head>
	<title>Today | Hungry Hundreds</title>
</svelte:head>

<!-- Full page grid layout: Header (auto) | Main (1fr) | Monster (auto) | BottomNav spacer (auto) -->
<div
	class="grid"
	style="height: calc(100dvh - env(safe-area-inset-bottom, 0px)); grid-template-rows: auto 1fr auto auto;"
>
	<Header title={formattedDate} showSyncStatus>
		{#snippet right()}
			<!-- <ProgressRing pct={$todaysProgress.pct} size={40} /> -->
		{/snippet}
	</Header>

	<!-- Scrollable main content area - takes remaining space -->
	<main class="scrollable-main overflow-y-auto overscroll-contain">
		<div class="mx-auto w-full max-w-lg px-4 pt-4 pb-4">
			<!-- Progress Summary -->
			<section class="card mb-6 flex items-center justify-between">
				<div>
					<p class="text-sm text-gray-500">Today's Progress</p>
					<p class="text-xl font-bold text-gray-900">
						{$todaysProgress.completed} of {$todaysProgress.total} habits
					</p>
				</div>
				<ProgressRing pct={$todaysProgress.pct} size={64} />
			</section>

			<!-- Habits List -->
			<section>
				{#if $sortedHabits.length > 0}
					<div class="mb-3 flex items-center justify-between">
						<h3 class="font-semibold text-gray-700">Your Habits</h3>
						<a href="/habits/new" class="text-sm font-medium text-hungry-600 hover:text-hungry-700">
							+ Add New
						</a>
					</div>
					<div class="space-y-3">
						{#each $sortedHabits as habit (habit.id)}
							<HabitCardCompact {habit} onComplete={triggerMonsterHappy} />
						{/each}
					</div>
				{:else}
					<!-- Empty state with habit suggestions -->
					<div class="card py-6">
						<HabitSuggestions maxSuggestions={4} />
					</div>
				{/if}
			</section>
		</div>
	</main>

	<!-- Monster Display - part of grid flow, constrained height -->
	<section class="monster-section mx-auto w-full max-w-lg">
		<MonsterDisplay monster={$monster} isHappy={isMonsterHappy} />
	</section>

	<!-- Spacer for BottomNav -->
	<div class="h-16"></div>
</div>

<style>
	/* Constrain monster height to prevent it from taking too much space */
	.monster-section {
		max-height: 40vh;
		overflow: hidden;
	}

	/* Ensure monster content scales properly within constrained height */
	.monster-section :global(> div) {
		max-height: 40vh;
	}

	.monster-section :global(.aspect-square) {
		aspect-ratio: auto;
		max-height: 40vh;
		width: auto;
		margin: 0 auto;
	}

	/* Force scrollbar to always be visible */
	.scrollable-main {
		scrollbar-gutter: stable;
	}

	/* WebKit browsers (Chrome, Safari, Edge) - always show scrollbar */
	.scrollable-main::-webkit-scrollbar {
		width: 8px;
		background-color: transparent;
	}

	.scrollable-main::-webkit-scrollbar-track {
		background-color: rgba(0, 0, 0, 0.05);
		border-radius: 4px;
	}

	.scrollable-main::-webkit-scrollbar-thumb {
		background-color: rgba(0, 0, 0, 0.2);
		border-radius: 4px;
	}

	.scrollable-main::-webkit-scrollbar-thumb:hover {
		background-color: rgba(0, 0, 0, 0.3);
	}

	/* Firefox - always show scrollbar */
	@supports (scrollbar-width: thin) {
		.scrollable-main {
			scrollbar-width: thin;
			scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
		}
	}
</style>
