<script lang="ts">
	import { pwaStore, showInstallBanner } from '$lib/stores/pwa';

	async function handleInstall() {
		await pwaStore.promptInstall();
	}

	function handleDismiss() {
		pwaStore.dismiss();
	}
</script>

{#if $showInstallBanner}
	<div
		class="fixed right-4 bottom-20 left-4 z-50 mx-auto max-w-lg animate-fade-in rounded-2xl border border-gray-100 bg-white p-4 shadow-lg"
		role="alert"
		aria-live="polite"
	>
		<div class="flex items-start gap-3">
			<!-- App icon -->
			<div
				class="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-hungry-500 text-2xl"
			>
				🐲
			</div>

			<!-- Content -->
			<div class="min-w-0 flex-1">
				<h3 class="font-semibold text-gray-900">Install Hungry Hundreds</h3>
				<p class="mt-0.5 text-sm text-gray-500">
					Add to home screen for the best experience - works offline!
				</p>
			</div>

			<!-- Close button -->
			<button
				type="button"
				onclick={handleDismiss}
				class="-mr-1 -mt-1 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
				aria-label="Dismiss install prompt"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</button>
		</div>

		<!-- Actions -->
		<div class="mt-3 flex gap-2">
			<button type="button" onclick={handleInstall} class="btn-primary flex-1 py-2.5 text-sm">
				Install App
			</button>
			<button type="button" onclick={handleDismiss} class="btn-secondary flex-1 py-2.5 text-sm">
				Not Now
			</button>
		</div>
	</div>
{/if}

<style>
	@keyframes fade-in {
		from {
			opacity: 0;
			transform: translateY(1rem);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.animate-fade-in {
		animation: fade-in 0.3s ease-out;
	}
</style>

