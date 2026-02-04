<script lang="ts">
	/**
	 * Monster Component
	 *
	 * Renders the monster companion using Rive animations.
	 * Falls back to emoji display if Rive fails to load or WebGL is unavailable.
	 *
	 * @see docs/ANIMATION.md for animation system documentation
	 */
	import { onMount, onDestroy } from 'svelte';
	import { monsterStages, type MonsterStage } from '$lib/stores/monster';
	import {
		supportsWebGL,
		createVisibilityObserver,
		createTabVisibilityHandler
	} from '$lib/animations/rive-utils';

	interface Props {
		/** Current evolution stage */
		stage: MonsterStage;
		/** Trigger happy animation */
		isHappy?: boolean;
		/** Additional CSS classes */
		class?: string;
	}

	let { stage, isHappy = false, class: className = '' }: Props = $props();

	// State
	let canvas: HTMLCanvasElement;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let riveInstance: any = null;
	let riveLoaded = $state(false);
	let riveError = $state(false);
	let cleanupVisibility: (() => void) | null = null;
	let cleanupTabVisibility: (() => void) | null = null;

	// Get emoji fallback config
	let stageConfig = $derived(monsterStages[stage]);

	// Check if we should attempt Rive
	let shouldUseRive = $state(false);

	onMount(() => {
		// Check WebGL support on mount
		shouldUseRive = supportsWebGL();

		if (shouldUseRive) {
			initRive();
		}
	});

	async function initRive() {
		try {
			// Dynamic import to handle CommonJS module in Vite
			const RiveModule = await import('@rive-app/canvas');
			const Rive = RiveModule.Rive || RiveModule.default?.Rive || RiveModule.default;

			riveInstance = new Rive({
				src: '/animations/cat-treat.riv',
				canvas,
				autoplay: true,
				onLoad: () => {
					riveLoaded = true;

					// Set up visibility observers for performance
					if (riveInstance && canvas) {
						cleanupVisibility = createVisibilityObserver(riveInstance, canvas);
						cleanupTabVisibility = createTabVisibilityHandler(riveInstance);
					}
				},
				onLoadError: (err: unknown) => {
					console.warn('Rive load error:', err);
					riveError = true;
				}
			});
		} catch (err) {
			console.warn('Rive initialization error:', err);
			riveError = true;
		}
	}

	// React to isHappy changes
	$effect(() => {
		if (isHappy && riveInstance && riveLoaded) {
			// For the placeholder cat-treat.riv, we don't have state machine inputs
			// When real monster.riv is ready, uncomment:
			// setBooleanInput(riveInstance, 'MonsterController', 'isHappy', true);
			// setTimeout(() => {
			//   setBooleanInput(riveInstance, 'MonsterController', 'isHappy', false);
			// }, 2000);
		}
	});

	onDestroy(() => {
		cleanupVisibility?.();
		cleanupTabVisibility?.();
		riveInstance?.cleanup();
	});

	// Determine what to show
	let showRive = $derived(shouldUseRive && riveLoaded && !riveError);
	let showEmoji = $derived(!shouldUseRive || riveError || !riveLoaded);
</script>

<!-- Rive Canvas (hidden if not loaded or error) -->
<canvas
	bind:this={canvas}
	class="h-48 w-48 {className}"
	class:hidden={!showRive}
	aria-label="Animated monster companion"
></canvas>

<!-- Emoji Fallback -->
{#if showEmoji}
	<div
		class="flex h-48 w-48 items-center justify-center {className}"
		aria-label="Monster companion"
	>
		<span class="animate-bounce text-7xl">{stageConfig.emoji}</span>
	</div>
{/if}
