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
		createTabVisibilityHandler,
		setBooleanInput
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
			const Layout = RiveModule.Layout || RiveModule.default?.Layout;
			const Fit = RiveModule.Fit || RiveModule.default?.Fit;
			const Alignment = RiveModule.Alignment || RiveModule.default?.Alignment;

			riveInstance = new Rive({
				src: '/animations/monster_hatchling.riv',
				canvas,
				autoplay: true,
				stateMachines: 'State Machine 1',
				useOffscreenRenderer: true,
				layout: new Layout({
					fit: Fit.Cover,
					alignment: Alignment.Center
				}),
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

	// React to isHappy changes - temporarily using cat-treat.riv's IsClose input
	$effect(() => {
		// Read isHappy at top level to ensure effect tracks it
		const happy = isHappy;
		console.log(
			'[Monster] $effect - happy:',
			happy,
			'riveInstance:',
			!!riveInstance,
			'riveLoaded:',
			riveLoaded
		);
		if (riveInstance && riveLoaded) {
			// Map isHappy to IsClose for the placeholder animation
			// TODO: Replace with 'MonsterController' and 'isHappy' when real monster.riv is ready
			console.log('[Monster] Setting IsClose to:', happy);
			setBooleanInput(riveInstance, 'State Machine 1', 'IsClose', happy);
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
	class="h-full w-full {className}"
	class:hidden={!showRive}
	aria-label="Animated monster companion"
></canvas>

<!-- Emoji Fallback -->
{#if showEmoji}
	<div
		class="flex h-full w-full items-center justify-center {className}"
		aria-label="Monster companion"
	>
		<span class="animate-bounce text-7xl">{stageConfig.emoji}</span>
	</div>
{/if}
