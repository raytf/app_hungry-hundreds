<script lang="ts">
	import { habits, type HabitWithStatus } from '$lib/stores/habits';

	interface Props {
		habit: HabitWithStatus;
	}

	let { habit }: Props = $props();

	function handleToggle() {
		if (habit.id !== undefined) {
			habits.toggle(habit.id);
		}
	}
</script>

<button
	type="button"
	onclick={handleToggle}
	class="card flex w-full cursor-pointer items-center gap-4 text-left transition-all active:scale-[0.98]"
	class:ring-2={habit.completedToday}
	class:ring-hungry-500={habit.completedToday}
	class:bg-hungry-50={habit.completedToday}
	aria-label={habit.completedToday
		? `Mark ${habit.name} as incomplete`
		: `Mark ${habit.name} as complete`}
>
	<!-- Toggle indicator -->
	<div
		class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform"
		style="background-color: {habit.completedToday ? habit.color : habit.color + '20'}"
	>
		{#if habit.completedToday}
			<span class="text-lg text-white">✓</span>
		{:else}
			<span class="text-lg">{habit.emoji}</span>
		{/if}
	</div>

	<!-- Habit info -->
	<div class="min-w-0 flex-1">
		<p
			class="truncate font-medium"
			class:line-through={habit.completedToday}
			class:text-gray-500={habit.completedToday}
		>
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
</button>
