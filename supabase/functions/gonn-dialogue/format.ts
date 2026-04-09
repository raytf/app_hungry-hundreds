export const MAX_DIALOGUE_CHARS = 160;

const SENTENCE_ENDINGS = ['.', '!', '?'] as const;
const PUNCTUATION_LOOKBACK_CHARS = 48;

export function formatDialogueText(rawText: string): string {
	const text = rawText.replace(/\s+/g, ' ').trim();
	if (!text) return '';
	if (text.length <= MAX_DIALOGUE_CHARS) return text;

	const withinLimit = text.slice(0, MAX_DIALOGUE_CHARS).trimEnd();
	const lastSentenceEnd = Math.max(...SENTENCE_ENDINGS.map((mark) => withinLimit.lastIndexOf(mark)));

	if (lastSentenceEnd >= MAX_DIALOGUE_CHARS - PUNCTUATION_LOOKBACK_CHARS) {
		return withinLimit.slice(0, lastSentenceEnd + 1);
	}

	const lastSpace = withinLimit.lastIndexOf(' ');
	if (lastSpace > 0) {
		return `${withinLimit.slice(0, lastSpace).trimEnd()}…`;
	}

	return `${withinLimit.slice(0, MAX_DIALOGUE_CHARS - 1).trimEnd()}…`;
}