<script lang="ts">
	import type { DayPattern, DayTimeInsight } from '$lib/stores/advancedStats';

	interface Props {
		patterns: DayPattern[];
		insight: DayTimeInsight;
	}
	let { patterns, insight }: Props = $props();

	/**
	 * Map completion rate (0-100) to a background color class.
	 * Uses the hungry color palette for intensity.
	 */
	function getIntensityClass(rate: number): string {
		if (rate >= 80) return 'bg-hungry-600 text-white';
		if (rate >= 60) return 'bg-hungry-400 text-white';
		if (rate >= 40) return 'bg-hungry-300 text-gray-800';
		if (rate >= 20) return 'bg-hungry-200 text-gray-700';
		if (rate > 0) return 'bg-hungry-100 text-gray-600';
		return 'bg-gray-100 text-gray-400';
	}
</script>

<div class="card">
	<h3 class="mb-3 text-sm font-medium text-gray-500">Day Patterns</h3>

	<!-- 7-column heatmap grid -->
	<div class="mb-3 grid grid-cols-7 gap-2">
		{#each patterns as pattern}
			<div class="text-center">
				<span class="mb-1 block text-xs text-gray-500">{pattern.day}</span>
				<div
					class="mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold transition-colors {getIntensityClass(pattern.completionRate)}"
				>
					{pattern.completionRate}%
				</div>
			</div>
		{/each}
	</div>

	<!-- Insight text -->
	{#if insight.insightText}
		<p class="text-center text-sm text-gray-600">
			{insight.insightText}
		</p>
	{/if}
</div>

