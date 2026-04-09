import { describe, expect, it } from 'vitest';
import { formatDialogueText, MAX_DIALOGUE_CHARS } from '../../../supabase/functions/gonn-dialogue/format';

describe('formatDialogueText', () => {
	it('returns short dialogue unchanged', () => {
		const text = 'Morning, champ. Feed that streak.';
		expect(formatDialogueText(text)).toBe(text);
	});

	it('preserves complete dialogue longer than 80 chars when still within 160', () => {
		const text =
			'Morning, champ. Your Hungry Hundreds Post is screaming for attention at day 35-drop the excuses and feed that streak before it bites back.';

		expect(text.length).toBeGreaterThan(80);
		expect(text.length).toBeLessThanOrEqual(MAX_DIALOGUE_CHARS);
		expect(formatDialogueText(text)).toBe(text);
	});

	it('prefers a complete sentence when trimming overlong dialogue', () => {
		const text =
			'Morning, champ. Your Hungry Hundreds Post is screaming for attention at day 35-drop the excuses and feed that streak before it bites back. Extra garnish that should not survive the trim.';
		const result = formatDialogueText(text);

		expect(result.length).toBeLessThanOrEqual(MAX_DIALOGUE_CHARS);
		expect(result.endsWith('.')).toBe(true);
		expect(result).not.toContain('Extra garnish');
	});

	it('falls back to a word boundary with ellipsis when no sentence end exists', () => {
		const text = Array.from({ length: 45 }, (_, i) => `word${i}`).join(' ');
		const result = formatDialogueText(text);

		expect(result.length).toBeLessThanOrEqual(MAX_DIALOGUE_CHARS);
		expect(result.endsWith('…')).toBe(true);
	});
});