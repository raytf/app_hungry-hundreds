<script lang="ts">
	import { pwaStore, showUpdatePrompt } from '$lib/stores/pwa';

	function handleUpdate() {
		pwaStore.applyUpdate();
	}
</script>

{#if $showUpdatePrompt}
	<div
		class="fixed top-4 right-4 left-4 z-50 mx-auto max-w-lg animate-slide-down rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-lg"
		role="alert"
		aria-live="assertive"
	>
		<div class="flex items-start gap-3">
			<!-- Update icon -->
			<div
				class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-xl text-white"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
			</div>

			<!-- Content -->
			<div class="min-w-0 flex-1">
				<h3 class="font-semibold text-gray-900">Update Available</h3>
				<p class="mt-0.5 text-sm text-gray-600">
					A new version of Hungry Hundreds is ready.
				</p>
			</div>
		</div>

		<!-- Action -->
		<div class="mt-3">
			<button
				type="button"
				onclick={handleUpdate}
				class="w-full rounded-xl bg-blue-500 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-600 active:bg-blue-700"
			>
				Update &amp; Reload
			</button>
		</div>
	</div>
{/if}

<style>
	@keyframes slide-down {
		from {
			opacity: 0;
			transform: translateY(-1rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-slide-down {
		animation: slide-down 0.3s ease-out;
	}
</style>

