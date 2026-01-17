<script lang="ts">
	import type { Snippet } from 'svelte';
	import SyncStatusIndicator from './SyncStatusIndicator.svelte';

	interface Props {
		title?: string;
		showBack?: boolean;
		/** Show compact sync status indicator in header */
		showSyncStatus?: boolean;
		right?: Snippet;
	}

	let { title = '', showBack = false, showSyncStatus = false, right }: Props = $props();
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
		<div class="flex items-center gap-2">
			{#if showSyncStatus}
				<SyncStatusIndicator compact />
			{/if}
			{#if right}
				{@render right()}
			{/if}
		</div>
	</div>
</header>
