<script lang="ts">
	import { syncStore, isOnline, isSyncing, hasPendingChanges, syncStatusText } from '$lib/sync';
	import { isAuthenticated } from '$lib/stores/auth';

	interface Props {
		/** Show as compact icon-only version */
		compact?: boolean;
		/** Show detailed status text */
		showText?: boolean;
	}

	let { compact = false, showText = true }: Props = $props();

	// Manual sync trigger
	function handleSync() {
		syncStore.sync();
	}

	// Format last sync time
	function formatLastSync(timestamp: number | null): string {
		if (!timestamp) return 'Never';
		const diff = Date.now() - timestamp;
		const minutes = Math.floor(diff / 60000);
		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	}

	// Get status color
	const statusColor = $derived.by(() => {
		if (!$isOnline) return 'text-gray-400';
		if ($syncStore.status === 'error') return 'text-red-500';
		if ($syncStore.status === 'syncing') return 'text-hungry-500';
		if ($hasPendingChanges) return 'text-amber-500';
		return 'text-hungry-500';
	});

	// Get status icon
	const statusIcon = $derived.by(() => {
		if (!$isOnline) return '📡';
		if ($syncStore.status === 'error') return '⚠️';
		if ($syncStore.status === 'syncing') return '🔄';
		if ($hasPendingChanges) return '📤';
		return '✓';
	});
</script>

{#if compact}
	<!-- Compact icon-only indicator -->
	<button
		onclick={handleSync}
		class="relative flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
		class:animate-spin={$isSyncing}
		title={$syncStatusText}
		aria-label={$syncStatusText}
		disabled={$isSyncing || !$isOnline}
	>
		<span class={statusColor}>{statusIcon}</span>
		{#if $hasPendingChanges && !$isSyncing}
			<span
				class="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white"
			>
				{$syncStore.pendingCount > 9 ? '9+' : $syncStore.pendingCount}
			</span>
		{/if}
	</button>
{:else}
	<!-- Full status indicator -->
	<div class="flex items-center gap-2">
		<!-- Status dot -->
		<div
			class="flex h-2.5 w-2.5 items-center justify-center rounded-full"
			class:bg-gray-300={!$isOnline}
			class:bg-red-500={$isOnline && $syncStore.status === 'error'}
			class:bg-hungry-500={$isOnline && $syncStore.status === 'idle' && !$hasPendingChanges}
			class:bg-amber-500={$isOnline && $syncStore.status === 'idle' && $hasPendingChanges}
			class:animate-pulse={$isSyncing}
		>
			{#if $isSyncing}
				<div class="h-2.5 w-2.5 animate-ping rounded-full bg-hungry-400"></div>
			{/if}
		</div>

		{#if showText}
			<div class="flex flex-col">
				<span class="text-sm font-medium {statusColor}">{$syncStatusText}</span>
				{#if $isAuthenticated && $syncStore.lastSync}
					<span class="text-xs text-gray-400">
						Last sync: {formatLastSync($syncStore.lastSync)}
					</span>
				{/if}
			</div>
		{/if}

		<!-- Manual sync button (only when authenticated and online) -->
		{#if $isAuthenticated && $isOnline && !$isSyncing}
			<button
				onclick={handleSync}
				class="ml-2 rounded-lg bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
				aria-label="Sync now"
			>
				Sync
			</button>
		{/if}
	</div>
{/if}
