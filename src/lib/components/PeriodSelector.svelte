<script lang="ts">
	import { untrack } from 'svelte';
	import { formatDateLocal } from '$lib/db';
	import { getPresetRange, type PeriodPreset, type PeriodRange } from '$lib/stores/periodStats';

	interface Props {
		value: PeriodRange;
		onchange: (range: PeriodRange) => void;
		presets?: { id: PeriodPreset; label: string }[];
	}

	const DEFAULT_PRESETS: { id: PeriodPreset; label: string }[] = [
		{ id: 'day', label: 'Yesterday' },
		{ id: '7days', label: '7 Days' },
		{ id: '30days', label: '30 Days' },
		{ id: 'custom', label: 'Custom' }
	];

	let { value, onchange, presets = DEFAULT_PRESETS }: Props = $props();

	// Local state for the custom date inputs — untrack() suppresses the Svelte
	// "initial value only" warning; $effect below keeps them in sync with the prop.
	let customStart = $state(untrack(() => value.start));
	let customEnd = $state(untrack(() => value.end));

	// Keep local state in sync when the parent updates value (e.g. preset changes)
	$effect(() => {
		customStart = value.start;
		customEnd = value.end;
	});

	const today = formatDateLocal(new Date());

	function selectPreset(preset: PeriodPreset) {
		if (preset === 'custom') {
			onchange({ preset: 'custom', start: customStart, end: customEnd });
		} else {
			const range = getPresetRange(preset);
			customStart = range.start;
			customEnd = range.end;
			onchange({ preset, ...range });
		}
	}

	function applyCustom() {
		if (customStart && customEnd && customStart <= customEnd) {
			onchange({ preset: 'custom', start: customStart, end: customEnd });
		}
	}
</script>

<div class="card p-3">
	<!-- Segment control -->
	<div class="flex gap-1 rounded-xl bg-surface-sunken p-1">
		{#each presets as preset (preset.id)}
			<button
				class="flex-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-all duration-150"
				class:bg-surface={value.preset === preset.id}
				class:text-content={value.preset === preset.id}
				class:shadow-sm={value.preset === preset.id}
				class:text-content-subtle={value.preset !== preset.id}
				onclick={() => selectPreset(preset.id)}
			>
				{preset.label}
			</button>
		{/each}
	</div>

	<!-- Custom date inputs — only visible when Custom is active -->
	{#if value.preset === 'custom'}
		<div class="mt-3 flex items-center gap-2">
			<input
				type="date"
				max={today}
				bind:value={customStart}
				onchange={applyCustom}
				class="flex-1 rounded-lg border border-edge bg-surface px-3 py-1.5 text-sm text-content focus:border-focus focus:outline-none"
			/>
			<span class="shrink-0 text-sm text-content-subtle">→</span>
			<input
				type="date"
				max={today}
				min={customStart}
				bind:value={customEnd}
				onchange={applyCustom}
				class="flex-1 rounded-lg border border-edge bg-surface px-3 py-1.5 text-sm text-content focus:border-focus focus:outline-none"
			/>
		</div>
	{/if}
</div>
