<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import HabitForm from '$lib/components/HabitForm.svelte';
	import { habits, habitsLoaded } from '$lib/stores/habits';
	import { showToast } from '$lib/stores/toast.svelte';
	import { browser } from '$app/environment';
	// Get habit ID from URL params
	const habitId = $derived(parseInt(page.params.id ?? '', 10));

	// Find the habit by ID
	const habit = $derived($habits.find((h) => h.id === habitId));

	// Form submission state
	let isSubmitting = $state(false);
	let error = $state<string | null>(null);
	const hasPendingIntervalChange = $derived(
		habit?.schedule?.type === 'every-x-days' && habit.pendingIntervalDays !== undefined
	);

	import type { HabitSchedule } from '$lib/db/db';

	async function handleSubmit(data: {
		name: string;
		emoji: string;
		color: string;
		reminderTime: string | null;
		schedule: HabitSchedule;
	}) {
		if (!habit?.id) return;

		isSubmitting = true;
		error = null;

		try {
			await habits.edit(habit.id, {
				name: data.name,
				emoji: data.emoji,
				color: data.color,
				reminderTime: data.reminderTime ?? undefined,
				schedule: data.schedule
			});
			goto(resolve('/habits'));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update habit';
			isSubmitting = false;
		}
	}

	async function handleApplyNow() {
		if (!habit?.id || habit.pendingIntervalDays === undefined) return;

		isSubmitting = true;
		error = null;

		try {
			const nextInterval = habit.pendingIntervalDays;
			await habits.applyIntervalNow(habit.id);
			showToast(`Interval change applied: every ${nextInterval} days`);
			goto(resolve(`/habits/${habit.id}`));
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to apply interval change';
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>{habit ? `Edit ${habit.name}` : 'Edit Habit'} | Hungry Hundreds</title>
</svelte:head>

<Header title="Edit Habit" showBack />

<main class="page-container pt-4">
	{#if !browser || !$habitsLoaded}
		<!-- SSR fallback or loading state -->
		<div class="card py-12 text-center">
			<div
				class="border-hungry-500 mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
			></div>
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if !habit}
		<!-- Habit not found -->
		<div class="card py-12 text-center">
			<p class="mb-2 text-5xl">🔍</p>
			<h3 class="mb-2 text-lg font-semibold text-gray-800">Habit not found</h3>
			<p class="mb-4 text-gray-500">The habit you're looking for doesn't exist.</p>
			<a href={resolve('/habits')} class="btn-primary inline-block">Back to Habits</a>
		</div>
	{:else}
		{#if hasPendingIntervalChange}
			<div class="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
				<p class="text-sm font-medium">
					⏳ A change to every {habit.pendingIntervalDays} days is pending. It will take effect after
					your next completion.
				</p>
				<button
					type="button"
					onclick={handleApplyNow}
					disabled={isSubmitting}
					class="mt-2 text-xs font-semibold underline disabled:opacity-50"
				>
					Apply now and restart interval instead
				</button>
			</div>
		{/if}

		<p class="mb-6 text-gray-600">Update your habit details below.</p>

		{#if error}
			<div class="mb-4 rounded-xl bg-red-50 p-4 text-red-600">
				<p class="font-medium">Error</p>
				<p class="text-sm">{error}</p>
			</div>
		{/if}

		<HabitForm
			onsubmit={handleSubmit}
			initialName={habit.name}
			initialEmoji={habit.emoji}
			initialColor={habit.color}
			initialReminderTime={habit.reminderTime ?? null}
			initialSchedule={habit.schedule}
			mode="edit"
			{isSubmitting}
		/>
	{/if}
</main>
