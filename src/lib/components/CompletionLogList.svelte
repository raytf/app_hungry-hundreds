<script lang="ts">
	import type { HabitLog } from '$lib/db';

	interface Props {
		logs: HabitLog[];
	}

	let { logs }: Props = $props();

	function formatDate(date: string): string {
		return new Date(date + 'T00:00:00').toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="card">
	<h3 class="mb-4 text-sm font-semibold text-content-muted">📝 Completion Log</h3>

	{#if logs.length === 0}
		<p class="text-sm text-content-subtle">No completions recorded in this range.</p>
	{:else}
		<div class="space-y-3">
			{#each logs as log (`${log.date}-${log.completedAt}`)}
				<div class="flex items-center justify-between gap-3 rounded-xl bg-surface-sunken p-3">
					<div>
						<p class="font-medium text-content">{formatDate(log.date)}</p>
						<p class="text-sm text-content-subtle">
							{log.completionType === 'partial' ? 'Partial completion' : 'Full completion'}
							{#if log.windowIntervalDays}
								• {log.windowIntervalDays} day window
							{/if}
						</p>
					</div>
					<span
						class="rounded-full px-2 py-1 text-xs font-medium"
						class:bg-success-soft={log.completionType === 'full'}
						class:text-success={log.completionType === 'full'}
						class:bg-amber-100={log.completionType === 'partial'}
						class:text-amber-700={log.completionType === 'partial'}
					>
						{log.completionType}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>