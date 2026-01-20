<script lang="ts">
	import { habits } from '$lib/stores/habits';
	import { suggestedHabits, type SuggestedHabit } from '$lib/data/suggestedHabits';

	interface Props {
		/** Maximum number of suggestions to display */
		maxSuggestions?: number;
	}

	let { maxSuggestions = 4 }: Props = $props();

	// Track which suggestions are being added (for loading state)
	let addingIds = $state<Set<string>>(new Set());

	// Get a subset of suggestions
	const displayedSuggestions = $derived(suggestedHabits.slice(0, maxSuggestions));

	async function handleAddSuggestion(suggestion: SuggestedHabit) {
		const key = suggestion.name;
		if (addingIds.has(key)) return;

		addingIds = new Set(addingIds).add(key);

		try {
			await habits.add({
				name: suggestion.name,
				emoji: suggestion.emoji,
				color: suggestion.color,
				reminderTime: suggestion.reminderTime
			});
		} finally {
			const newSet = new Set(addingIds);
			newSet.delete(key);
			addingIds = newSet;
		}
	}
</script>

<div class="space-y-4">
	<!-- Header -->
	<div class="text-center">
		<p class="mb-1 text-4xl">🌱</p>
		<h3 class="text-lg font-semibold text-gray-700">Start Your Habit Journey</h3>
		<p class="text-sm text-gray-500">Choose from suggestions or create your own</p>
	</div>

	<!-- Suggestion Cards -->
	<div class="grid grid-cols-2 gap-3">
		{#each displayedSuggestions as suggestion (suggestion.name)}
			{@const isAdding = addingIds.has(suggestion.name)}
			<button
				type="button"
				onclick={() => handleAddSuggestion(suggestion)}
				disabled={isAdding}
				class="card flex flex-col items-center gap-2 p-4 transition-all hover:scale-[1.02] hover:shadow-md active:scale-[0.98] disabled:opacity-50"
			>
				<div
					class="flex h-12 w-12 items-center justify-center rounded-xl text-2xl"
					style="background-color: {suggestion.color}20"
				>
					{#if isAdding}
						<span class="animate-spin">⏳</span>
					{:else}
						{suggestion.emoji}
					{/if}
				</div>
				<span class="text-center text-sm font-medium text-gray-700">{suggestion.name}</span>
				<span class="text-xs text-hungry-600">+ Add</span>
			</button>
		{/each}
	</div>

	<!-- Create Custom Link -->
	<div class="text-center">
		<a
			href="/habits/new"
			class="inline-flex items-center gap-2 text-sm font-medium text-hungry-600 hover:text-hungry-700"
		>
			<span class="text-lg">✨</span>
			Create a custom habit
		</a>
	</div>
</div>

