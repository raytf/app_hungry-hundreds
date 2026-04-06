<script lang="ts">
	/**
	 * Monster Component
	 *
	 * Renders the monster companion using Rive animations with CharacterVM
	 * view model data binding for head tracking (headX, headY).
	 * Falls back to emoji display if Rive fails to load or WebGL is unavailable.
	 *
	 * Subscribes to `mascotState` store for rule-engine-driven updates
	 * (emotion, look direction, intensity, evolution stage).
	 * Also exports `lookAt()` and `setExpression()` for manual overrides.
	 *
	 * @see docs/ANIMATION.md for animation system documentation
	 * @see src/lib/stores/mascot.ts — reactive MascotState source
	 */
	import { onMount, onDestroy, tick } from 'svelte';
	import { monsterStages, type MonsterStage } from '$lib/stores/monster';
	import {
		mascotState,
		riveLookX,
		riveLookY,
		emotionNumber,
		riveIntensity
	} from '$lib/stores/mascot';
	import type { EvolutionStage } from '$lib/types/mascot';
	import {
		supportsWebGL,
		createVisibilityObserver,
		createTabVisibilityHandler
	} from '$lib/animations/rive-utils';
	import type {
		Rive as RiveType,
		ViewModelInstanceNumber,
		ViewModelInstanceString,
		ViewModelInstanceBoolean
	} from '@rive-app/canvas';

	interface Props {
		/** Current evolution stage (legacy prop — overridden by mascotState when available) */
		stage?: MonsterStage;
		/** Additional CSS classes */
		class?: string;
	}

	let { stage: stageProp, class: className = '' }: Props = $props();

	// Map EvolutionStage number → MonsterStage string for emoji fallback
	const STAGE_TO_MONSTER: Record<EvolutionStage, MonsterStage> = {
		1: 'egg',
		2: 'baby',
		3: 'teen',
		4: 'adult',
		5: 'elder'
	};

	// Derive effective stage: mascotState takes priority over prop
	let effectiveStage = $derived(
		STAGE_TO_MONSTER[$mascotState.evolutionStage] ?? stageProp ?? 'egg'
	);

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
	let intensityProp: ViewModelInstanceNumber | null = null;
	let emotionProp: ViewModelInstanceNumber | null = null;
	let dialogueProp: ViewModelInstanceString | null = null;
	let dialogueVisibleProp: ViewModelInstanceBoolean | null = null;

	// Typewriter state
	let typewriterInterval: ReturnType<typeof setInterval> | null = null;
	let dialogueHideTimeout: ReturnType<typeof setTimeout> | null = null;

	// Current interpolated values for smooth animation
	let currentHeadX = 0;
	let currentHeadY = 0;
	let animationFrameId: number | null = null;

	// Whether lookAt is currently overriding rule engine look direction
	let manualLookOverride = false;
	let manualLookTimeout: ReturnType<typeof setTimeout> | null = null;

	// Whether setExpression is currently overriding the rule engine emotion
	let manualExpressionOverride = false;
	let manualExpressionTimeout: ReturnType<typeof setTimeout> | null = null;

	// Map debug expression names → rule engine emotion numbers
	const EXPRESSION_TO_EMOTION: Record<string, number> = {
		normal: 0, // idle
		excited: 2, // excited
		bored: 3, // tired
		surprised: 1 // happy (closest available)
	};

	// Get emoji fallback config
	let stageConfig = $derived(monsterStages[effectiveStage]);

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
				src: '/animations/monster.riv',
				artboard: 'Artboard',
				canvas,
				autoplay: true,
				stateMachines: 'State Machine 1',
				useOffscreenRenderer: true,
				autoBind: true,
				layout: new Layout({
					fit: Fit.Cover,
					alignment: Alignment.BottomCenter
				}),
				onLoad: () => {
					// Set up CharacterVM view model properties
					initViewModel();

					// Make the canvas visible — class:hidden is removed once riveLoaded = true
					riveLoaded = true;

					// The canvas was display:none until riveLoaded = true, so
					// clientWidth/clientHeight were 0 when Rive initialised. Wait for
					// Svelte to flush the DOM (tick), then resize the drawing surface
					// to the now-visible canvas dimensions.
					tick().then(() => {
						riveInstance?.resizeDrawingSurfaceToCanvas();
					});

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
	 * Initialize the CharacterVM view model properties.
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
		intensityProp = vmInstance.number('intensity');
		emotionProp = vmInstance.number('emotion');
		dialogueProp = vmInstance.string('dialogueText');
		dialogueVisibleProp = vmInstance.boolean('dialogueVisible');

		if (!headXProp || !headYProp) {
			console.warn('Monster: Could not find headX/headY properties on CharacterVM');
		}
	}

	// ============================================================================
	// Rule Engine → Rive Bridge ($effect)
	// ============================================================================

	/**
	 * Reactively push mascotState values to Rive view model properties.
	 * Skips look direction when a manual lookAt override is active.
	 * Skips emotion when a manual setExpression override is active.
	 */
	$effect(() => {
		if (!riveLoaded) return;

		// Emotion number (0–7) — skip when manual expression override is active
		if (!manualExpressionOverride) {
			if (emotionProp) emotionProp.value = $emotionNumber;
		}

		// Intensity (0–1)
		if (intensityProp) intensityProp.value = $riveIntensity;

		// Look direction (only when not manually overridden)
		if (!manualLookOverride) {
			if (headXProp) headXProp.value = $riveLookX;
			if (headYProp) headYProp.value = $riveLookY;
			currentHeadX = $riveLookX;
			currentHeadY = $riveLookY;
		}
	});

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

		// Temporarily override rule engine look direction
		manualLookOverride = true;
		if (manualLookTimeout) clearTimeout(manualLookTimeout);
		manualLookTimeout = setTimeout(() => {
			manualLookOverride = false;
		}, duration + 500); // release after animation + settle time

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
	 * Temporarily overrides the rule engine emotion for 3 seconds.
	 *
	 * @param expression - One of: "normal", "excited", "bored", "surprised"
	 */
	export function setExpression(expression: string): void {
		// Pause the rule engine emotion update for 3 seconds
		manualExpressionOverride = true;
		if (manualExpressionTimeout) clearTimeout(manualExpressionTimeout);
		manualExpressionTimeout = setTimeout(() => {
			manualExpressionOverride = false;
		}, 3000);

		// Set string expression property (Rive string input)
		if (expressionProp) expressionProp.value = expression;

		// Also drive the emotion number so the state machine responds
		const emotionNum = EXPRESSION_TO_EMOTION[expression];
		if (emotionNum !== undefined && emotionProp) {
			emotionProp.value = emotionNum;
		}
	}

	/**
	 * Display dialogue text inside the Rive speech bubble using a typewriter effect.
	 * Shows the bubble, types out the text character-by-character, then hides the bubble
	 * after the full text has been visible for `displayMs` milliseconds.
	 *
	 * No-ops if the Rive view model dialogue properties are not available
	 * (e.g., Rive failed to load or the artboard has no speech bubble).
	 *
	 * @param text       - Dialogue string (max ~80 chars)
	 * @param charDelayMs  - Milliseconds between each typed character (default: 30)
	 * @param displayMs  - How long the complete message stays visible before hiding (default: 3500)
	 */
	export function setDialogue(text: string, charDelayMs = 30, displayMs = 3500): void {
		if (!dialogueProp || !dialogueVisibleProp) return;

		// Cancel any in-progress typewriter
		if (typewriterInterval !== null) {
			clearInterval(typewriterInterval);
			typewriterInterval = null;
		}
		if (dialogueHideTimeout !== null) {
			clearTimeout(dialogueHideTimeout);
			dialogueHideTimeout = null;
		}

		// Reset text and show the bubble
		dialogueProp.value = '';
		dialogueVisibleProp.value = true;

		// Type out the text character by character
		let charIndex = 0;
		typewriterInterval = setInterval(() => {
			charIndex++;
			if (dialogueProp) dialogueProp.value = text.slice(0, charIndex);

			if (charIndex >= text.length) {
				if (typewriterInterval !== null) {
					clearInterval(typewriterInterval);
					typewriterInterval = null;
				}
				// Hide the bubble after the display duration
				dialogueHideTimeout = setTimeout(() => {
					if (dialogueVisibleProp) dialogueVisibleProp.value = false;
					dialogueHideTimeout = null;
				}, displayMs);
			}
		}, charDelayMs);
	}

	onDestroy(() => {
		// Cancel any in-progress lookAt animation
		if (animationFrameId !== null) {
			cancelAnimationFrame(animationFrameId);
		}
		if (manualLookTimeout) clearTimeout(manualLookTimeout);
		if (manualExpressionTimeout) clearTimeout(manualExpressionTimeout);
		if (typewriterInterval !== null) clearInterval(typewriterInterval);
		if (dialogueHideTimeout !== null) clearTimeout(dialogueHideTimeout);
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
