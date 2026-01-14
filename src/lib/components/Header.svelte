<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		showBack?: boolean;
		right?: Snippet;
	}

	let { title = '', showBack = false, right }: Props = $props();
</script>

<header class="sticky top-0 z-10 border-b border-gray-100 bg-gray-50/80 backdrop-blur-lg">
	<div class="mx-auto flex h-14 max-w-lg items-center gap-3 px-4">
		{#if showBack}
			<a
				href="/"
				class="-ml-2 p-2 text-gray-600 transition-colors hover:text-gray-900"
				aria-label="Go back"
			>
				<span class="text-xl">←</span>
			</a>
		{/if}
		<h1 class="flex-1 truncate text-lg font-semibold">{title}</h1>
		{#if right}
			<div class="flex items-center">
				{@render right()}
			</div>
		{/if}
	</div>
</header>

