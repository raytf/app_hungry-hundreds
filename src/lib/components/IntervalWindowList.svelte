<script lang="ts">
	import { formatDateLocal } from '$lib/db';
	import type { IntervalWindow } from '$lib/history/habitHistory';

	interface Props {
		windows: IntervalWindow[];
	}

	let { windows }: Props = $props();

	const today = formatDateLocal(new Date());
	let sortedWindows = $derived([...windows].sort((a, b) => b.start.localeCompare(a.start)));

	function formatDate(date: string): string {
		return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric'
		});
	}

	function getStatusCopy(window: IntervalWindow): string {
		if (window.status === 'completed') return `Completed ${formatDate(window.completedAt ?? window.due)}`;
		if (window.status === 'missed') return 'Missed window';
		if (window.due === today) return 'Due today';
		return `Open until ${formatDate(window.due)}`;
	}
</script>

<div class="card">
	<h3 class="mb-4 text-sm font-semibold text-content-muted">🪟 Interval Windows</h3>

	{#if sortedWindows.length === 0}
		<p class="text-sm text-content-subtle">No interval windows overlap this period yet.</p>
	{:else}
		<div class="space-y-3">
			{#each sortedWindows as window (`${window.start}-${window.due}`)}
				<div class="rounded-xl bg-surface-sunken p-3">
					<div class="flex items-start justify-between gap-3">
						<div>
							<p class="font-medium text-content">
								{window.status === 'completed' ? '✓' : window.status === 'active' ? '⏳' : '⚠️'}
								{formatDate(window.start)} → {formatDate(window.due)}
							</p>
							<p class="text-sm text-content-subtle">{getStatusCopy(window)}</p>
						</div>
						<div class="text-right text-xs text-content-subtle">
							<p>{window.intervalDays} day rule</p>
							{#if window.completionType === 'partial'}
								<p>Started by partial</p>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>