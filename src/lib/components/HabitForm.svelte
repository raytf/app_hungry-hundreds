<script lang="ts">
	import { untrack } from 'svelte';
	import { habitColors, habitEmojis } from '$lib/data/mockData';
	import type { HabitSchedule } from '$lib/db/db';

	interface HabitFormData {
		name: string;
		emoji: string;
		color: string;
		reminderTime: string | null;
		schedule: HabitSchedule;
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
		/** Initial partial completion criteria for editing an existing habit */
		initialPartialCriteria?: string | null;
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
		initialPartialCriteria = '',
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
	let partialCriteria = $state(untrack(() => initialPartialCriteria ?? ''));

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

	// Schedule state
	let scheduleType = $state<HabitSchedule['type']>(initialValues?.schedule?.type ?? 'daily');
	let timesPerWeek = $state(initialValues?.schedule?.timesPerWeek ?? 3);
	let intervalDays = $state(initialValues?.schedule?.intervalDays ?? 2);

	/** Build a validated HabitSchedule from current form state */
	function buildSchedule(): HabitSchedule {
		switch (scheduleType) {
			case 'weekly':
				return { type: 'weekly', timesPerWeek };
			case 'every-x-days':
				return { type: 'every-x-days', intervalDays };
			default:
				return { type: 'daily' };
		}
	}

	/** Human-readable schedule description for the preview */
	const scheduleLabel = $derived.by(() => {
		switch (scheduleType) {
			case 'weekly':
				return `${timesPerWeek}× per week`;
			case 'every-x-days':
				return `Every ${intervalDays} days`;
			default:
				return 'Every day';
		}
	});

	function handleSubmit(e: Event) {
		e.preventDefault();
		if (!name.trim()) return;

		onsubmit({
			name: name.trim(),
			emoji,
			color,
			reminderTime: reminderTime || null,
			schedule: buildSchedule()
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

	<!-- Schedule Type -->
	<fieldset>
		<legend class="mb-2 block text-sm font-medium text-gray-700">Schedule</legend>
		<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Select schedule type">
			<button
				type="button"
				onclick={() => (scheduleType = 'daily')}
				class="rounded-xl px-4 py-2 text-sm font-medium transition-all"
				class:bg-hungry-100={scheduleType === 'daily'}
				class:text-hungry-700={scheduleType === 'daily'}
				class:ring-2={scheduleType === 'daily'}
				class:ring-hungry-500={scheduleType === 'daily'}
				class:bg-gray-100={scheduleType !== 'daily'}
				class:text-gray-600={scheduleType !== 'daily'}
				aria-pressed={scheduleType === 'daily'}
			>
				Daily
			</button>
			<button
				type="button"
				onclick={() => (scheduleType = 'weekly')}
				class="rounded-xl px-4 py-2 text-sm font-medium transition-all"
				class:bg-hungry-100={scheduleType === 'weekly'}
				class:text-hungry-700={scheduleType === 'weekly'}
				class:ring-2={scheduleType === 'weekly'}
				class:ring-hungry-500={scheduleType === 'weekly'}
				class:bg-gray-100={scheduleType !== 'weekly'}
				class:text-gray-600={scheduleType !== 'weekly'}
				aria-pressed={scheduleType === 'weekly'}
			>
				Weekly
			</button>
			<button
				type="button"
				onclick={() => (scheduleType = 'every-x-days')}
				class="rounded-xl px-4 py-2 text-sm font-medium transition-all"
				class:bg-hungry-100={scheduleType === 'every-x-days'}
				class:text-hungry-700={scheduleType === 'every-x-days'}
				class:ring-2={scheduleType === 'every-x-days'}
				class:ring-hungry-500={scheduleType === 'every-x-days'}
				class:bg-gray-100={scheduleType !== 'every-x-days'}
				class:text-gray-600={scheduleType !== 'every-x-days'}
				aria-pressed={scheduleType === 'every-x-days'}
			>
				Every X Days
			</button>
		</div>

		<!-- Weekly: times per week -->
		{#if scheduleType === 'weekly'}
			<div class="mt-3">
				<label for="times-per-week" class="mb-1 block text-sm text-gray-600">
					Times per week
				</label>
				<div class="flex items-center gap-3">
					<input
						id="times-per-week"
						type="range"
						min="1"
						max="7"
						bind:value={timesPerWeek}
						class="flex-1"
					/>
					<span class="w-8 text-center text-sm font-semibold text-hungry-600">{timesPerWeek}</span>
				</div>
			</div>
		{/if}

		<!-- Every X days: interval -->
		{#if scheduleType === 'every-x-days'}
			<div class="mt-3">
				<label for="interval-days" class="mb-1 block text-sm text-gray-600">
					Every how many days?
				</label>
				<div class="flex items-center gap-3">
					<input
						id="interval-days"
						type="range"
						min="2"
						max="30"
						bind:value={intervalDays}
						class="flex-1"
					/>
					<span class="w-8 text-center text-sm font-semibold text-hungry-600">{intervalDays}</span>
				</div>
			</div>
		{/if}
	</fieldset>

	<!-- Reminder Time -->
	<div>
		<label for="reminder-time" class="mb-2 block text-sm font-medium text-gray-700">
			Reminder Time <span class="text-gray-400">(optional)</span>
		</label>
		<input id="reminder-time" type="time" bind:value={reminderTime} class="input-field" />
	</div>

	<!-- Partial Completion Criteria -->
	<div>
		<label for="partial-criteria" class="mb-2 block text-sm font-medium text-gray-700">
			Partial Completion Criteria <span class="text-gray-400">(optional)</span>
		</label>
		<input
			id="partial-criteria"
			type="text"
			bind:value={partialCriteria}
			placeholder="e.g., 20 pushups instead of full gym session"
			class="input-field"
		/>
		<p class="mt-1 text-xs text-gray-500">What counts as a partial completion on busy days?</p>
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
				<p class="text-sm text-gray-400">
					{scheduleLabel}{#if reminderTime}&ensp;·&ensp;{reminderTime}{/if}
				</p>
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
