<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		open: boolean;
		onclose: () => void;
		children: Snippet;
	}

	let { open, onclose, children }: Props = $props();

	function handleBackdropKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') onclose();
	}
</script>

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 bg-overlay"
		onclick={onclose}
		onkeydown={handleBackdropKeydown}
		role="presentation"
	></div>

	<!-- Sheet -->
	<div
		class="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-[var(--radius-sheet)] bg-surface shadow-sheet"
		role="dialog"
		aria-modal="true"
		in:fly={{ y: 300, duration: 300 }}
		out:fly={{ y: 300, duration: 250 }}
	>
		<!-- Drag handle -->
		<div class="flex justify-center pb-2 pt-3" aria-hidden="true">
			<div class="h-1 w-10 rounded-full bg-edge"></div>
		</div>

		<!-- Scrollable content -->
		<div class="flex-1 overflow-y-auto">
			{@render children()}
		</div>
	</div>
{/if}
