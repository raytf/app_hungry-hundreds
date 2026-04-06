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
			class="max-w-xs rounded-xl bg-content px-4 py-3 text-body font-medium text-surface shadow-toast"
		>
			{toastStore.message}
		</div>
	</div>
{/if}
