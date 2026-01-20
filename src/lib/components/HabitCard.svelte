<script lang="ts">
	import { habits, type HabitWithStatus } from '$lib/stores/habits';

	interface Props {
		habit: HabitWithStatus;
		/** Show edit button on the card */
		showEdit?: boolean;
	}

	let { habit, showEdit = false }: Props = $props();

	function handleToggle() {
		if (habit.id !== undefined) {
			habits.toggle(habit.id);
		}
	}

	function handleEditClick(e: MouseEvent) {
		// Prevent the toggle from firing when clicking edit
		e.stopPropagation();
	}
</script>

<div
	class="card flex w-full items-center gap-4 transition-all"
	class:ring-2={habit.completedToday}
	class:ring-hungry-500={habit.completedToday}
	class:bg-hungry-50={habit.completedToday}
>
	<!-- Toggle button area -->
	<button
		type="button"
		onclick={handleToggle}
		class="flex flex-1 cursor-pointer items-center gap-4 text-left active:scale-[0.98]"
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
	</button>

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
