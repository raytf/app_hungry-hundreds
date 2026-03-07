<script lang="ts">
	/**
	 * Monster Component
	 *
	 * Renders the monster companion using Rive animations with CharacterVM
	 * view model data binding for head tracking (headX, headY).
	 * Falls back to emoji display if Rive fails to load or WebGL is unavailable.
	 *
	 * Exports a `lookAt(targetX, targetY, duration?)` method for parent
	 * components to smoothly animate the monster's gaze direction.
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
	import type {
		Rive as RiveType,
		ViewModelInstanceNumber,
		ViewModelInstanceString
	} from '@rive-app/canvas';

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
	let riveInstance: RiveType | null = null;
	let riveLoaded = $state(false);
	let riveError = $state(false);
	let cleanupVisibility: (() => void) | null = null;
	let cleanupTabVisibility: (() => void) | null = null;
	let cleanupResize: (() => void) | null = null;

	// View Model property handles
	let headXProp: ViewModelInstanceNumber | null = null;
	let headYProp: ViewModelInstanceNumber | null = null;
	let expressionProp: ViewModelInstanceString | null = null;

	// Current interpolated values for smooth animation
	let currentHeadX = 0;
	let currentHeadY = 0;
	let animationFrameId: number | null = null;

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
			const { Rive, Layout, Fit, Alignment } = await import('@rive-app/canvas');

			riveInstance = new Rive({
				src: '/animations/monster_hatchling.riv',
				canvas,
				autoplay: true,
				stateMachines: 'State Machine 1',
				useOffscreenRenderer: true,
				autoBind: true,
				layout: new Layout({
					fit: Fit.Cover,
					alignment: Alignment.Center
				}),
				onLoad: () => {
					// Scale the drawing surface for high-DPI / Retina displays
					riveInstance?.resizeDrawingSurfaceToCanvas();

					// Set up CharacterVM view model properties
					initViewModel();

					riveLoaded = true;

					// Set up visibility observers for performance
					if (riveInstance && canvas) {
						cleanupVisibility = createVisibilityObserver(riveInstance, canvas);
						cleanupTabVisibility = createTabVisibilityHandler(riveInstance);
					}

					// Handle window resize to keep drawing surface crisp
					const onResize = () => riveInstance?.resizeDrawingSurfaceToCanvas();
					window.addEventListener('resize', onResize);
					cleanupResize = () => window.removeEventListener('resize', onResize);
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

	/**
	 * Initialize the CharacterVM view model properties (headX, headY).
	 * Called after Rive loads with autoBind enabled.
	 */
	function initViewModel() {
		if (!riveInstance) return;

		const vmInstance = riveInstance.viewModelInstance;
		if (!vmInstance) {
			console.warn('Monster: No view model instance found (autoBind may have failed)');
			return;
		}

		headXProp = vmInstance.number('headX');
		headYProp = vmInstance.number('headY');
		expressionProp = vmInstance.string('expression');

		if (!headXProp || !headYProp) {
			console.warn('Monster: Could not find headX/headY properties on CharacterVM');
		}
		if (!expressionProp) {
			console.warn('Monster: Could not find expression property on CharacterVM');
		}
	}

	// ============================================================================
	// Smooth Head Tracking (lookAt)
	// ============================================================================

	/**
	 * Ease-out cubic easing function for natural-feeling deceleration.
	 * Starts fast and gradually slows to a stop.
	 */
	function easeOutCubic(t: number): number {
		return 1 - Math.pow(1 - t, 3);
	}

	/**
	 * Smoothly animate the monster's gaze from its current position
	 * to the given target coordinates.
	 *
	 * @param targetX - Target headX value (-1 to 1)
	 * @param targetY - Target headY value (-1 to 1)
	 * @param duration - Animation duration in ms (default: 300)
	 */
	export function lookAt(targetX: number, targetY: number, duration = 300): void {
		// Clamp to valid range
		targetX = Math.max(-1, Math.min(1, targetX));
		targetY = Math.max(-1, Math.min(1, targetY));

		// Cancel any in-progress animation
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
			animationFrameId = null;
		}

		// If view model props aren't available, bail out
		if (!headXProp || !headYProp) return;

		const startX = currentHeadX;
		const startY = currentHeadY;
		const startTime = performance.now();

		function animate(now: number) {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = easeOutCubic(progress);

			currentHeadX = startX + (targetX - startX) * eased;
			currentHeadY = startY + (targetY - startY) * eased;

			if (headXProp) headXProp.value = currentHeadX;
			if (headYProp) headYProp.value = currentHeadY;

			if (progress < 1) {
				animationFrameId = requestAnimationFrame(animate);
			} else {
				animationFrameId = null;
			}
		}

		animationFrameId = requestAnimationFrame(animate);
	}

	/**
	 * Set the monster's facial expression.
	 *
	 * @param expression - One of: "normal", "excited", "bored", "surprised"
	 */
	export function setExpression(expression: string): void {
		if (expressionProp) {
			expressionProp.value = expression;
		}
	}

	// React to isHappy changes
	$effect(() => {
		const happy = isHappy;
		if (riveInstance && riveLoaded) {
			setBooleanInput(riveInstance, 'State Machine 1', 'IsClose', happy);
		}
	});

	onDestroy(() => {
		// Cancel any in-progress lookAt animation
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
		}
		cleanupVisibility?.();
		cleanupTabVisibility?.();
		cleanupResize?.();
		riveInstance?.cleanup();
	});

	// Determine what to show
	let showRive = $derived(shouldUseRive && riveLoaded && !riveError);
	let showEmoji = $derived(!shouldUseRive || riveError || !riveLoaded);
</script>

<!-- Rive Canvas (hidden if not loaded or error) -->
<canvas
	bind:this={canvas}
	class="h-full w-full max-w-full {className}"
	class:hidden={!showRive}
	aria-label="Animated monster companion"
	style="max-width: 100vw;"
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
