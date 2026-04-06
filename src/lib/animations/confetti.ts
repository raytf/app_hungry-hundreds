/**
 * Confetti Animation — Phase G
 *
 * Thin wrapper around canvas-confetti for milestone celebrations.
 * Colors match the Gonn design system palette (gonn-gold, accent-soft, accent-warm).
 * Respects prefers-reduced-motion.
 *
 * @see docs/features/design-guide-implementation.md §Phase G
 */
import confetti from 'canvas-confetti';

/** Warm/gold palette from the design guide §8.4 */
const PALETTE = [
	'#EFD67C', // gonn-gold
	'#F2C78A', // accent-soft
	'#E8713A' // accent-warm
];

/**
 * Fire a confetti burst for habit milestone completions (7, 30, 100 day streaks).
 * 30–50 particles in the warm palette, burst from top-center.
 * No-op when prefers-reduced-motion is active.
 *
 * @param _element - Optional hint element (unused; burst origin is always top-center)
 */
export function celebrateMilestone(_element?: HTMLElement): void {
	if (typeof window === 'undefined') return;
	if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

	const count = Math.floor(Math.random() * 21) + 30; // 30–50

	confetti({
		particleCount: count,
		spread: 60,
		origin: { x: 0.5, y: 0.1 },
		colors: PALETTE,
		scalar: 0.8,
		gravity: 1,
		drift: 0,
		ticks: 120
	});
}
