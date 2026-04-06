/**
 * Dialogue Store — Phase C
 *
 * Svelte 5 $state-based store for Gonn's speech bubble.
 * Decouples the dialogue pipeline from the Rive VM so the HTML
 * SpeechBubble component can subscribe reactively.
 *
 * Usage:
 *   showDialogue('Hello!');                    // 30ms/char, 3500ms display
 *   showDialogue('Fast!', { charDelayMs: 15 });
 *   hideDialogue();
 */

export interface DialogueState {
	text: string;
	visible: boolean;
	charDelayMs: number;
	displayMs: number;
}

export interface ShowDialogueOptions {
	charDelayMs?: number;
	displayMs?: number;
}

function createDialogueStore() {
	let text = $state('');
	let visible = $state(false);
	let charDelayMs = $state(30);
	let displayMs = $state(3500);

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
		get displayMs() {
			return displayMs;
		},

		show(newText: string, opts?: ShowDialogueOptions) {
			text = newText;
			charDelayMs = opts?.charDelayMs ?? 30;
			displayMs = opts?.displayMs ?? 3500;
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
