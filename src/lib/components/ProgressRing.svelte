<script lang="ts">
	interface Props {
		pct?: number;
		size?: number;
	}

	let { pct = 0, size = 64 }: Props = $props();

	// Calculate SVG properties reactively
	const strokeWidth = 6;
	let radius = $derived((size - strokeWidth) / 2);
	let circumference = $derived(2 * Math.PI * radius);

	// Calculate stroke offset based on percentage
	let offset = $derived(circumference - (pct / 100) * circumference);
</script>

<div
	class="relative inline-flex items-center justify-center"
	style="width: {size}px; height: {size}px;"
>
	<svg width={size} height={size} class="-rotate-90">
		<!-- Background circle -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="#e5e7eb"
			stroke-width={strokeWidth}
		/>
		<!-- Progress circle -->
		<circle
			cx={size / 2}
			cy={size / 2}
			r={radius}
			fill="none"
			stroke="#22c55e"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={circumference}
			stroke-dashoffset={offset}
			class="transition-all duration-500 ease-out"
		/>
	</svg>
	<!-- Center text -->
	<span class="absolute text-sm font-semibold text-gray-700">
		{pct}%
	</span>
</div>
