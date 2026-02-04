/**
 * Motion One Animation Utilities
 *
 * Lightweight micro-interactions for UI feedback.
 * All animations respect the user's reduced motion preference.
 *
 * @see docs/ANIMATION.md for animation system documentation
 */
import { animate, spring } from 'motion';

// ============================================================================
// Reduced Motion Detection
// ============================================================================

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
	if (typeof window === 'undefined') return false;
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// ============================================================================
// Button Animations
// ============================================================================

/**
 * Spring animation for button taps
 * Provides satisfying tactile feedback on press
 *
 * @param element - The button element to animate
 * @returns Animation controls (can be used to cancel)
 */
export function buttonSpring(element: HTMLElement) {
	if (prefersReducedMotion()) {
		// Simple opacity change for reduced motion
		return animate(element, { opacity: [0.7, 1] }, { duration: 0.1 });
	}

	return animate(
		element,
		{ scale: [1, 0.95, 1.02, 1] },
		{ duration: 0.3, easing: spring({ stiffness: 500, damping: 15 }) }
	);
}

/**
 * Checkmark pop animation for completion indicators
 *
 * @param element - The checkmark element to animate
 */
export function checkmarkPop(element: HTMLElement) {
	if (prefersReducedMotion()) {
		return animate(element, { opacity: [0, 1] }, { duration: 0.15 });
	}

	return animate(element, { scale: [0, 1.2, 1], rotate: [0, 10, 0] }, { duration: 0.4 });
}

// ============================================================================
// List Animations
// ============================================================================

/**
 * Staggered entrance animation for list items
 *
 * @param elements - Array of list item elements
 * @param delay - Delay between each item in ms (default: 50)
 */
export function staggerList(elements: HTMLElement[], delay = 50) {
	if (prefersReducedMotion()) {
		// Instant appearance for reduced motion
		elements.forEach((el) => {
			el.style.opacity = '1';
		});
		return;
	}

	elements.forEach((el, i) => {
		animate(el, { opacity: [0, 1], y: [20, 0] }, { delay: (i * delay) / 1000, duration: 0.3 });
	});
}

// ============================================================================
// Celebration Animations
// ============================================================================

/**
 * Celebration animation for milestones
 * Combines scale bounce with CSS particle effect
 *
 * @param element - The element to celebrate
 */
export function celebrate(element: HTMLElement) {
	if (prefersReducedMotion()) {
		// Simple pulse for reduced motion
		return animate(element, { opacity: [1, 0.8, 1] }, { duration: 0.3 });
	}

	// Scale bounce
	animate(element, { scale: [1, 1.15, 1] }, { duration: 0.4 });

	// Add CSS class for particle effect (defined in app.css)
	element.classList.add('celebrate');
	setTimeout(() => element.classList.remove('celebrate'), 1000);
}

// ============================================================================
// Page Transitions
// ============================================================================

/**
 * Page transition configuration for SvelteKit
 */
export const pageTransition = {
	in: { opacity: [0, 1], y: [20, 0] },
	out: { opacity: [1, 0], y: [0, -20] },
	duration: 0.25
};

// ============================================================================
// Icon Animations
// ============================================================================

/**
 * Icon tap animation for navigation items
 *
 * @param element - The icon element to animate
 */
export function iconTap(element: HTMLElement) {
	if (prefersReducedMotion()) {
		return animate(element, { opacity: [0.7, 1] }, { duration: 0.1 });
	}

	return animate(
		element,
		{ scale: [1, 0.85, 1.1, 1] },
		{ duration: 0.25, easing: spring({ stiffness: 400, damping: 10 }) }
	);
}

