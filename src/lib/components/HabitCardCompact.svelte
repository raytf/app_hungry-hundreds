<script lang="ts">
	import { goto } from '$app/navigation';
	import { habits, type HabitWithStatus } from '$lib/stores/habits';
	import { buttonSpring, celebrate } from '$lib/animations/transitions';
	import { triggerMonsterHappy } from '$lib/stores/monster';

	interface Props {
		habit: HabitWithStatus;
		/** Callback when habit is completed (not uncompleted) */
		onComplete?: () => void;
	}

	let { habit, onComplete }: Props = $props();

	// Completion type states
	const isFullyCompleted = $derived(habit.completionType === 'full');
	const isPartiallyCompleted = $derived(habit.completionType === 'partial');
	const hasAnyCompletion = $derived(habit.completionType !== null);

	// Check if this is a weekly habit
	const isWeekly = $derived(habit.frequencyType === 'weekly');

	function handleToggle(event: MouseEvent) {
		// Stop propagation so card click doesn't fire
		event.stopPropagation();

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

			// Trigger monster happy animation when completing (not uncompleting)
			if (!habit.completedToday) {
				triggerMonsterHappy();
				// Also trigger optional callback if provided
				if (onComplete) {
					onComplete();
				}
			}

			habits.toggle(habit.id);
		}
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
	class="card flex w-full cursor-pointer items-center gap-4 overflow-hidden text-left transition-all hover:shadow-md active:scale-[0.99]"
	class:ring-2={hasAnyCompletion}
	class:ring-hungry-500={isFullyCompleted}
	class:ring-amber-400={isPartiallyCompleted}
	class:bg-hungry-50={isFullyCompleted}
	class:bg-amber-50={isPartiallyCompleted}
	role="link"
	tabindex="0"
>
	<!-- Habit emoji indicator -->
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

	<!-- Habit name -->
	<p
		class="min-w-0 flex-1 truncate font-medium"
		class:line-through={isFullyCompleted}
		class:text-gray-500={isFullyCompleted}
		class:text-amber-700={isPartiallyCompleted}
		title={habit.name}
	>
		{habit.name}
	</p>

	<!-- Streak badge or weekly progress -->
	{#if isWeekly}
		<!-- Weekly progress: show X/Y this week -->
		<div
			class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium"
			class:bg-green-100={habit.periodProgress >= habit.periodTarget}
			class:text-green-600={habit.periodProgress >= habit.periodTarget}
			class:bg-blue-100={habit.periodProgress > 0 && habit.periodProgress < habit.periodTarget}
			class:text-blue-600={habit.periodProgress > 0 && habit.periodProgress < habit.periodTarget}
			class:bg-gray-100={habit.periodProgress === 0}
			class:text-gray-500={habit.periodProgress === 0}
			aria-label="This week: {habit.periodProgress} of {habit.periodTarget}"
		>
			<span>{habit.periodProgress}/{habit.periodTarget}</span>
		</div>
	{:else}
		<!-- Daily habit: show streak -->
		<div
			class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium"
			class:bg-orange-100={habit.streak > 0}
			class:text-orange-600={habit.streak > 0}
			class:bg-gray-100={habit.streak === 0}
			class:text-gray-500={habit.streak === 0}
			aria-label="Streak: {habit.streak}"
		>
			{#if habit.streak > 0}
				<span>🔥</span>
			{/if}
			<span>{habit.streak}</span>
		</div>
	{/if}

	<!-- Complete button -->
	<button
		type="button"
		onclick={handleToggle}
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-semibold transition-all active:scale-95"
		class:bg-hungry-500={!isFullyCompleted}
		class:text-white={!isFullyCompleted}
		class:bg-gray-200={isFullyCompleted}
		class:text-gray-500={isFullyCompleted}
		aria-label={isFullyCompleted
			? `Mark ${habit.name} as incomplete`
			: `Mark ${habit.name} as complete`}
	>
		{#if isFullyCompleted}
			<span>✓</span>
		{:else}
			<span>○</span>
		{/if}
	</button>
</div>
