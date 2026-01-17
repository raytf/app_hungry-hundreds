<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import HabitCard from '$lib/components/HabitCard.svelte';
	import { habits } from '$lib/stores/habits';
</script>

<svelte:head>
	<title>All Habits | Hungry Hundreds</title>
</svelte:head>

<Header title="All Habits" showSyncStatus>
	{#snippet right()}
		<a
			href="/habits/new"
			class="rounded-lg bg-hungry-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-hungry-600"
		>
			+ New
		</a>
	{/snippet}
</Header>

<main class="page-container pt-4">
	<!-- Stats summary -->
	<section class="card mb-6">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm text-gray-500">Total Habits</p>
				<p class="text-2xl font-bold text-gray-900">{$habits.length}</p>
			</div>
			<div class="text-right">
				<p class="text-sm text-gray-500">Total Streak Days</p>
				<p class="text-2xl font-bold text-orange-500">
					🔥 {$habits.reduce((sum, h) => sum + h.streak, 0)}
				</p>
			</div>
		</div>
	</section>

	<!-- Habits List -->
	<section>
		<h3 class="mb-3 font-semibold text-gray-700">Manage Your Habits</h3>

		{#if $habits.length === 0}
			<div class="card py-12 text-center">
				<p class="mb-2 text-5xl">🌱</p>
				<h3 class="mb-2 text-lg font-semibold text-gray-800">No habits yet</h3>
				<p class="mb-4 text-gray-500">Start building better habits today!</p>
				<a href="/habits/new" class="btn-primary inline-block">Create Your First Habit</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each $habits as habit (habit.id)}
					<HabitCard {habit} />
				{/each}
			</div>

			<!-- Quick actions -->
			<div class="mt-6 text-center">
				<a
					href="/habits/new"
					class="inline-flex items-center gap-2 text-hungry-600 hover:text-hungry-700"
				>
					<span class="text-xl">+</span>
					<span class="font-medium">Add another habit</span>
				</a>
			</div>
		{/if}
	</section>
</main>
