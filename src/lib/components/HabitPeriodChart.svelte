<script lang="ts">
	import type { HabitChartPoint } from '$lib/history/habitHistory';

	interface Props {
		data: HabitChartPoint[];
		title?: string;
	}

	let { data, title = 'Completion Overview' }: Props = $props();

	let maxTotal = $derived(Math.max(...data.map((point) => point.total), 1));
	let labelInterval = $derived(data.length <= 7 ? 1 : data.length <= 14 ? 2 : Math.ceil(data.length / 8));
	let isEmpty = $derived(data.length === 0 || data.every((point) => point.completed === 0));
</script>

<div class="card">
	<h3 class="mb-4 text-sm font-semibold text-content-muted">📈 {title}</h3>

	{#if isEmpty}
		<div class="flex flex-col items-center gap-2 py-6 text-center">
			<span class="text-3xl">🗂️</span>
			<p class="text-sm font-medium text-content-muted">No completions in this period</p>
			<p class="text-xs text-content-subtle">Try a longer range or log your next check-in.</p>
		</div>
	{:else}
		<div class="flex items-end justify-between gap-1">
			{#each data as point, index (point.date)}
				{@const height = (Math.max(point.completed, 1) / maxTotal) * 100}
				{@const showLabel = index % labelInterval === 0}
				<div class="flex min-w-0 flex-1 flex-col items-center gap-1">
					<div class="relative w-full" style="height: 84px;">
						<div
							class="absolute bottom-0 w-full rounded-md bg-surface-sunken"
							style="height: 100%"
						></div>
						<div
							class="absolute bottom-0 w-full rounded-md transition-all duration-300"
							class:bg-success={point.status === 'completed' || (!point.status && point.completed >= point.total)}
							class:bg-blue-500={point.status === 'active'}
							class:bg-red-500={point.status === 'missed'}
							class:bg-accent-warm={!point.status && point.completed > 0 && point.completed < point.total}
							style="height: {height}%"
						></div>
					</div>
					<span class="truncate text-xs font-medium text-content-subtle" class:invisible={!showLabel}>
						{point.label}
					</span>
					{#if data.length <= 16}
						<span class="text-[11px] text-content-subtle">
							{#if point.status}
								{point.status}
							{:else}
								{point.completed}/{point.total}
							{/if}
						</span>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>