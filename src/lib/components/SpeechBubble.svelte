<script lang="ts">
	import { untrack } from 'svelte';
	import { dialogueStore, hideDialogue } from '$lib/stores/dialogue.svelte';

	// Typewriter + transition state
	let displayText = $state('');
	let fading = $state(false);
	let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
	let reducedMotion = $state(false);

	function clearTimer() {
		if (typewriterTimer !== null) {
			clearTimeout(typewriterTimer);
			typewriterTimer = null;
		}
		// Always snap out of fading if a new call interrupts mid-transition
		fading = false;
	}

	function beginTyping(text: string, charDelayMs: number) {
		displayText = '';
		let i = 0;
		function typeNext() {
			i++;
			displayText = text.slice(0, i);
			if (i < text.length) {
				typewriterTimer = setTimeout(typeNext, charDelayMs);
			}
			// No hide timer — bubble stays until user dismisses or next message arrives
		}
		typewriterTimer = setTimeout(typeNext, charDelayMs);
	}

	function startTypewriter(text: string, charDelayMs: number) {
		clearTimer();

		if (reducedMotion) {
			// Respect prefers-reduced-motion: show full text instantly, no fade
			displayText = text;
			return;
		}

		// untrack: reading displayText here must NOT register it as a $effect dependency.
		// Without untrack, every character written by beginTyping() would re-fire the
		// effect, call startTypewriter() again, and create an infinite reset loop.
		if (untrack(() => displayText.length > 0)) {
			// A message is already visible — fade it out briefly, then type the new one
			fading = true;
			typewriterTimer = setTimeout(() => {
				fading = false;
				beginTyping(text, charDelayMs);
			}, 150);
		} else {
			beginTyping(text, charDelayMs);
		}
	}

	// Start/reset typewriter whenever the store text changes while visible
	$effect(() => {
		const { text, visible, charDelayMs } = dialogueStore;
		if (visible && text) {
			startTypewriter(text, charDelayMs);
		} else if (!visible) {
			clearTimer();
			displayText = '';
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
		clearTimer();
		displayText = '';
		hideDialogue();
	}
</script>

{#if dialogueStore.visible}
	<!-- Fixed zone: sits above Gonn (z-[15]) -->
	<div
		class="speech-bubble-zone pointer-events-none fixed inset-x-0 z-[15] flex justify-center"
		style="bottom: calc(var(--gonn-size) + 8px)"
	>
		<div
			class="speech-bubble pointer-events-auto relative max-w-sm cursor-pointer rounded-2xl px-4 py-3 text-left shadow-bubble"
			style="background: var(--color-surface); border: 1.5px solid var(--color-edge);"
			onclick={dismiss}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && dismiss()}
			role="button"
			tabindex="0"
			aria-label="Gonn says: {dialogueStore.text}. Press to dismiss."
		>
			<!-- Screen reader announcement -->
			<span role="status" aria-live="polite" class="sr-only">{dialogueStore.text}</span>
			<p
				class="m-0 font-body"
				style="font-size: var(--text-gonn-speech); line-height: var(--text-gonn-speech--line-height); font-weight: var(--text-gonn-speech--font-weight); color: var(--color-content); opacity: {fading ? 0 : 1}; transition: opacity 150ms ease;"
			>
				{displayText}
			</p>

			<!-- Reply affordance: navigates to /chat without dismissing bubble -->
			<a
				href="/chat"
				class="mt-1 block text-right text-body-sm font-medium text-accent-warm"
				onclick={(e) => e.stopPropagation()}
			>
				Reply →
			</a>

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
		</div>
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
