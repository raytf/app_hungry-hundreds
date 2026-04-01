/**
 * Chat Store (Phase 8)
 *
 * Manages the multi-turn chat session with Gonn.
 * Uses Svelte 5 runes for reactive state, Dexie for persistence,
 * and SSE streaming from the gonn-chat edge function.
 *
 * @see docs/features/chatbot-spec.md — Step 4
 */
import { get } from 'svelte/store';
import { db } from '$lib/db/db';
import { gonnState } from '$lib/stores/gonn';
import { globalSnapshot } from '$lib/stores/mascot';
import { getMemoryContext } from '$lib/ai/memory';
import { trimHistory, summariseTurns } from '$lib/ai/chatHistory';
import { supabase } from '$lib/supabase/client';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import type { ChatMessage, ChatSession } from '$lib/types/mascot';

const WINDOW_SIZE = 10;

class ChatStore {
	session = $state<ChatSession | null>(null);
	streaming = $state(false);
	streamingContent = $state('');
	error = $state<string | null>(null);

	async loadOrCreateSession() {
		const existing = await db.chatSessions.orderBy('createdAt').last();
		if (existing) {
			this.session = existing;
		} else {
			const newSession: ChatSession = {
				messages: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};
			const id = await db.chatSessions.add(newSession);
			this.session = { ...newSession, id };
		}
		this.streaming = false;
		this.streamingContent = '';
		this.error = null;
	}

	async send(userInput: string) {
		if (!userInput.trim() || this.streaming || !this.session) return;

		const userMsg: ChatMessage = { role: 'user', content: userInput };

		this.session = {
			...this.session,
			messages: [...this.session.messages, userMsg],
			updatedAt: new Date().toISOString()
		};
		this.streaming = true;
		this.streamingContent = '';
		this.error = null;

		const session = this.session;

		// Summarise overflow turns before trimming
		let summary = session.summary;
		if (session.messages.length > WINDOW_SIZE) {
			const overflow = session.messages.slice(0, session.messages.length - WINDOW_SIZE);
			summary = summariseTurns(overflow);
		}

		const trimmed = trimHistory({ messages: session.messages, summary });

		// Build request payload using current store values
		const memory = await getMemoryContext();
		const snapshot = get(globalSnapshot);
		const gonn = get(gonnState);

		const payload = {
			messages: trimmed,
			gonn,
			habits: snapshot.habits.map((h) => ({
				name: h.habitName,
				flavorTag: h.flavorTag,
				completionCount: h.completionCount,
				streakLength: h.streakLength,
				completedToday: h.completedToday,
				dangerZone: h.dangerZone,
				dangerZoneLabel: h.dangerZoneLabel,
				window: {
					completionsInWindow: h.window?.completionsInWindow,
					targetForWindow: h.window?.targetForWindow,
					daysRemaining: h.window?.daysRemaining
				}
			})),
			memory
		};

		try {
			const {
				data: { session: authSession }
			} = await supabase.auth.getSession();
			const token = authSession?.access_token ?? '';

			const res = await fetch(`${PUBLIC_SUPABASE_URL}/functions/v1/gonn-chat`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify(payload)
			});

			if (!res.ok || !res.body) {
				this.streaming = false;
				this.error = 'Failed to reach Gonn.';
				return;
			}

			// Check for JSON error responses (rate limit, upstream error, etc.)
			const contentType = res.headers.get('content-type') ?? '';
			if (contentType.includes('application/json')) {
				const json = (await res.json()) as Record<string, unknown>;
				this.streaming = false;
				this.error =
					(json.message as string | undefined) ??
					(json.error as string | undefined) ??
					'Gonn is unavailable right now.';
				return;
			}

			// Parse SSE stream
			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let fullResponse = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				for (const line of chunk.split('\n')) {
					if (!line.startsWith('data: ')) continue;
					const raw = line.slice(6).trim();
					if (raw === '[DONE]') break;
					try {
						const data = JSON.parse(raw);
						if (data.type === 'content_block_delta' && data.delta?.text) {
							fullResponse += data.delta.text;
							this.streamingContent = fullResponse;
						}
					} catch {
						/* ignore malformed SSE lines */
					}
				}
			}

			// Commit completed assistant message
			const assistantMsg: ChatMessage = { role: 'assistant', content: fullResponse };
			const updatedSession: ChatSession = {
				...this.session,
				messages: [...this.session.messages, assistantMsg],
				summary,
				updatedAt: new Date().toISOString()
			};
			db.chatSessions.put(updatedSession);
			this.session = updatedSession;
			this.streaming = false;
			this.streamingContent = '';
		} catch {
			this.streaming = false;
			this.error = 'Gonn is offline. Try again.';
		}
	}

	clearError() {
		this.error = null;
	}

	async newSession() {
		const newSession: ChatSession = {
			messages: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		};
		const id = await db.chatSessions.add(newSession);
		this.session = { ...newSession, id };
		this.streaming = false;
		this.streamingContent = '';
		this.error = null;
	}
}

export const chatStore = new ChatStore();
