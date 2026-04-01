/**
 * Chat History Utility (Phase 8)
 *
 * Handles trimming and summarising chat turns before sending to the LLM.
 * Keeps the context window bounded at WINDOW_SIZE turns.
 *
 * @see docs/features/chatbot-spec.md — Step 2
 */
import type { ChatMessage, ChatSession } from '$lib/types/mascot';

/** Maximum number of recent turns to include verbatim in the LLM context. */
const WINDOW_SIZE = 10;

/**
 * Returns a trimmed messages array safe to send to the LLM.
 * Keeps the last WINDOW_SIZE turns. If a summary of older turns exists,
 * it is prepended as a synthetic user/assistant exchange.
 */
export function trimHistory(session: Pick<ChatSession, 'messages' | 'summary'>): ChatMessage[] {
	const { messages, summary } = session;

	if (messages.length <= WINDOW_SIZE) return messages;

	const recent = messages.slice(-WINDOW_SIZE);

	if (summary) {
		return [
			{ role: 'user', content: `[Earlier in our conversation: ${summary}]` },
			{ role: 'assistant', content: 'I remember. I have digested all of it.' },
			...recent
		];
	}

	return recent;
}

/**
 * Produces a 1–2 sentence plain-text summary of the provided messages.
 * Used when session history exceeds WINDOW_SIZE to compress older turns.
 * Call this before slicing, passing the turns being discarded.
 */
export function summariseTurns(turns: ChatMessage[]): string {
	const assistantLines = turns
		.filter((m) => m.role === 'assistant')
		.map((m) => m.content.slice(0, 60))
		.join(' | ');
	return `Gonn previously discussed: ${assistantLines}`;
}

