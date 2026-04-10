import { describe, expect, it } from 'vitest';
import { formatDialogueText } from '../../../supabase/functions/gonn-dialogue/format';

describe('formatDialogueText', () => {
	it('returns short dialogue unchanged', () => {
		const text = 'Morning, champ. Feed that streak.';
		expect(formatDialogueText(text)).toBe(text);
	});

	it('normalizes repeated whitespace without truncating text', () => {
		const text = 'Morning, champ.\n\nYour streak   still counts.';
		expect(formatDialogueText(text)).toBe('Morning, champ. Your streak still counts.');
	});

	it('preserves complete dialogue longer than the former hard cap', () => {
		const text =
			'Morning, champ. Your Hungry Hundreds Post is screaming for attention at day 35-drop the excuses and feed that streak before it bites back before the gremlin in your schedule starts filing complaints and calling this negligence.';

		expect(text.length).toBeGreaterThan(160);
		expect(formatDialogueText(text)).toBe(text);
	});
});
