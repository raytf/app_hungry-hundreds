<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import HabitCard from '$lib/components/HabitCard.svelte';
	import MonsterDisplay from '$lib/components/MonsterDisplay.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import { sortedHabits, todaysProgress } from '$lib/stores/habits';
	import { mockMonster } from '$lib/data/mockData';

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
</script>

<svelte:head>
	<title>Today | Hungry Hundreds</title>
</svelte:head>

<Header title="Today">
	{#snippet right()}
		<ProgressRing pct={$todaysProgress.pct} size={40} />
	{/snippet}
</Header>

<main class="page-container pt-4">
	<!-- Greeting -->
	<section class="mb-6 text-center">
		<h2 class="font-display text-2xl font-bold text-gray-800">{greeting}!</h2>
		<p class="text-sm text-gray-500">{formattedDate}</p>
	</section>

	<!-- Monster Display -->
	<section class="mb-6">
		<MonsterDisplay monster={mockMonster} />
	</section>

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
		<div class="mb-3 flex items-center justify-between">
			<h3 class="font-semibold text-gray-700">Your Habits</h3>
			<a href="/habits/new" class="text-sm font-medium text-hungry-600 hover:text-hungry-700">
				+ Add New
			</a>
		</div>

		{#if $sortedHabits.length === 0}
			<div class="card py-8 text-center">
				<p class="mb-2 text-4xl">🌱</p>
				<p class="text-gray-500">No habits yet!</p>
				<a href="/habits/new" class="btn-primary mt-4 inline-block">Create your first habit</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each $sortedHabits as habit (habit.id)}
					<HabitCard {habit} />
				{/each}
			</div>
		{/if}
	</section>
</main>
