<script lang="ts">
	import { habits, type HabitWithStatus } from '$lib/stores/habits';
	import { buttonSpring, celebrate } from '$lib/animations/transitions';

	interface Props {
		habit: HabitWithStatus;
		/** Show edit button on the card */
		showEdit?: boolean;
		/** Callback when habit is completed (not uncompleted) */
		onComplete?: () => void;
	}

	let { habit, showEdit = false, onComplete }: Props = $props();

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

	function handleToggle(event: MouseEvent) {
		if (habit.id !== undefined) {
			// Animate the button
			const target = event.currentTarget as HTMLElement;
			buttonSpring(target);

			// Check for milestone celebration (7 or 30 day streak)
			const newStreak = habit.completedToday ? habit.streak - 1 : habit.streak + 1;
			if (!habit.completedToday && (newStreak === 7 || newStreak === 30 || newStreak === 100)) {
				// Delay celebration slightly for better effect
				setTimeout(() => celebrate(target), 200);
			}

			// Trigger onComplete callback when completing (not uncompleting)
			if (!habit.completedToday && onComplete) {
				onComplete();
			}

			habits.toggle(habit.id);
		}
	}

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
		// Prevent the toggle from firing when clicking edit
		e.stopPropagation();
	}
</script>

<div
	class="card flex w-full items-center gap-4 overflow-hidden transition-all"
	class:ring-2={hasAnyCompletion}
	class:ring-hungry-500={isFullyCompleted}
	class:ring-amber-400={isPartiallyCompleted}
	class:bg-hungry-50={isFullyCompleted}
	class:bg-amber-50={isPartiallyCompleted}
>
	<!-- Toggle button area (full completion) -->
	<button
		type="button"
		onclick={handleToggle}
		class="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left active:scale-[0.98]"
		aria-label={isFullyCompleted
			? `Mark ${habit.name} as incomplete`
			: `Mark ${habit.name} as fully complete`}
	>
		<!-- Toggle indicator -->
		<div
			class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform"
			style="background-color: {isFullyCompleted
				? habit.color
				: isPartiallyCompleted
					? habit.color + '70'
					: habit.color + '20'}"
		>
			{#if isFullyCompleted}
				<span class="text-lg text-white">✓</span>
			{:else if isPartiallyCompleted}
				<span class="text-lg text-white">½</span>
			{:else}
				<span class="text-lg">{habit.emoji}</span>
			{/if}
		</div>

		<!-- Habit info -->
		<div class="min-w-0 flex-1">
			<p
				class="truncate font-medium"
				class:line-through={isFullyCompleted}
				class:text-gray-500={isFullyCompleted}
				class:text-amber-700={isPartiallyCompleted}
				title={habit.name}
			>
				{habit.name}
			</p>
			<!-- Subtitle: reminder time for single-daily, frequency for multi-daily/weekly -->
			{#if isWeekly}
				<p class="text-sm text-gray-400">{habit.frequencyTarget}x per week</p>
			{:else if isMultiDaily}
				<p class="text-sm text-gray-400">{habit.frequencyTarget}x per day</p>
			{:else if isPartiallyCompleted}
				<p class="text-sm text-amber-600">Partially completed</p>
			{:else if habit.reminderTime}
				<p class="text-sm text-gray-400">{habit.reminderTime}</p>
			{/if}
		</div>
	</button>

	<!-- ============================================================ -->
	<!-- METRICS AREA: Different layout for daily vs weekly habits    -->
	<!-- ============================================================ -->

	{#if isWeekly}
		<!-- WEEKLY HABIT: Stacked metrics -->
		<div class="flex flex-col items-end gap-0.5">
			<!-- Row 1: Current week progress (PRIMARY) -->
			<div
				class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-semibold"
				class:bg-green-100={weeklyTargetMet}
				class:text-green-700={weeklyTargetMet}
				class:bg-blue-100={!weeklyTargetMet}
				class:text-blue-700={!weeklyTargetMet}
				aria-label="Weekly progress: {habit.periodProgress} of {habit.periodTarget} completed this week"
			>
				<span>{habit.periodProgress}/{habit.periodTarget}</span>
				<span class="text-xs font-normal opacity-75">this week</span>
			</div>

			<!-- Row 2: Consecutive weeks streak -->
			<div
				class="flex items-center gap-1 text-xs"
				class:text-orange-600={habit.streak > 0}
				class:text-gray-400={habit.streak === 0}
				aria-label="Streak: {habit.streak} consecutive weeks"
			>
				<span>{habit.streak > 0 ? '📅' : ''}</span>
				<span class="font-medium">{habit.streak}</span>
				<span>week{habit.streak !== 1 ? 's' : ''}</span>
			</div>

			<!-- Row 3: Lifetime total days (secondary) -->
			<div
				class="text-xs text-gray-400"
				aria-label="Total: {habit.totalCompletions} days completed all time"
			>
				{habit.totalCompletions} total
			</div>
		</div>
	{:else if isMultiDaily}
		<!-- MULTI-COMPLETION DAILY HABIT: Progress today + streak -->
		<div class="flex flex-col items-end gap-0.5">
			<!-- Row 1: Today's progress (PRIMARY) -->
			<div
				class="flex items-center gap-1 rounded-lg px-2 py-0.5 text-sm font-semibold"
				class:bg-green-100={dailyTargetMet}
				class:text-green-700={dailyTargetMet}
				class:bg-blue-100={!dailyTargetMet}
				class:text-blue-700={!dailyTargetMet}
				aria-label="Daily progress: {habit.periodProgress} of {habit.periodTarget} completed today"
			>
				<span>{habit.periodProgress}/{habit.periodTarget}</span>
				<span class="text-xs font-normal opacity-75">today</span>
			</div>

			<!-- Row 2: Consecutive days streak -->
			<div
				class="flex items-center gap-1 text-xs"
				class:text-orange-600={habit.streak > 0}
				class:text-gray-400={habit.streak === 0}
				aria-label="Streak: {habit.streak} consecutive days"
			>
				<span>{habit.streak > 0 ? '🔥' : ''}</span>
				<span class="font-medium">{habit.streak}</span>
				<span>day{habit.streak !== 1 ? 's' : ''}</span>
			</div>

			<!-- Row 3: Lifetime total completions (secondary) -->
			<div
				class="text-xs text-gray-400"
				aria-label="Total: {habit.totalCompletions} completions all time"
			>
				{habit.totalCompletions} total
			</div>
		</div>
	{:else}
		<!-- SINGLE-COMPLETION DAILY HABIT: Simple streak badge (existing behavior) -->
		<div
			class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium"
			class:bg-orange-100={habit.streak > 0}
			class:text-orange-600={habit.streak > 0}
			class:bg-gray-100={habit.streak === 0}
			class:text-gray-500={habit.streak === 0}
			aria-label="Streak: {habit.streak} consecutive days"
		>
			{#if habit.streak > 0}
				<span>🔥</span>
			{/if}
			<span>{habit.streak}</span>
			<span class="text-xs font-normal opacity-75">day{habit.streak !== 1 ? 's' : ''}</span>
		</div>
	{/if}

	<!-- Partial completion button (for single-daily habits when not fully completed) -->
	{#if !isMultiDaily && !isWeekly && habit.id !== undefined && !isFullyCompleted}
		<button
			type="button"
			onclick={handlePartialToggle}
			class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
			class:bg-amber-100={isPartiallyCompleted}
			class:text-amber-600={isPartiallyCompleted}
			class:text-gray-400={!isPartiallyCompleted}
			class:hover:bg-amber-50={!isPartiallyCompleted}
			class:hover:text-amber-500={!isPartiallyCompleted}
			aria-label={isPartiallyCompleted
				? `Remove partial completion for ${habit.name}`
				: `Mark ${habit.name} as partially complete`}
			title={isPartiallyCompleted ? 'Partial (tap main button for full)' : 'Mark as partial'}
		>
			<span class="text-lg">½</span>
		</button>
	{/if}

	<!-- Edit button -->
	{#if showEdit && habit.id !== undefined}
		<a
			href="/habits/{habit.id}/edit"
			onclick={handleEditClick}
			class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
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
