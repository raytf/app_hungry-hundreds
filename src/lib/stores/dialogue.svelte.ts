/**
 * Dialogue Store — Phase C
 *
 * Svelte 5 $state-based store for Gonn's speech bubble.
 * Decouples the dialogue pipeline from the Rive VM so the HTML
 * SpeechBubble component can subscribe reactively.
 *
 * Usage:
 *   showDialogue('Hello!');                    // 30ms/char, stays until dismissed
 *   showDialogue('Fast!', { charDelayMs: 15 });
 *   hideDialogue();
 */

export interface DialogueState {
	text: string;
	visible: boolean;
	charDelayMs: number;
}

export interface ShowDialogueOptions {
	charDelayMs?: number;
}

function createDialogueStore() {
	let text = $state('');
	let visible = $state(false);
	let charDelayMs = $state(30);

	return {
		get text() {
			return text;
		},
		get visible() {
			return visible;
		},
		get charDelayMs() {
			return charDelayMs;
		},

		show(newText: string, opts?: ShowDialogueOptions) {
			text = newText;
			charDelayMs = opts?.charDelayMs ?? 30;
			visible = true;
		},

		hide() {
			visible = false;
		}
	};
}

export const dialogueStore = createDialogueStore();

/**
 * Show Gonn's speech bubble with the given text.
 * Text streams in character-by-character at charDelayMs intervals.
 */
export function showDialogue(text: string, opts?: ShowDialogueOptions) {
	dialogueStore.show(text, opts);
}

/**
 * Immediately hide the speech bubble.
 */
export function hideDialogue() {
	dialogueStore.hide();
}
