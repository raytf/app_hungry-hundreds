<script lang="ts">
	import { goto } from '$app/navigation';
	import Header from '$lib/components/Header.svelte';
	import HabitForm from '$lib/components/HabitForm.svelte';
	import { habits } from '$lib/stores/habits';

	function handleSubmit(habit: {
		name: string;
		emoji: string;
		color: string;
		reminderTime: string | null;
	}) {
		habits.add({
			name: habit.name,
			emoji: habit.emoji,
			color: habit.color,
			reminderTime: habit.reminderTime ?? undefined
		});
		goto('/habits');
	}
</script>

<svelte:head>
	<title>New Habit | Hungry Hundreds</title>
</svelte:head>

<Header title="New Habit" showBack={true} />

<main class="page-container pt-4">
	<section class="mb-6">
		<p class="text-center text-gray-500">Create a new habit to track daily</p>
	</section>

	<HabitForm onsubmit={handleSubmit} />

	<p class="mt-6 text-center text-sm text-gray-400">
		Tip: Start with just 1-3 habits to build consistency
	</p>
</main>
