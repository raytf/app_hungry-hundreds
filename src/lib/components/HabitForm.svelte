<script lang="ts">
	import { untrack } from 'svelte';
	import { habitColors, habitEmojis } from '$lib/data/mockData';
	import type { FrequencyType } from '$lib/db';

	interface HabitFormData {
		name: string;
		emoji: string;
		color: string;
		reminderTime: string | null;
		frequencyType: FrequencyType;
		frequencyTarget: number;
	}

	interface Props {
		onsubmit: (habit: HabitFormData) => void;
		/** Initial name for editing an existing habit */
		initialName?: string;
		/** Initial emoji for editing an existing habit */
		initialEmoji?: string;
		/** Initial color for editing an existing habit */
		initialColor?: string;
		/** Initial reminder time for editing an existing habit */
		initialReminderTime?: string | null;
		/** Initial frequency type for editing an existing habit */
		initialFrequencyType?: FrequencyType;
		/** Initial frequency target for editing an existing habit */
		initialFrequencyTarget?: number;
		/** Mode determines button text: 'create' or 'edit' */
		mode?: 'create' | 'edit';
		/** Whether the form is submitting (shows loading state) */
		isSubmitting?: boolean;
	}

	let {
		onsubmit,
		initialName = '',
		initialEmoji = habitEmojis[0],
		initialColor = habitColors[0],
		initialReminderTime = '',
		initialFrequencyType = 'daily' as FrequencyType,
		initialFrequencyTarget = 1,
		mode = 'create',
		isSubmitting = false
	}: Props = $props();

	// Form state - initialized from props (intentionally non-reactive after mount)
	// Using untrack() to explicitly signal these are initial values only
	let name = $state(untrack(() => initialName));
	let emoji = $state(untrack(() => initialEmoji));
	let color = $state(untrack(() => initialColor));
	let reminderTime = $state(untrack(() => initialReminderTime ?? ''));
	let frequencyType = $state<FrequencyType>(untrack(() => initialFrequencyType));
	let frequencyTarget = $state(untrack(() => initialFrequencyTarget));

	// Options for daily frequency target (1-10 times per day)
	const dailyTargetOptions = [
		{ value: 1, label: '1 time per day' },
		{ value: 2, label: '2 times per day' },
		{ value: 3, label: '3 times per day' },
		{ value: 4, label: '4 times per day' },
		{ value: 5, label: '5 times per day' },
		{ value: 6, label: '6 times per day' },
		{ value: 7, label: '7 times per day' },
		{ value: 8, label: '8 times per day' },
		{ value: 9, label: '9 times per day' },
		{ value: 10, label: '10 times per day' }
	];

	// Options for weekly frequency target (1-7 times per week)
	const weeklyTargetOptions = [
		{ value: 1, label: '1 time per week' },
		{ value: 2, label: '2 times per week' },
		{ value: 3, label: '3 times per week' },
		{ value: 4, label: '4 times per week' },
		{ value: 5, label: '5 times per week' },
		{ value: 6, label: '6 times per week' },
		{ value: 7, label: '7 times per week' }
	];

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!name.trim()) return;

		onsubmit({
			name: name.trim(),
			emoji,
			color,
			reminderTime: reminderTime || null,
			frequencyType,
			frequencyTarget
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

	<!-- Frequency Selection -->
	<fieldset>
		<legend class="mb-2 block text-sm font-medium text-gray-700">Frequency</legend>
		<div class="space-y-3">
			<!-- Frequency Type Radio Buttons -->
			<div class="flex gap-4" role="radiogroup" aria-label="Select frequency type">
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="radio"
						name="frequencyType"
						value="daily"
						checked={frequencyType === 'daily'}
						onchange={() => (frequencyType = 'daily')}
						class="h-4 w-4 text-hungry-500 focus:ring-hungry-500"
					/>
					<span class="text-sm">Every day</span>
				</label>
				<label class="flex cursor-pointer items-center gap-2">
					<input
						type="radio"
						name="frequencyType"
						value="weekly"
						checked={frequencyType === 'weekly'}
						onchange={() => (frequencyType = 'weekly')}
						class="h-4 w-4 text-hungry-500 focus:ring-hungry-500"
					/>
					<span class="text-sm">Weekly target</span>
				</label>
			</div>

			<!-- Daily Target Selector (shown when daily is selected) -->
			{#if frequencyType === 'daily'}
				<div class="ml-6">
					<label for="frequency-target-daily" class="mb-1 block text-sm text-gray-600">
						How many times per day?
					</label>
					<select
						id="frequency-target-daily"
						bind:value={frequencyTarget}
						class="input-field w-auto"
					>
						{#each dailyTargetOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Weekly Target Selector (shown when weekly is selected) -->
			{#if frequencyType === 'weekly'}
				<div class="ml-6">
					<label for="frequency-target-weekly" class="mb-1 block text-sm text-gray-600">
						How many times per week?
					</label>
					<select
						id="frequency-target-weekly"
						bind:value={frequencyTarget}
						class="input-field w-auto"
					>
						{#each weeklyTargetOptions as option}
							<option value={option.value}>{option.label}</option>
						{/each}
					</select>
				</div>
			{/if}
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
	<button type="submit" class="btn-primary w-full" disabled={!name.trim() || isSubmitting}>
		{#if isSubmitting}
			<span class="inline-flex items-center gap-2">
				<span class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
				></span>
				{mode === 'edit' ? 'Saving...' : 'Creating...'}
			</span>
		{:else}
			{mode === 'edit' ? 'Save Changes' : 'Create Habit'}
		{/if}
	</button>
</form>
