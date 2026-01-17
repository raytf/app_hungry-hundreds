<script lang="ts">
	import type { WeeklyDataPoint } from '$lib/stores/stats';

	interface Props {
		data: WeeklyDataPoint[];
	}

	let { data }: Props = $props();

	// Find max for scaling
	let maxTotal = $derived(Math.max(...data.map((d) => d.total), 1));
</script>

<div class="card">
	<h3 class="mb-4 text-sm font-medium text-gray-500">This Week</h3>
	<div class="flex items-end justify-between gap-2">
		{#each data as day}
			{@const height = (day.total / maxTotal) * 100}
			{@const completedHeight = (day.completed / maxTotal) * 100}
			{@const isComplete = day.completed === day.total}
			<div class="flex flex-1 flex-col items-center gap-1">
				<!-- Bar container -->
				<div class="relative w-full" style="height: 80px;">
					<!-- Background bar (total) -->
					<div
						class="absolute bottom-0 w-full rounded-t-md bg-gray-100"
						style="height: {height}%"
					></div>
					<!-- Completed bar -->
					<div
						class="absolute bottom-0 w-full rounded-t-md transition-all duration-300"
						class:bg-hungry-500={isComplete}
						class:bg-hungry-300={!isComplete}
						style="height: {completedHeight}%"
					></div>
				</div>
				<!-- Day label -->
				<span class="text-xs text-gray-500">{day.day}</span>
				<!-- Count -->
				<span
					class="text-xs font-medium"
					class:text-hungry-600={isComplete}
					class:text-gray-600={!isComplete}
				>
					{day.completed}/{day.total}
				</span>
			</div>
		{/each}
	</div>
</div>
