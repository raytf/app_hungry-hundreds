<script lang="ts">
	import { dialogueStore, hideDialogue } from '$lib/stores/dialogue.svelte';

	// Typewriter state
	let displayText = $state('');
	let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
	let hideTimer: ReturnType<typeof setTimeout> | null = null;
	let reducedMotion = $state(false);

	function clearTimers() {
		if (typewriterTimer !== null) {
			clearTimeout(typewriterTimer);
			typewriterTimer = null;
		}
		if (hideTimer !== null) {
			clearTimeout(hideTimer);
			hideTimer = null;
		}
	}

	function startTypewriter(text: string, charDelayMs: number, displayMs: number) {
		clearTimers();
		displayText = '';

		if (reducedMotion) {
			// Respect prefers-reduced-motion: show full text instantly
			displayText = text;
			hideTimer = setTimeout(() => hideDialogue(), displayMs);
			return;
		}

		let i = 0;
		function typeNext() {
			i++;
			displayText = text.slice(0, i);
			if (i < text.length) {
				typewriterTimer = setTimeout(typeNext, charDelayMs);
			} else {
				// Typing done — start display timer
				hideTimer = setTimeout(() => hideDialogue(), displayMs);
			}
		}
		typewriterTimer = setTimeout(typeNext, charDelayMs);
	}

	// Start/reset typewriter whenever the store text changes while visible
	$effect(() => {
		const { text, visible, charDelayMs, displayMs } = dialogueStore;
		if (visible && text) {
			startTypewriter(text, charDelayMs, displayMs);
		} else if (!visible) {
			clearTimers();
		}
	});

	// Detect reduced motion preference on mount
	$effect(() => {
		if (typeof window === 'undefined') return;
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reducedMotion = mq.matches;
		const handler = (e: MediaQueryListEvent) => (reducedMotion = e.matches);
		mq.addEventListener('change', handler);
		return () => mq.removeEventListener('change', handler);
	});

	function dismiss() {
		clearTimers();
		hideDialogue();
	}
</script>

{#if dialogueStore.visible}
	<!-- Fixed zone: sits above Gonn (z-[15]) -->
	<div
		class="speech-bubble-zone pointer-events-none fixed inset-x-0 z-[15] flex justify-center"
		style="bottom: calc(var(--gonn-size) + 8px)"
	>
		<button
			class="speech-bubble pointer-events-auto relative max-w-xs rounded-2xl px-4 py-3 text-left shadow-bubble"
			style="background: var(--color-surface); border: 1.5px solid var(--color-edge);"
			onclick={dismiss}
			role="status"
			aria-live="polite"
			aria-label="Gonn says: {dialogueStore.text}"
		>
			<p
				class="m-0 font-body"
				style="font-size: var(--text-gonn-speech); line-height: var(--text-gonn-speech--line-height); font-weight: var(--text-gonn-speech--font-weight); color: var(--color-content);"
			>
				{displayText}
			</p>

			<!-- Triangle tail pointing down toward Gonn -->
			<span
				class="absolute -bottom-[9px] left-1/2 -translate-x-1/2"
				style="
					width: 0; height: 0;
					border-left: 9px solid transparent;
					border-right: 9px solid transparent;
					border-top: 9px solid var(--color-edge);
				"
				aria-hidden="true"
			></span>
			<span
				class="absolute -bottom-[7px] left-1/2 -translate-x-1/2"
				style="
					width: 0; height: 0;
					border-left: 8px solid transparent;
					border-right: 8px solid transparent;
					border-top: 8px solid var(--color-surface);
				"
				aria-hidden="true"
			></span>
		</button>
	</div>
{/if}

<style>
	.speech-bubble-zone {
		animation: bubble-in 250ms cubic-bezier(0.34, 1.56, 0.64, 1) both;
	}

	.speech-bubble-zone:not(.speech-bubble-zone) {
		animation: bubble-out 200ms ease-in both;
	}

	@keyframes bubble-in {
		from {
			opacity: 0;
			transform: scale(0.9) translateY(4px);
		}
		to {
			opacity: 1;
			transform: scale(1) translateY(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.speech-bubble-zone {
			animation: none;
		}
	}
</style>
