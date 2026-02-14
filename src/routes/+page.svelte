<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import HabitCardCompact from '$lib/components/HabitCardCompact.svelte';
	import HabitSuggestions from '$lib/components/HabitSuggestions.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { sortedHabits, todaysProgress } from '$lib/stores/habits';

	// Get current date for header
	const now = new Date();
	const dateOptions: Intl.DateTimeFormatOptions = {
		weekday: 'long',
		month: 'long',
		day: 'numeric'
	};
	const formattedDate = now.toLocaleDateString('en-US', dateOptions);
</script>

<svelte:head>
	<title>Today | Hungry Hundreds</title>
</svelte:head>

<!-- Full page grid layout: Header (auto) | Main (1fr) | BottomNav spacer (auto) -->
<div
	class="relative grid"
	style="height: calc(100vh - env(safe-area-inset-bottom, 0px)); grid-template-rows: auto 1fr auto;"
>
	<Header title={formattedDate} showSyncStatus>
		{#snippet right()}
			<!-- <ProgressRing pct={$todaysProgress.pct} size={40} /> -->
		{/snippet}
	</Header>

	<!-- Scrollable main content area - takes remaining space -->
	<div class="relative h-[65%]">
		<main class="scrollable-main h-full overflow-y-auto overscroll-contain">
			<div class="scrollable-content mx-auto w-full max-w-lg px-4 pt-4 pb-4">
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
							<a
								href="/habits/new"
								class="text-sm font-medium text-hungry-600 hover:text-hungry-700"
							>
								+ Add New
							</a>
						</div>
						<div class="space-y-3">
							{#each $sortedHabits as habit (habit.id)}
								<HabitCardCompact {habit} />
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
		<!-- Fixed gradient overlay at bottom -->
		<div class="fade-gradient"></div>
	</div>

	<!-- Spacer for BottomNav -->
	<div class="h-16"></div>
</div>

<style>
	/* Fixed fade-out gradient at bottom */
	/* .fade-gradient {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 80px;
		background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 1));
		pointer-events: none;
		z-index: 10;
	} */

	/* Desktop scrollbar styling - hidden on mobile */
	@media (min-width: 768px) {
		.scrollable-main {
			scrollbar-gutter: stable;
		}

		/* WebKit browsers (Chrome, Safari, Edge) */
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

		/* Firefox */
		@supports (scrollbar-width: thin) {
			.scrollable-main {
				scrollbar-width: thin;
				scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
			}
		}
	}

	/* Mobile - hide scrollbar completely */
	@media (max-width: 767px) {
		.scrollable-main::-webkit-scrollbar {
			display: none;
		}

		.scrollable-main {
			-ms-overflow-style: none; /* IE and Edge */
			scrollbar-width: none; /* Firefox */
		}
	}
</style>
