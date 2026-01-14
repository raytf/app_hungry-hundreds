<script lang="ts">
	import { habits } from '$lib/stores/habits';
	import type { Habit } from '$lib/data/mockData';

	interface Props {
		habit: Habit;
	}

	let { habit }: Props = $props();

	function handleToggle() {
		habits.toggle(habit.id);
	}
</script>

<div
	class="card flex items-center gap-4 transition-all"
	class:ring-2={habit.completedToday}
	class:ring-hungry-500={habit.completedToday}
	class:bg-hungry-50={habit.completedToday}
>
	<!-- Toggle button -->
	<button
		onclick={handleToggle}
		class="flex h-10 w-10 items-center justify-center rounded-xl transition-transform active:scale-90"
		style="background-color: {habit.completedToday ? habit.color : habit.color + '20'}"
		aria-label={habit.completedToday ? `Mark ${habit.name} as incomplete` : `Mark ${habit.name} as complete`}
	>
		{#if habit.completedToday}
			<span class="text-lg text-white">✓</span>
		{:else}
			<span class="text-lg">{habit.emoji}</span>
		{/if}
	</button>

	<!-- Habit info -->
	<div class="min-w-0 flex-1">
		<p class="truncate font-medium" class:line-through={habit.completedToday} class:text-gray-500={habit.completedToday}>
			{habit.name}
		</p>
		{#if habit.reminderTime}
			<p class="text-sm text-gray-400">{habit.reminderTime}</p>
		{/if}
	</div>

	<!-- Streak badge -->
	<div
		class="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium"
		class:bg-orange-100={habit.streak > 0}
		class:text-orange-600={habit.streak > 0}
		class:bg-gray-100={habit.streak === 0}
		class:text-gray-500={habit.streak === 0}
	>
		{#if habit.streak > 0}
			<span>🔥</span>
		{/if}
		<span>{habit.streak}</span>
	</div>
</div>

