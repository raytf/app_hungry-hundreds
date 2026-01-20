<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import HabitCard from '$lib/components/HabitCard.svelte';
	import { habits, type HabitWithStatus } from '$lib/stores/habits';

	// Delete confirmation dialog state
	let showDeleteDialog = $state(false);
	let habitToDelete = $state<HabitWithStatus | null>(null);
	let isDeleting = $state(false);

	function openDeleteDialog(habit: HabitWithStatus) {
		habitToDelete = habit;
		showDeleteDialog = true;
	}

	function closeDeleteDialog() {
		showDeleteDialog = false;
		habitToDelete = null;
	}

	async function confirmDelete() {
		if (!habitToDelete?.id) return;

		isDeleting = true;
		try {
			await habits.remove(habitToDelete.id);
			closeDeleteDialog();
		} catch (e) {
			console.error('Failed to delete habit:', e);
		} finally {
			isDeleting = false;
		}
	}
</script>

<svelte:head>
	<title>All Habits | Hungry Hundreds</title>
</svelte:head>

<Header title="All Habits" showSyncStatus>
	{#snippet right()}
		<a
			href="/habits/new"
			class="rounded-lg bg-hungry-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-hungry-600"
		>
			+ New
		</a>
	{/snippet}
</Header>

<main class="page-container pt-4">
	<!-- Stats summary -->
	<section class="card mb-6">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm text-gray-500">Total Habits</p>
				<p class="text-2xl font-bold text-gray-900">{$habits.length}</p>
			</div>
			<div class="text-right">
				<p class="text-sm text-gray-500">Total Streak Days</p>
				<p class="text-2xl font-bold text-orange-500">
					🔥 {$habits.reduce((sum, h) => sum + h.streak, 0)}
				</p>
			</div>
		</div>
	</section>

	<!-- Habits List -->
	<section>
		<h3 class="mb-3 font-semibold text-gray-700">Manage Your Habits</h3>

		{#if $habits.length === 0}
			<div class="card py-12 text-center">
				<p class="mb-2 text-5xl">🌱</p>
				<h3 class="mb-2 text-lg font-semibold text-gray-800">No habits yet</h3>
				<p class="mb-4 text-gray-500">Start building better habits today!</p>
				<a href="/habits/new" class="btn-primary inline-block">Create Your First Habit</a>
			</div>
		{:else}
			<div class="space-y-3">
				{#each $habits as habit (habit.id)}
					<div class="flex items-center gap-2">
						<div class="flex-1">
							<HabitCard {habit} showEdit />
						</div>
						<!-- Delete button -->
						<button
							type="button"
							onclick={() => openDeleteDialog(habit)}
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-red-50 hover:text-red-500"
							aria-label="Delete {habit.name}"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
								stroke-width="1.5"
								stroke="currentColor"
								class="h-5 w-5"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
								/>
							</svg>
						</button>
					</div>
				{/each}
			</div>

			<!-- Quick actions -->
			<div class="mt-6 text-center">
				<a
					href="/habits/new"
					class="inline-flex items-center gap-2 text-hungry-600 hover:text-hungry-700"
				>
					<span class="text-xl">+</span>
					<span class="font-medium">Add another habit</span>
				</a>
			</div>
		{/if}
	</section>
</main>

<!-- Delete Confirmation Dialog -->
{#if showDeleteDialog && habitToDelete}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		onclick={closeDeleteDialog}
		onkeydown={(e) => e.key === 'Escape' && closeDeleteDialog()}
		role="button"
		tabindex="-1"
	>
		<!-- Dialog -->
		<div
			class="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			aria-labelledby="delete-dialog-title"
			tabindex="-1"
		>
			<div class="mb-4 text-center">
				<div
					class="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100"
				>
					<span class="text-2xl">🗑️</span>
				</div>
				<h2 id="delete-dialog-title" class="text-lg font-semibold text-gray-900">Delete Habit?</h2>
				<p class="mt-2 text-sm text-gray-500">
					Are you sure you want to delete <span class="font-medium">{habitToDelete.name}</span>?
					This will also delete all completion history for this habit.
				</p>
			</div>

			<div class="flex gap-3">
				<button
					type="button"
					onclick={closeDeleteDialog}
					class="btn-secondary flex-1"
					disabled={isDeleting}
				>
					Cancel
				</button>
				<button
					type="button"
					onclick={confirmDelete}
					class="flex-1 rounded-xl bg-red-500 px-6 py-3 font-semibold text-white transition-all hover:bg-red-600 active:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isDeleting}
				>
					{#if isDeleting}
						<span class="inline-flex items-center gap-2">
							<span
								class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
							></span>
							Deleting...
						</span>
					{:else}
						Delete
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}
