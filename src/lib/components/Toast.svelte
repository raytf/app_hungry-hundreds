<script lang="ts">
	import { toastStore } from '$lib/stores/toast.svelte';
	import { fly } from 'svelte/transition';
</script>

{#if toastStore.visible}
	<!-- Toast: top-center, 16px below the fire bar (~70px from top), dark bg + light text -->
	<div
		role="status"
		aria-live="polite"
		aria-atomic="true"
		class="pointer-events-none fixed inset-x-0 top-[70px] z-50 flex justify-center px-4"
		in:fly={{ y: -8, duration: 200 }}
		out:fly={{ y: -8, duration: 200 }}
	>
		<div
			data-testid="toast"
			class="max-w-sm rounded-xl bg-content px-4 py-3 text-body font-medium text-surface shadow-toast"
			class:pointer-events-auto={toastStore.hasAction}
		>
			<div class="flex items-center gap-3">
				<p class="min-w-0 flex-1">{toastStore.message}</p>
				{#if toastStore.hasAction && toastStore.actionLabel}
					<button
						type="button"
						data-testid="toast-action"
						onclick={() => toastStore.handleAction()}
						class="shrink-0 rounded-lg border border-white/20 px-3 py-1 text-sm font-semibold text-white transition-colors hover:bg-white/10"
					>
						{toastStore.actionLabel}
					</button>
				{/if}
			</div>
		</div>
	</div>
{/if}
