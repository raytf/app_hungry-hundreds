<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Header from '$lib/components/Header.svelte';
	import HabitForm from '$lib/components/HabitForm.svelte';
	import { habits } from '$lib/stores/habits';
	import { browser } from '$app/environment';

	// Get habit ID from URL params
	const habitId = $derived(parseInt(page.params.id, 10));

	// Find the habit by ID
	const habit = $derived($habits.find((h) => h.id === habitId));

	// Form submission state
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);

	async function handleSubmit(data: {
		name: string;
		emoji: string;
		color: string;
		reminderTime: string | null;
	}) {
		if (!habit?.id) return;

		isSubmitting = true;
		error = null;

		try {
			await habits.edit(habit.id, {
				name: data.name,
				emoji: data.emoji,
				color: data.color,
				reminderTime: data.reminderTime ?? undefined
			});
			goto('/habits');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update habit';
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>{habit ? `Edit ${habit.name}` : 'Edit Habit'} | Hungry Hundreds</title>
</svelte:head>

<Header title="Edit Habit" showBack />

<main class="page-container pt-4">
	{#if !browser}
		<!-- SSR fallback -->
		<div class="card py-12 text-center">
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if !habit}
		<!-- Habit not found -->
		<div class="card py-12 text-center">
			<p class="mb-2 text-5xl">🔍</p>
			<h3 class="mb-2 text-lg font-semibold text-gray-800">Habit not found</h3>
			<p class="mb-4 text-gray-500">The habit you're looking for doesn't exist.</p>
			<a href="/habits" class="btn-primary inline-block">Back to Habits</a>
		</div>
	{:else}
		<p class="mb-6 text-gray-600">Update your habit details below.</p>

		{#if error}
			<div class="mb-4 rounded-xl bg-red-50 p-4 text-red-600">
				<p class="font-medium">Error</p>
				<p class="text-sm">{error}</p>
			</div>
		{/if}

		<HabitForm
			onsubmit={handleSubmit}
			initialValues={{
				name: habit.name,
				emoji: habit.emoji,
				color: habit.color,
				reminderTime: habit.reminderTime ?? null
			}}
			mode="edit"
			{isSubmitting}
		/>
	{/if}
</main>
