<script lang="ts">
	import { goto } from '$app/navigation';
	import { habits, type HabitWithStatus } from '$lib/stores/habits';
	import { buttonSpring } from '$lib/animations/transitions';

	interface Props {
		habit: HabitWithStatus;
		/** Show edit button on the card */
		showEdit?: boolean;
	}

	let { habit, showEdit = false }: Props = $props();

	// Determine if this is a weekly frequency habit
	const isWeekly = $derived(habit.frequencyType === 'weekly');

	// Determine if this is a multi-completion daily habit (frequencyTarget > 1)
	const isMultiDaily = $derived(habit.frequencyType === 'daily' && habit.frequencyTarget > 1);

	// Check if target is met for the current period
	const periodTargetMet = $derived(habit.periodProgress >= habit.periodTarget);

	// Check if weekly target is met this week (for weekly habits)
	const weeklyTargetMet = $derived(isWeekly && periodTargetMet);

	// Check if daily target is met today (for multi-daily habits)
	const dailyTargetMet = $derived(isMultiDaily && periodTargetMet);

	// Completion type states
	const isFullyCompleted = $derived(habit.completionType === 'full');
	const isPartiallyCompleted = $derived(habit.completionType === 'partial');
	const hasAnyCompletion = $derived(habit.completionType !== null);

	function handlePartialToggle(event: MouseEvent) {
		event.stopPropagation();
		if (habit.id !== undefined) {
			// Animate the button
			const target = event.currentTarget as HTMLElement;
			buttonSpring(target);

			habits.togglePartial(habit.id);
		}
	}

	function handleEditClick(e: MouseEvent) {
		// Prevent the card navigation from firing when clicking edit
		e.stopPropagation();
	}

	function handleCardClick() {
		if (habit.id !== undefined) {
			goto(`/habits/${habit.id}`);
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	onclick={handleCardClick}
	class="card w-full cursor-pointer overflow-hidden transition-all hover:shadow-md active:scale-[0.99]"
	class:ring-2={hasAnyCompletion}
	class:ring-hungry-500={isFullyCompleted}
	class:ring-amber-400={isPartiallyCompleted}
	class:bg-hungry-50={isFullyCompleted}
	class:bg-amber-50={isPartiallyCompleted}
	role="link"
	tabindex="0"
>
	<!-- Top row: Emoji + Name + Action buttons -->
	<div class="flex items-start gap-3">
		<!-- Habit emoji indicator -->
		<div
			class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl transition-transform"
			style="background-color: {isFullyCompleted
				? habit.color
				: isPartiallyCompleted
					? habit.color + '70'
					: habit.color + '20'}"
		>
			{#if isFullyCompleted}
				<span class="text-xl text-white">✓</span>
			{:else if isPartiallyCompleted}
				<span class="text-xl text-white">½</span>
			{:else}
				<span class="text-xl">{habit.emoji}</span>
			{/if}
		</div>

		<!-- Habit name and frequency -->
		<div class="min-w-0 flex-1">
			<h3
				class="text-lg font-semibold"
				class:line-through={isFullyCompleted}
				class:text-gray-500={isFullyCompleted}
				class:text-amber-700={isPartiallyCompleted}
				class:text-gray-900={!isFullyCompleted && !isPartiallyCompleted}
				title={habit.name}
			>
				{habit.name}
			</h3>
			<!-- Frequency description -->
			{#if isWeekly}
				<p class="text-sm text-gray-500">{habit.frequencyTarget}x per week</p>
			{:else if isMultiDaily}
				<p class="text-sm text-gray-500">{habit.frequencyTarget}x per day</p>
			{:else if isPartiallyCompleted}
				<p class="text-sm text-amber-600">Partially completed</p>
			{:else if habit.reminderTime}
				<p class="text-sm text-gray-500">Reminder: {habit.reminderTime}</p>
			{:else}
				<p class="text-sm text-gray-500">Daily</p>
			{/if}
			{#if habit.partialCriteria}
				<p class="truncate text-xs text-amber-600/70" title={habit.partialCriteria}>
					½ {habit.partialCriteria}
				</p>
			{/if}
		</div>

		<!-- Action buttons (edit + partial) -->
		<div class="flex shrink-0 items-center gap-2">
			<!-- Partial completion button (for single-daily habits when not fully completed) -->
			{#if !isMultiDaily && !isWeekly && habit.id !== undefined && !isFullyCompleted}
				<button
					type="button"
					onclick={handlePartialToggle}
					class="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
					class:bg-amber-100={isPartiallyCompleted}
					class:text-amber-600={isPartiallyCompleted}
					class:text-gray-400={!isPartiallyCompleted}
					class:hover:bg-amber-50={!isPartiallyCompleted}
					class:hover:text-amber-500={!isPartiallyCompleted}
					aria-label={isPartiallyCompleted
						? `Remove partial completion for ${habit.name}`
						: `Mark ${habit.name} as partially complete`}
					title={isPartiallyCompleted ? 'Partial' : 'Mark as partial'}
				>
					<span class="text-lg">½</span>
				</button>
			{/if}

			<!-- Edit button -->
			{#if showEdit && habit.id !== undefined}
				<a
					href="/habits/{habit.id}/edit"
					onclick={handleEditClick}
					class="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
					aria-label="Edit {habit.name}"
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
			{/if}
		</div>
	</div>

	<!-- Bottom row: Metrics in a clean horizontal layout -->
	<div class="mt-3 flex items-center gap-4 border-t pt-3 text-sm">
		{#if isWeekly}
			<!-- Weekly habit metrics -->
			<div class="flex items-center gap-1.5">
				<span
					class="rounded-md px-2 py-1 font-semibold"
					class:bg-green-100={weeklyTargetMet}
					class:text-green-700={weeklyTargetMet}
					class:bg-blue-100={!weeklyTargetMet}
					class:text-blue-700={!weeklyTargetMet}
				>
					{habit.periodProgress}/{habit.periodTarget}
				</span>
				<span class="text-gray-500">this week</span>
			</div>
			<div class="h-4 w-px bg-gray-200"></div>
			<div class="flex items-center gap-1.5">
				<span class="text-orange-600">{habit.streak > 0 ? '📅' : '—'}</span>
				<span class="font-medium text-gray-700">{habit.streak}</span>
				<span class="text-gray-500">week{habit.streak !== 1 ? 's' : ''}</span>
			</div>
			<div class="h-4 w-px bg-gray-200"></div>
			<div class="text-gray-500">{habit.totalCompletions} total</div>
		{:else if isMultiDaily}
			<!-- Multi-daily habit metrics -->
			<div class="flex items-center gap-1.5">
				<span
					class="rounded-md px-2 py-1 font-semibold"
					class:bg-green-100={dailyTargetMet}
					class:text-green-700={dailyTargetMet}
					class:bg-blue-100={!dailyTargetMet}
					class:text-blue-700={!dailyTargetMet}
				>
					{habit.periodProgress}/{habit.periodTarget}
				</span>
				<span class="text-gray-500">today</span>
			</div>
			<div class="h-4 w-px bg-gray-200"></div>
			<div class="flex items-center gap-1.5">
				<span class="text-orange-600">{habit.streak > 0 ? '🔥' : '—'}</span>
				<span class="font-medium text-gray-700">{habit.streak}</span>
				<span class="text-gray-500">day{habit.streak !== 1 ? 's' : ''}</span>
			</div>
			<div class="h-4 w-px bg-gray-200"></div>
			<div class="text-gray-500">{habit.totalCompletions} total</div>
		{:else}
			<!-- Single-daily habit metrics -->
			<div class="flex items-center gap-1.5">
				<span class="text-orange-600">{habit.streak > 0 ? '🔥' : '—'}</span>
				<span class="font-medium text-gray-700">{habit.streak}</span>
				<span class="text-gray-500">day{habit.streak !== 1 ? 's' : ''} streak</span>
			</div>
			<div class="h-4 w-px bg-gray-200"></div>
			<div class="text-gray-500">{habit.totalCompletions} total completions</div>
		{/if}
	</div>
</div>
