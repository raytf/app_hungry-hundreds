/**
 * Soft target used in prompt guidance only.
 * Dialogue is no longer hard-truncated locally.
 */
export const SOFT_DIALOGUE_TARGET_CHARS = 120;

export function formatDialogueText(rawText: string): string {
	const text = rawText.replace(/\s+/g, ' ').trim();
	return text;
}
