<script lang="ts">
	import { habitColors, habitEmojis } from '$lib/data/mockData';

	interface Props {
		onsubmit: (habit: {
			name: string;
			emoji: string;
			color: string;
			reminderTime: string | null;
		}) => void;
	}

	let { onsubmit }: Props = $props();

	// Form state
	let name = $state('');
	let emoji = $state(habitEmojis[0]);
	let color = $state(habitColors[0]);
	let reminderTime = $state('');

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!name.trim()) return;

		onsubmit({
			name: name.trim(),
			emoji,
			color,
			reminderTime: reminderTime || null
		});
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<!-- Habit Name -->
	<div>
		<label for="habit-name" class="mb-2 block text-sm font-medium text-gray-700">Habit Name</label>
		<input
			id="habit-name"
			bind:value={name}
			placeholder="e.g., Morning Run"
			required
			class="input-field"
		/>
	</div>

	<!-- Icon Selection -->
	<fieldset>
		<legend class="mb-2 block text-sm font-medium text-gray-700">Icon</legend>
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Select habit icon">
			{#each habitEmojis as e}
				<button
					type="button"
					onclick={() => (emoji = e)}
					class="flex h-12 w-12 items-center justify-center rounded-xl text-2xl transition-all"
					class:bg-hungry-100={emoji === e}
					class:ring-2={emoji === e}
					class:ring-hungry-500={emoji === e}
					class:bg-gray-100={emoji !== e}
					aria-label={`Select ${e} emoji`}
					aria-pressed={emoji === e}
				>
					{e}
				</button>
			{/each}
		</div>
	</fieldset>

	<!-- Color Selection -->
	<fieldset>
		<legend class="mb-2 block text-sm font-medium text-gray-700">Color</legend>
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Select habit color">
			{#each habitColors as c}
				<button
					type="button"
					onclick={() => (color = c)}
					class="h-10 w-10 rounded-xl transition-transform hover:scale-110"
					class:ring-2={color === c}
					class:ring-offset-2={color === c}
					class:ring-gray-400={color === c}
					style="background-color: {c}"
					aria-label={`Select color ${c}`}
					aria-pressed={color === c}
				></button>
			{/each}
		</div>
	</fieldset>

	<!-- Reminder Time -->
	<div>
		<label for="reminder-time" class="mb-2 block text-sm font-medium text-gray-700">
			Reminder Time <span class="text-gray-400">(optional)</span>
		</label>
		<input id="reminder-time" type="time" bind:value={reminderTime} class="input-field" />
	</div>

	<!-- Preview -->
	<div>
		<p class="mb-2 block text-sm font-medium text-gray-700">Preview</p>
		<div class="card flex items-center gap-4">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-xl"
				style="background-color: {color}20"
			>
				<span class="text-lg">{emoji}</span>
			</div>
			<div class="flex-1">
				<p class="font-medium">{name || 'New Habit'}</p>
				{#if reminderTime}
					<p class="text-sm text-gray-400">{reminderTime}</p>
				{/if}
			</div>
			<div class="rounded-lg bg-gray-100 px-2 py-1 text-sm font-medium text-gray-500">0</div>
		</div>
	</div>

	<!-- Submit Button -->
	<button type="submit" class="btn-primary w-full" disabled={!name.trim()}> Create Habit </button>
</form>
