<script lang="ts">
	import TrendIndicator from './TrendIndicator.svelte';

	interface Props {
		icon: string;
		label: string;
		value: string;
		subtitle?: string;
		trend?: { direction: 'improving' | 'steady' | 'declining'; percentage: number };
	}
	let { icon, label, value, subtitle, trend }: Props = $props();
</script>

<div class="card">
	<div class="mb-2 flex items-start justify-between">
		<span class="text-sm text-gray-500">{label}</span>
		<span class="text-lg">{icon}</span>
	</div>
	<p class="text-2xl font-bold text-gray-900">{value}</p>
	{#if subtitle}
		<p class="mt-1 text-xs text-gray-500">{subtitle}</p>
	{/if}
	{#if trend}
		<div class="mt-1">
			<TrendIndicator direction={trend.direction} percentage={trend.percentage} />
		</div>
	{/if}
</div>

