/**
 * Rive Animation Utilities
 *
 * Helper functions for Rive integration including WebGL detection,
 * visibility management, and performance optimizations.
 *
 * @see docs/ANIMATION.md for animation system documentation
 */
import type { Rive } from '@rive-app/canvas';

// ============================================================================
// WebGL Detection
// ============================================================================

/**
 * Check if the browser supports WebGL (required for Rive)
 * Returns true if WebGL or WebGL2 is available
 */
export function supportsWebGL(): boolean {
	if (typeof window === 'undefined') return false;

	try {
		const canvas = document.createElement('canvas');
		const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
		return gl !== null;
	} catch {
		return false;
	}
}

/**
 * Check if Rive should be enabled
 * Considers WebGL support and reduced motion preference
 */
export function shouldEnableRive(): boolean {
	if (typeof window === 'undefined') return false;

	// Check WebGL support
	if (!supportsWebGL()) return false;

	// Rive can still run with reduced motion, but we might want to
	// disable complex animations. For now, we allow it.
	return true;
}

// ============================================================================
// Visibility Management
// ============================================================================

/**
 * Create an IntersectionObserver to pause/play Rive when off-screen
 * This saves battery and CPU when the animation isn't visible
 *
 * @param riveInstance - The Rive instance to control
 * @param element - The element to observe (usually the canvas)
 * @returns Cleanup function to disconnect the observer
 */
export function createVisibilityObserver(riveInstance: Rive, element: HTMLElement): () => void {
	const observer = new IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				if (entry.isIntersecting) {
					riveInstance.play();
				} else {
					riveInstance.pause();
				}
			});
		},
		{ threshold: 0.1 }
	);

	observer.observe(element);

	return () => observer.disconnect();
}

/**
 * Handle document visibility changes (tab switching)
 * Pauses Rive when tab is hidden to save resources
 *
 * @param riveInstance - The Rive instance to control
 * @returns Cleanup function to remove the event listener
 */
export function createTabVisibilityHandler(riveInstance: Rive): () => void {
	const handler = () => {
		if (document.hidden) {
			riveInstance.pause();
		} else {
			riveInstance.play();
		}
	};

	document.addEventListener('visibilitychange', handler);

	return () => document.removeEventListener('visibilitychange', handler);
}

// ============================================================================
// Reduced Motion
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ============================================================================
// State Machine Helpers
// ============================================================================

/**
 * Safely get a state machine input by name
 *
 * @param riveInstance - The Rive instance
 * @param stateMachineName - Name of the state machine
 * @param inputName - Name of the input to find
 * @returns The input or undefined if not found
 */
export function getStateMachineInput(
	riveInstance: Rive,
	stateMachineName: string,
	inputName: string
) {
	try {
		const inputs = riveInstance.stateMachineInputs(stateMachineName);
		return inputs?.find((i) => i.name === inputName);
	} catch {
		console.warn(`Could not find state machine input: ${inputName}`);
		return undefined;
	}
}

/**
 * Safely set a boolean state machine input
 */
export function setBooleanInput(
	riveInstance: Rive,
	stateMachineName: string,
	inputName: string,
	value: boolean
): void {
	const input = getStateMachineInput(riveInstance, stateMachineName, inputName);
	if (input && 'value' in input) {
		input.value = value;
	}
}

/**
 * Safely set a number state machine input
 */
export function setNumberInput(
	riveInstance: Rive,
	stateMachineName: string,
	inputName: string,
	value: number
): void {
	const input = getStateMachineInput(riveInstance, stateMachineName, inputName);
	if (input && 'value' in input) {
		input.value = value;
	}
}

/**
 * Safely fire a trigger state machine input
 */
export function fireTrigger(riveInstance: Rive, stateMachineName: string, inputName: string): void {
	const input = getStateMachineInput(riveInstance, stateMachineName, inputName);
	if (input && 'fire' in input) {
		(input as { fire: () => void }).fire();
	}
}
