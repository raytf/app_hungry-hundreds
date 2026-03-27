<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Header from '$lib/components/Header.svelte';
	import { habits, habitsLoaded, sortedHabits } from '$lib/stores/habits';
	import { monsterSetExpression } from '$lib/stores/monster';
	import { browser } from '$app/environment';

	// Get habit ID from URL params
	const habitId = $derived(parseInt(page.params.id ?? '', 10));

	// Find the habit by ID (with status)
	const habit = $derived($sortedHabits.find((h) => h.id === habitId));

	// Computed states
	const isFullyCompleted = $derived(habit?.completionType === 'full');
	const isPartiallyCompleted = $derived(habit?.completionType === 'partial');

	// Frequency description
	const frequencyDescription = $derived(() => {
		if (!habit) return '';
		if (habit.schedule?.type === 'every-x-days') {
			return `Every ${habit.schedule.intervalDays} days`;
		}
		if (habit.frequencyType === 'weekly' || habit.schedule?.type === 'weekly') {
			return `${habit.frequencyTarget}x per week`;
		} else if ((habit.frequencyTarget ?? 1) > 1) {
			return `${habit.frequencyTarget}x per day`;
		}
		return 'Daily';
	});

	// Countdown label for interval habits
	const dueLabelDetail = $derived(() => {
		if (habit?.schedule?.type !== 'every-x-days') return '';
		const d = habit?.dueInDays;
		if (d === undefined) return '';
		if (d > 0) return `Due in ${d} day${d !== 1 ? 's' : ''}`;
		if (d === 0) return 'Due today';
		return `Overdue by ${Math.abs(d)} day${Math.abs(d) !== 1 ? 's' : ''}`;
	});

	// Timeout for reverting monster expression
	let expressionTimeout: ReturnType<typeof setTimeout> | null = null;

	// Delete confirmation state
	let showDeleteConfirm = $state(false);
	let isDeleting = $state(false);

	async function handleFullComplete() {
		if (habit?.id !== undefined) {
			const wasCompleted = habit.completionType === 'full';
			await habits.toggle(habit.id);
			// Trigger monster excited expression when completing (not uncompleting)
			if (!wasCompleted) {
				if (expressionTimeout) clearTimeout(expressionTimeout);
				monsterSetExpression('excited');
				expressionTimeout = setTimeout(() => {
					monsterSetExpression('normal');
					expressionTimeout = null;
				}, 2000);
			}
		}
	}

	async function handlePartialComplete() {
		if (habit?.id !== undefined) {
			const wasPartiallyCompleted = habit.completionType === 'partial';
			await habits.togglePartial(habit.id);
			// Trigger monster excited expression when completing (not uncompleting)
			if (!wasPartiallyCompleted) {
				if (expressionTimeout) clearTimeout(expressionTimeout);
				monsterSetExpression('excited');
				expressionTimeout = setTimeout(() => {
					monsterSetExpression('normal');
					expressionTimeout = null;
				}, 2000);
			}
		}
	}

	async function handleDelete() {
		if (habit?.id !== undefined) {
			isDeleting = true;
			await habits.remove(habit.id);
			goto(resolve('/'));
		}
	}
</script>

<svelte:head>
	<title>{habit ? habit.name : 'Habit Detail'} | Hungry Hundreds</title>
</svelte:head>

<Header title="Habit Details" showBack />

<main class="page-container pt-4">
	{#if !browser || !$habitsLoaded}
		<!-- Loading state -->
		<div class="card py-12 text-center">
			<div
				class="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-hungry-500 border-t-transparent"
			></div>
			<p class="text-gray-500">Loading...</p>
		</div>
	{:else if !habit}
		<!-- Habit not found -->
		<div class="card py-12 text-center">
			<p class="mb-2 text-5xl">🔍</p>
			<h3 class="mb-2 text-lg font-semibold text-gray-800">Habit not found</h3>
			<p class="mb-4 text-gray-500">The habit you're looking for doesn't exist.</p>
			<a href={resolve('/')} class="btn-primary inline-block">Back to Home</a>
		</div>
	{:else}
		<!-- Habit Header -->
		<div class="card mb-4 flex items-center gap-4">
			<div
				class="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
				style="background-color: {habit.color}20"
			>
				{habit.emoji}
			</div>
			<div class="flex-1">
				<h1 class="text-xl font-bold text-gray-900">{habit.name}</h1>
				<p class="text-sm text-gray-500">{frequencyDescription()}</p>
			</div>
			<a
				href={resolve(`/habits/${habit.id}/edit`)}
				class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
				aria-label="Edit habit"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke-width="1.5"
					stroke="currentColor"
					class="h-5 w-5"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
					/>
				</svg>
			</a>
		</div>

		<!-- Stats Section -->
		<div class="card mb-4">
			<h2 class="mb-3 font-semibold text-gray-700">Statistics</h2>
			<div class="grid grid-cols-2 gap-4">
				<div class="rounded-xl bg-orange-50 p-3 text-center">
					<p class="text-2xl font-bold text-orange-600">🔥 {habit.streak}</p>
					<p class="text-sm text-orange-700">
						{habit.schedule?.type === 'every-x-days'
							? 'Interval Streak'
							: habit.frequencyType === 'weekly'
								? 'Week Streak'
								: 'Day Streak'}
					</p>
				</div>
				<div class="rounded-xl bg-blue-50 p-3 text-center">
					<p class="text-2xl font-bold text-blue-600">{habit.totalCompletions}</p>
					<p class="text-sm text-blue-700">Total Completions</p>
				</div>
				{#if habit.schedule?.type === 'every-x-days'}
					<div
						class="col-span-2 rounded-xl p-3 text-center"
						class:bg-green-50={habit.completedToday}
						class:bg-blue-50={!habit.completedToday && (habit.dueInDays ?? 0) >= 0}
						class:bg-red-50={!habit.completedToday && (habit.dueInDays ?? 0) < 0}
					>
						<p
							class="text-2xl font-bold"
							class:text-green-600={habit.completedToday}
							class:text-blue-600={!habit.completedToday && (habit.dueInDays ?? 0) >= 0}
							class:text-red-500={!habit.completedToday && (habit.dueInDays ?? 0) < 0}
						>
							{habit.completedToday ? '✓ Done' : dueLabelDetail()}
						</p>
						<p
							class="text-sm"
							class:text-green-700={habit.completedToday}
							class:text-blue-700={!habit.completedToday && (habit.dueInDays ?? 0) >= 0}
							class:text-red-600={!habit.completedToday && (habit.dueInDays ?? 0) < 0}
						>
							{habit.completedToday
								? `Next due in ${habit.dueInDays} day${habit.dueInDays !== 1 ? 's' : ''}`
								: 'Current Interval'}
						</p>
					</div>
				{:else}
					<div class="col-span-2 rounded-xl bg-green-50 p-3 text-center">
						<p class="text-2xl font-bold text-green-600">
							{habit.periodProgress}/{habit.periodTarget}
						</p>
						<p class="text-sm text-green-700">
							{habit.frequencyType === 'weekly' ? 'This Week' : 'Today'}
						</p>
					</div>
				{/if}
			</div>
			{#if habit.reminderTime}
				<div class="mt-4 flex items-center gap-2 text-gray-600">
					<span>⏰</span>
					<span>Reminder at {habit.reminderTime}</span>
				</div>
			{/if}
		</div>

		<!-- Partial Completion Section -->
		{#if habit.partialCriteria}
			<div class="card mb-4">
				<h2 class="mb-2 font-semibold text-gray-700">Partial Completion</h2>
				<p class="mb-3 rounded-lg bg-amber-50 p-3 text-amber-800">
					"{habit.partialCriteria}"
				</p>
				<button
					type="button"
					onclick={handlePartialComplete}
					disabled={isFullyCompleted}
					class="w-full rounded-xl py-3 font-semibold transition-all"
					class:bg-amber-500={!isPartiallyCompleted && !isFullyCompleted}
					class:text-white={!isPartiallyCompleted && !isFullyCompleted}
					class:hover:bg-amber-600={!isPartiallyCompleted && !isFullyCompleted}
					class:bg-amber-100={isPartiallyCompleted}
					class:text-amber-700={isPartiallyCompleted}
					class:bg-gray-100={isFullyCompleted}
					class:text-gray-400={isFullyCompleted}
					class:cursor-not-allowed={isFullyCompleted}
				>
					{#if isPartiallyCompleted}
						✓ Marked as Partial
					{:else if isFullyCompleted}
						Already Fully Completed
					{:else}
						Mark as Partial
					{/if}
				</button>
			</div>
		{/if}

		<!-- Action Buttons -->
		<div class="space-y-3">
			<button
				type="button"
				onclick={handleFullComplete}
				class="w-full rounded-xl py-4 text-lg font-semibold transition-all"
				class:bg-hungry-500={!isFullyCompleted}
				class:text-white={!isFullyCompleted}
				class:hover:bg-hungry-600={!isFullyCompleted}
				class:bg-green-100={isFullyCompleted}
				class:text-green-700={isFullyCompleted}
			>
				{#if isFullyCompleted}
					{habit.schedule?.type === 'every-x-days'
						? '✓ Completed This Interval'
						: '✓ Completed Today'}
				{:else}
					Mark as Complete
				{/if}
			</button>

			{#if !habit.partialCriteria && !isFullyCompleted}
				<button
					type="button"
					onclick={handlePartialComplete}
					class="w-full rounded-xl py-3 font-semibold transition-all"
					class:bg-amber-100={isPartiallyCompleted}
					class:text-amber-700={isPartiallyCompleted}
					class:bg-gray-100={!isPartiallyCompleted}
					class:text-gray-600={!isPartiallyCompleted}
					class:hover:bg-amber-50={!isPartiallyCompleted}
				>
					{#if isPartiallyCompleted}
						✓ Marked as Partial
					{:else}
						Mark as Partial
					{/if}
				</button>
			{/if}
		</div>

		<!-- Delete Section -->
		<div class="mt-8 border-t pt-6">
			{#if showDeleteConfirm}
				<div class="rounded-xl bg-red-50 p-4">
					<p class="mb-3 text-center text-red-700">
						Are you sure you want to delete this habit? This cannot be undone.
					</p>
					<div class="flex gap-3">
						<button
							type="button"
							onclick={() => (showDeleteConfirm = false)}
							class="flex-1 rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 hover:bg-gray-300"
						>
							Cancel
						</button>
						<button
							type="button"
							onclick={handleDelete}
							disabled={isDeleting}
							class="flex-1 rounded-xl bg-red-500 py-3 font-semibold text-white hover:bg-red-600 disabled:opacity-50"
						>
							{isDeleting ? 'Deleting...' : 'Delete'}
						</button>
					</div>
				</div>
			{:else}
				<button
					type="button"
					onclick={() => (showDeleteConfirm = true)}
					class="w-full rounded-xl bg-red-50 py-3 font-semibold text-red-600 hover:bg-red-100"
				>
					Delete Habit
				</button>
			{/if}
		</div>
	{/if}
</main>
