<script lang="ts">
	import { tick } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import { chatStore } from '$lib/stores/chat.svelte';

	let inputValue = $state('');
	let messagesEl = $state<HTMLElement | undefined>();

	const SUGGESTIONS = [
		'How am I doing overall?',
		'Which habit needs the most attention?',
		'Why do I keep missing habits?',
		'Am I making real progress?',
		'What should I focus on tomorrow?'
	];

	$effect(() => {
		chatStore.loadOrCreateSession();
	});

	// Auto-scroll to bottom when messages or streaming content change
	$effect(() => {
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

<svelte:head>
	<title>Chat with Gonn | Hungry Hundreds</title>
</svelte:head>

<div class="flex h-screen flex-col bg-surface">
	<Header title="Gonn" showBack />

	<!-- Message list -->
	<div class="flex-1 overflow-y-auto" bind:this={messagesEl}>
		<div class="mx-auto flex max-w-lg flex-col gap-3 px-4 py-4">
			<!-- Empty state: suggestion chips -->
			{#if chatStore.session?.messages.length === 0 && !chatStore.streaming}
				<div class="flex flex-col items-center gap-4 pt-8 text-center">
					<p class="text-body text-content-subtle">Ask Gonn about your habits…</p>
					<div class="flex flex-wrap justify-center gap-2">
						{#each SUGGESTIONS as suggestion}
							<button
								onclick={() => useSuggestion(suggestion)}
								class="rounded-full border border-edge bg-surface-raised px-3 py-1.5 text-body-sm text-content transition-colors hover:bg-surface-sunken"
							>
								{suggestion}
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Message history -->
			{#each chatStore.session?.messages ?? [] as msg (msg)}
				<div
					class="max-w-[80%] rounded-2xl px-4 py-3 text-body leading-relaxed"
					class:self-end={msg.role === 'user'}
					class:bg-content={msg.role === 'user'}
					class:text-surface={msg.role === 'user'}
					class:rounded-br-sm={msg.role === 'user'}
					class:self-start={msg.role === 'assistant'}
					class:bg-surface-raised={msg.role === 'assistant'}
					class:text-content={msg.role === 'assistant'}
					class:rounded-bl-sm={msg.role === 'assistant'}
				>
					{msg.content}
				</div>
			{/each}

			<!-- Streaming response -->
			{#if chatStore.streaming}
				<div
					class="max-w-[80%] self-start rounded-2xl rounded-bl-sm bg-surface-raised px-4 py-3 text-body leading-relaxed text-content"
				>
					{chatStore.streamingContent || '…'}<span class="streaming-cursor">▊</span>
				</div>
			{/if}

			<!-- Error banner -->
			{#if chatStore.error}
				<div
					class="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
				>
					<div class="flex items-center justify-between gap-2">
						<span>{chatStore.error}</span>
						<button
							onclick={() => chatStore.clearError()}
							class="shrink-0 font-medium text-red-500 hover:text-red-700"
						>
							Dismiss
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Input bar -->
	<div class="shrink-0 border-t border-edge bg-surface px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
		<div class="mx-auto flex max-w-lg items-end gap-2">
			<textarea
				bind:value={inputValue}
				onkeydown={handleKeydown}
				placeholder={chatStore.streaming ? 'Gonn is thinking…' : 'Ask Gonn anything…'}
				disabled={chatStore.streaming}
				rows="1"
				class="input-field min-h-[44px] flex-1 resize-none overflow-hidden leading-relaxed"
			></textarea>
			<button
				onclick={handleSubmit}
				disabled={chatStore.streaming || !inputValue.trim()}
				aria-label="Send message"
				class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-warm text-white transition-opacity disabled:opacity-40"
			>
				<!-- Up-arrow send icon -->
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18" />
				</svg>
			</button>
		</div>
	</div>
</div>

<style>
	.streaming-cursor {
		display: inline-block;
		animation: blink 1s step-end infinite;
		opacity: 0.7;
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
