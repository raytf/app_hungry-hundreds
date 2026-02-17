<script lang="ts">
	interface Props {
		direction: 'improving' | 'steady' | 'declining';
		percentage: number;
	}
	let { direction, percentage }: Props = $props();

	let arrow = $derived(direction === 'improving' ? '↗' : direction === 'declining' ? '↘' : '→');
	let colorClass = $derived(
		direction === 'improving'
			? 'text-green-600'
			: direction === 'declining'
				? 'text-red-500'
				: 'text-gray-500'
	);
</script>

<span class="inline-flex items-center gap-1 text-sm font-medium {colorClass}">
	{arrow}
	{percentage > 0 ? '+' : ''}{percentage}%
</span>

