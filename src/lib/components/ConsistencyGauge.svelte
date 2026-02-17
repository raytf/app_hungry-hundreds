<script lang="ts">
	import ProgressRing from './ProgressRing.svelte';

	interface Props {
		score: number;
		label: string;
		breakdown: {
			recency: number;
			frequency: number;
			regularity: number;
		};
	}
	let { score, label, breakdown }: Props = $props();

	let scoreColor = $derived(
		score >= 90
			? 'text-hungry-600'
			: score >= 70
				? 'text-green-600'
				: score >= 40
					? 'text-orange-500'
					: 'text-red-500'
	);

	let barColor = $derived(
		score >= 90
			? 'bg-hungry-500'
			: score >= 70
				? 'bg-green-500'
				: score >= 40
					? 'bg-orange-500'
					: 'bg-red-500'
	);
</script>

<div class="card">
	<h3 class="mb-3 text-sm font-medium text-gray-500">Consistency Score</h3>

	<div class="mb-4 flex items-center gap-4">
		<ProgressRing pct={score} size={80} />
		<div>
			<p class="text-3xl font-bold {scoreColor}">{score}</p>
			<p class="text-sm text-gray-500">{label}</p>
		</div>
	</div>

	<!-- Breakdown bars -->
	<div class="space-y-2">
		<div>
			<div class="mb-1 flex justify-between text-xs text-gray-500">
				<span>Recency</span>
				<span>{breakdown.recency}/40</span>
			</div>
			<div class="h-2 rounded-full bg-gray-200">
				<div
					class="h-2 rounded-full transition-all duration-500 {barColor}"
					style="width: {(breakdown.recency / 40) * 100}%"
				></div>
			</div>
		</div>

		<div>
			<div class="mb-1 flex justify-between text-xs text-gray-500">
				<span>Frequency</span>
				<span>{breakdown.frequency}/35</span>
			</div>
			<div class="h-2 rounded-full bg-gray-200">
				<div
					class="h-2 rounded-full transition-all duration-500 {barColor}"
					style="width: {(breakdown.frequency / 35) * 100}%"
				></div>
			</div>
		</div>

		<div>
			<div class="mb-1 flex justify-between text-xs text-gray-500">
				<span>Regularity</span>
				<span>{breakdown.regularity}/25</span>
			</div>
			<div class="h-2 rounded-full bg-gray-200">
				<div
					class="h-2 rounded-full transition-all duration-500 {barColor}"
					style="width: {(breakdown.regularity / 25) * 100}%"
				></div>
			</div>
		</div>
	</div>
</div>

