<script lang="ts">
	import type { PeriodDataPoint } from '$lib/stores/periodStats';

	interface Props {
		data: PeriodDataPoint[];
		title: string;
	}

	let { data, title }: Props = $props();

	let maxTotal = $derived(Math.max(...data.map((d) => d.total), 1));

	// For dense charts (>14 bars) only show every Nth label to avoid overflow
	let labelInterval = $derived(data.length <= 7 ? 1 : data.length <= 14 ? 2 : Math.ceil(data.length / 8));

	let isEmpty = $derived(data.every((d) => d.total === 0));
</script>

<div class="card">
	<h3 class="mb-4 text-sm font-semibold text-content-muted">✨ {title}</h3>

	{#if isEmpty}
		<div class="flex flex-col items-center gap-2 py-6 text-center">
			<span class="text-3xl">📋</span>
			<p class="text-sm font-medium text-content-muted">No habits tracked in this period</p>
			<p class="text-xs text-content-subtle">Add habits or select a different range</p>
		</div>
	{:else}
		<div class="flex items-end justify-between gap-1">
			{#each data as point, i (point.date)}
				{@const height = (point.total / maxTotal) * 100}
				{@const completedHeight = (point.completed / maxTotal) * 100}
				{@const isComplete = point.total > 0 && point.completed >= point.total}
				{@const showLabel = i % labelInterval === 0}
				<div class="flex min-w-0 flex-1 flex-col items-center gap-1">
					<!-- Bar -->
					<div class="relative w-full" style="height: 80px;">
						<!-- Background (total) -->
						<div
							class="absolute bottom-0 w-full rounded-md bg-surface-sunken"
							style="height: {height}%"
						></div>
						<!-- Completed -->
						{#if point.completed > 0}
							<div
								class="absolute bottom-0 w-full rounded-md transition-all duration-300"
								class:bg-success={isComplete}
								class:bg-accent-warm={!isComplete}
								style="height: {Math.max(completedHeight, 8)}%"
							></div>
						{/if}
					</div>
					<!-- Label -->
					<span class="truncate text-xs font-medium text-content-subtle" class:invisible={!showLabel}>
						{point.label}
					</span>
					<!-- Count — only shown for ≤14 bars to avoid clutter -->
					{#if data.length <= 14}
						<span
							class="text-xs font-medium"
							class:text-success={isComplete}
							class:text-content-subtle={!isComplete}
						>
							{point.completed}/{point.total}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
