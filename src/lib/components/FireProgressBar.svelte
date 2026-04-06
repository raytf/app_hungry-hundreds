<script lang="ts">
	interface Props {
		/** Completion percentage 0–100 */
		pct: number;
	}

	let { pct }: Props = $props();

	const clamped = $derived(Math.min(100, Math.max(0, pct)));
	const isDone = $derived(clamped === 100);
</script>

<!--
	Full-bleed 6px fire progress bar.
	Sits directly below the top bar (stacks in document flow or fixed via parent).
	Gradient: accent-warm → gonn-red, left to right.
-->
<div
	role="progressbar"
	aria-valuenow={clamped}
	aria-valuemin={0}
	aria-valuemax={100}
	aria-label="Today's habit completion"
	class="h-1.5 w-full overflow-hidden bg-surface-sunken"
>
	<div
		class="h-full bg-fire-gradient transition-[width] duration-[400ms] ease-out"
		class:animate-pulse={isDone}
		style:width="{clamped}%"
		style:box-shadow={isDone ? 'var(--shadow-fire-glow)' : 'none'}
	></div>
</div>
