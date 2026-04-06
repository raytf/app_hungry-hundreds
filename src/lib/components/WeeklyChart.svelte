<script lang="ts">
	import type { WeeklyDataPoint } from '$lib/stores/stats';

	interface Props {
		data: WeeklyDataPoint[];
	}

	let { data }: Props = $props();

	// Find max for scaling
	let maxTotal = $derived(Math.max(...data.map((d) => d.total), 1));

	// Index of today in the Mon–Sun array (getDay: 0=Sun, 1=Mon … 6=Sat → Mon=0)
	const todayIndex = (new Date().getDay() + 6) % 7;

	// Empty state: no habits being tracked this week
	const isEmpty = $derived(data.every((d) => d.total === 0));
</script>

<div class="card">
	<h3 class="mb-4 text-sm font-semibold text-content-muted">✨ This Week</h3>

	{#if isEmpty}
		<div class="flex flex-col items-center gap-2 py-6 text-center">
			<span class="text-3xl">📋</span>
			<p class="text-sm font-medium text-content-muted">Start tracking to see your week</p>
			<p class="text-xs text-content-subtle">Add a habit to begin building your streak</p>
		</div>
	{:else}
		<div class="flex items-end justify-between gap-2">
			{#each data as day, i}
				{@const height = (day.total / maxTotal) * 100}
				{@const completedHeight = (day.completed / maxTotal) * 100}
				{@const isComplete = day.total > 0 && day.completed >= day.total}
				{@const isToday = i === todayIndex}
				<div class="flex flex-1 flex-col items-center gap-1">
					<!-- Bar container -->
					<div class="relative w-full" style="height: 100px;">
						<!-- Background bar (total) -->
						<div
							class="absolute bottom-0 w-full rounded-md bg-surface-sunken"
							style="height: {height}%"
						></div>
						<!-- Completed bar — min 8 % stub so non-zero days are always visible -->
						{#if day.completed > 0}
							<div
								class="absolute bottom-0 w-full rounded-md transition-all duration-300"
								class:bg-success={isComplete}
								class:bg-accent-warm={!isComplete}
								style="height: {Math.max(completedHeight, 8)}%"
							></div>
						{/if}
					</div>
					<!-- Day label — highlighted for today -->
					<span
						class="text-xs font-medium"
						class:text-accent-warm={isToday}
						class:font-bold={isToday}
						class:text-content-subtle={!isToday}
					>
						{day.day}
					</span>
					<!-- Count -->
					<span
						class="text-xs font-medium"
						class:text-success={isComplete}
						class:text-content-subtle={!isComplete}
					>
						{day.completed}/{day.total}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
