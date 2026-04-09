<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { fade, scale } from 'svelte/transition';
	import { dialogueStore, hideDialogue } from '$lib/stores/dialogue.svelte';

	const MESSAGE_FADE_MS = 150;
	const BUBBLE_IN_MS = 250;
	const BUBBLE_OUT_MS = 200;

	// Typewriter state
	let displayText = $state('');
	let contentHidden = $state(false);
	let typewriterTimer: ReturnType<typeof setTimeout> | null = null;
	let replaceTimer: ReturnType<typeof setTimeout> | null = null;
	let reducedMotion = $state(false);
	let activeText = '';

	function clearTypewriterTimer() {
		if (typewriterTimer !== null) {
			clearTimeout(typewriterTimer);
			typewriterTimer = null;
		}
	}

	function clearReplaceTimer() {
		if (replaceTimer !== null) {
			clearTimeout(replaceTimer);
			replaceTimer = null;
		}
	}

	function clearTimers() {
		clearTypewriterTimer();
		clearReplaceTimer();
	}

	function beginTyping(text: string, charDelayMs: number) {
		let i = 0;
		function typeNext() {
			i++;
			displayText = text.slice(0, i);
			if (i < text.length) {
				typewriterTimer = setTimeout(typeNext, charDelayMs);
			} else {
				typewriterTimer = null;
			}
		}
		typewriterTimer = setTimeout(typeNext, charDelayMs);
	}

	function startTypewriter(text: string, charDelayMs: number) {
		clearTimers();
		activeText = text;
		contentHidden = false;
		displayText = ''; // immediately clear any partially-typed text

		if (reducedMotion) {
			displayText = text;
			return;
		}

		beginTyping(text, charDelayMs);
	}

	function replaceMessage(text: string, charDelayMs: number) {
		clearTimers();

		if (reducedMotion) {
			activeText = text;
			contentHidden = false;
			displayText = text;
			return;
		}

		contentHidden = true;
		replaceTimer = setTimeout(() => {
			replaceTimer = null;
			activeText = text;
			displayText = '';
			contentHidden = false;
			beginTyping(text, charDelayMs);
		}, MESSAGE_FADE_MS);
	}

	// Start/reset typewriter whenever the store text or visibility changes.
	// NOTE: displayText must NOT be read anywhere inside this effect (directly or via
	// called functions) — doing so would make it a tracked dependency and cause the
	// effect to re-fire on every typed character, creating an infinite loop.
	$effect(() => {
		const { text, visible, charDelayMs } = dialogueStore;
		if (visible && text) {
			if (reducedMotion) {
				startTypewriter(text, charDelayMs);
				return;
			}

			if (!activeText) {
				startTypewriter(text, charDelayMs);
				return;
			}

			if (text !== activeText) {
				replaceMessage(text, charDelayMs);
			}
		} else if (!visible) {
			clearTimers();
			activeText = '';
			contentHidden = false;
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
		activeText = '';
		contentHidden = false;
		hideDialogue();
	}
</script>

{#if dialogueStore.visible}
	<!-- Fixed zone: sits above Gonn (z-[15]) -->
	<div
		class="speech-bubble-zone pointer-events-none fixed inset-x-0 z-15 flex justify-center"
		style="bottom: calc(var(--gonn-size) + 8px)"
		in:scale={{ start: 0.9, duration: reducedMotion ? 0 : BUBBLE_IN_MS, easing: cubicOut }}
		out:fade={{ duration: reducedMotion ? 0 : BUBBLE_OUT_MS }}
	>
		<div
			class="speech-bubble pointer-events-auto relative max-w-sm cursor-pointer rounded-2xl px-4 py-3 text-left shadow-bubble"
			style="background: var(--color-surface); border: 1.5px solid var(--color-edge);"
			onclick={dismiss}
			onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && dismiss()}
			role="button"
			tabindex="0"
			aria-label="Gonn says: {dialogueStore.text}. Press to dismiss."
			data-testid="speech-bubble"
		>
			<div class="speech-content" class:is-hidden={contentHidden}>
				<!-- Screen reader announcement -->
				<span role="status" aria-live="polite" class="sr-only">{dialogueStore.text}</span>
				<p
					class="m-0 font-body"
					style="font-size: var(--text-gonn-speech); line-height: var(--text-gonn-speech--line-height); font-weight: var(--text-gonn-speech--font-weight); color: var(--color-content);"
					data-testid="speech-bubble-text"
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
			</div>

			<!-- Triangle tail pointing down toward Gonn -->
			<span
				class="absolute -bottom-2.25 left-1/2 -translate-x-1/2"
				style="
					width: 0; height: 0;
					border-left: 9px solid transparent;
					border-right: 9px solid transparent;
					border-top: 9px solid var(--color-edge);
				"
				aria-hidden="true"
			></span>
			<span
				class="absolute -bottom-1.75 left-1/2 -translate-x-1/2"
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
		will-change: transform, opacity;
	}

	.speech-content {
		transition: opacity 150ms ease;
	}

	.speech-content.is-hidden {
		opacity: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.speech-content {
			transition: none;
		}
	}
</style>
