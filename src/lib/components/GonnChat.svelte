<script lang="ts">
	import { tick } from 'svelte';
	import { chatStore } from '$lib/stores/chat.svelte';

	let { visible = $bindable(false) }: { visible: boolean } = $props();

	let inputValue = $state('');
	let messagesEl = $state<HTMLDivElement | undefined>();

	const SUGGESTIONS = [
		'How am I doing overall?',
		'Which habit needs the most attention?',
		'Why do I keep missing habits?',
		'Am I making real progress?',
		'What should I focus on tomorrow?'
	];

	$effect(() => {
		if (visible) {
			chatStore.loadOrCreateSession();
		}
	});

	$effect(() => {
		// Track reactive dependencies for auto-scroll
		chatStore.session?.messages;
		chatStore.streamingContent;
		tick().then(() => {
			messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
		});
	});

	async function handleSubmit() {
		if (!inputValue.trim() || chatStore.streaming) return;
		const msg = inputValue;
		inputValue = '';
		await chatStore.send(msg);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
		}
	}

	function useSuggestion(text: string) {
		inputValue = text;
		handleSubmit();
	}
</script>

{#if visible}
	<div class="chat-overlay" role="dialog" aria-label="Chat with Gonn" aria-modal="true">
		<div class="chat-panel">
			<header class="chat-header">
				<span class="chat-title">💬 Chat with Gonn</span>
				<button class="close-btn" onclick={() => (visible = false)} aria-label="Close chat"
					>✕</button
				>
			</header>

			<div class="messages" bind:this={messagesEl}>
				{#if chatStore.session?.messages.length === 0 && !chatStore.streaming}
					<div class="empty-state">
						<p class="empty-hint">Ask Gonn about your habits...</p>
						<div class="suggestions">
							{#each SUGGESTIONS as suggestion}
								<button class="suggestion-chip" onclick={() => useSuggestion(suggestion)}>
									{suggestion}
								</button>
							{/each}
						</div>
					</div>
				{/if}

				{#each chatStore.session?.messages ?? [] as msg}
					<div class="message {msg.role}">
						<p>{msg.content}</p>
					</div>
				{/each}

				{#if chatStore.streaming}
					<div class="message assistant streaming">
						<p>{chatStore.streamingContent || '…'}<span class="cursor">▊</span></p>
					</div>
				{/if}

				{#if chatStore.error}
					<div class="error-banner">
						{chatStore.error}
						<button onclick={() => chatStore.clearError()}>Dismiss</button>
					</div>
				{/if}
			</div>

			<footer class="chat-footer">
				<textarea
					bind:value={inputValue}
					onkeydown={handleKeydown}
					placeholder={chatStore.streaming ? 'Gonn is thinking...' : 'Ask Gonn anything...'}
					disabled={chatStore.streaming}
					rows="1"
				></textarea>
				<button
					class="send-btn"
					onclick={handleSubmit}
					disabled={chatStore.streaming || !inputValue.trim()}
					aria-label="Send message"
				>
					↑
				</button>
			</footer>
		</div>
	</div>
{/if}

<style>
	.chat-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		z-index: 200;
		padding: 0 0 env(safe-area-inset-bottom);
	}

	.chat-panel {
		background: var(--color-surface, #1a1a2e);
		border: 1px solid var(--color-border, #2a2a4a);
		border-radius: 20px 20px 0 0;
		width: 100%;
		max-width: 480px;
		height: 70vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		animation: slideUp 0.25s ease-out;
	}

	.chat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 14px 18px;
		border-bottom: 1px solid var(--color-border, #2a2a4a);
		flex-shrink: 0;
	}

	.chat-title {
		font-weight: 600;
		font-size: 15px;
		color: var(--color-text, #e0e0e0);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted, #888);
		cursor: pointer;
		font-size: 16px;
		padding: 4px 8px;
	}

	.messages {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		scroll-behavior: smooth;
	}

	.message {
		max-width: 80%;
		padding: 10px 14px;
		border-radius: 14px;
		font-size: 14px;
		line-height: 1.45;
	}

	.message p {
		margin: 0;
		color: var(--color-text, #e0e0e0);
	}

	.message.user {
		align-self: flex-end;
		background: var(--color-accent, #4a3fa0);
		border-bottom-right-radius: 4px;
	}

	.message.assistant {
		align-self: flex-start;
		background: var(--color-surface-raised, #252540);
		border-bottom-left-radius: 4px;
	}

	.cursor {
		display: inline-block;
		animation: blink 1s step-end infinite;
		opacity: 0.7;
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 8px 0;
	}

	.empty-hint {
		margin: 0;
		font-size: 13px;
		color: var(--color-text-muted, #888);
		text-align: center;
	}

	.suggestions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.suggestion-chip {
		background: var(--color-surface-raised, #252540);
		border: 1px solid var(--color-border, #2a2a4a);
		border-radius: 20px;
		padding: 6px 12px;
		font-size: 12px;
		color: var(--color-text, #e0e0e0);
		cursor: pointer;
		transition: background 0.15s;
	}

	.suggestion-chip:hover {
		background: var(--color-surface-hover, #2e2e50);
	}

	.error-banner {
		background: rgba(200, 50, 50, 0.2);
		border: 1px solid rgba(200, 50, 50, 0.4);
		border-radius: 10px;
		padding: 8px 12px;
		font-size: 13px;
		color: #ff8080;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.error-banner button {
		background: none;
		border: none;
		color: #ff8080;
		cursor: pointer;
		font-size: 12px;
		padding: 0 4px;
	}

	.chat-footer {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		padding: 12px 16px;
		border-top: 1px solid var(--color-border, #2a2a4a);
		flex-shrink: 0;
	}

	textarea {
		flex: 1;
		background: var(--color-surface-raised, #252540);
		border: 1px solid var(--color-border, #2a2a4a);
		border-radius: 12px;
		padding: 10px 14px;
		color: var(--color-text, #e0e0e0);
		font-size: 14px;
		resize: none;
		line-height: 1.4;
		max-height: 120px;
		overflow-y: auto;
		outline: none;
	}

	textarea:focus {
		border-color: var(--color-accent, #4a3fa0);
	}

	textarea::placeholder {
		color: var(--color-text-muted, #888);
	}

	.send-btn {
		background: var(--color-accent, #4a3fa0);
		border: none;
		border-radius: 50%;
		width: 38px;
		height: 38px;
		color: white;
		font-size: 18px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		transition: opacity 0.15s;
	}

	.send-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	@keyframes slideUp {
		from {
			transform: translateY(40px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	@keyframes blink {
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 0;
		}
	}
</style>
