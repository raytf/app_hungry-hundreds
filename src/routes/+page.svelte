<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import FireProgressBar from '$lib/components/FireProgressBar.svelte';
	import MonsterDisplay from '$lib/components/MonsterDisplay.svelte';
	import GonnChat from '$lib/components/GonnChat.svelte';
	import HabitCardCompact from '$lib/components/HabitCardCompact.svelte';
	import HabitSuggestions from '$lib/components/HabitSuggestions.svelte';
	import { resolve } from '$app/paths';
	import { sortedHabits, todaysProgress } from '$lib/stores/habits';
	import { monster, monsterLookAt } from '$lib/stores/monster';

	// Gonn chat panel visibility
	let chatVisible = $state(false);

	// Get current date for header (Phase E will move formatting to Header itself)
	const now = new Date();
	const dateOptions: Intl.DateTimeFormatOptions = {
		weekday: 'long',
		month: 'short',
		day: 'numeric'
	};
	const formattedDate = now.toLocaleDateString('en-US', dateOptions);

	/**
	 * Convert a pointer's viewport position to monster head coordinates (-1..1).
	 * X maps left→right to -1→1, Y maps top→bottom to 1→-1 (inverted).
	 */
	function handlePageMouseMove(event: MouseEvent) {
		const x = (event.clientX / window.innerWidth - 0.5) * 2;
		const y = (event.clientY / window.innerHeight - 1) * 2;
		monsterLookAt(x, y);
	}

	// ── Scroll indicator ─────────────────────────────────────────────────────
	let mainEl = $state<HTMLElement | null>(null);
	let canScrollMore = $state(false);

	function checkScroll() {
		if (!mainEl) return;
		canScrollMore = mainEl.scrollTop + mainEl.clientHeight < mainEl.scrollHeight - 1;
	}

	$effect(() => {
		if (!mainEl) return;
		checkScroll();
		const ro = new ResizeObserver(checkScroll);
		ro.observe(mainEl);
		return () => ro.disconnect();
	});
</script>

<svelte:head>
	<title>Today | Hungry Hundreds</title>
</svelte:head>

<!--
	Home screen layout (Phase B):
	┌─────────────────────────────┐
	│  Header (sticky)            │
	│  FireProgressBar            │
	├─────────────────────────────┤
	│  Habits scroll (sky bg)     │  flex-1, overflow-y-auto
	│                             │
	│  [padding-bottom clears     │
	│   Gonn canvas + bubble]     │
	├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤
	│  SpeechBubble (Phase C)     │  fixed, z-bubble
	│  Gonn canvas (layout)       │  fixed, z-rive
	│  Ground (layout)            │  fixed, z-ground
	└─────────────────────────────┘
-->
<!-- ── Gonn fixed layers (home-screen only) ───────────────────────────────── -->

<!-- Layer 1 (z-ground=5): Ground surface — full viewport width -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-[5] bg-ground-gradient"
	style="height: calc(var(--gonn-size) + env(safe-area-inset-bottom, 0px))"
	aria-hidden="true"
></div>

<!-- Layer 2 (z-rive=10): Gonn canvas — square, centered, max 430px -->
<div
	class="pointer-events-none fixed bottom-0 left-1/2 z-10 -translate-x-1/2"
	style="width: var(--gonn-size); height: var(--gonn-size);"
>
	<MonsterDisplay monster={$monster} />
</div>

<!-- Layer 3 (z-11): Tap zone — lower half of Gonn opens chat -->
<button
	class="fixed bottom-0 left-1/2 z-[11] -translate-x-1/2 cursor-pointer"
	style="width: var(--gonn-size); height: calc(var(--gonn-size) * 0.5); background: transparent; border: none;"
	onclick={() => (chatVisible = true)}
	aria-label="Chat with Gonn"
></button>

<!-- Gonn Chat panel -->
<GonnChat bind:visible={chatVisible} />

<!-- ── Page layout ─────────────────────────────────────────────────────────── -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex h-screen flex-col" onmousemove={handlePageMouseMove}>
	<!-- Sticky header + fire bar zone -->
	<Header title={formattedDate} showSyncStatus />
	<FireProgressBar pct={$todaysProgress.pct} />

	<!-- Scrollable habits area with sky gradient -->
	<div class="relative flex-1 overflow-hidden">
		<main
			class="scrollable-main h-full overflow-y-auto overscroll-contain bg-sky-gradient"
			bind:this={mainEl}
			onscroll={checkScroll}
		>
			<div
				class="mx-auto w-full max-w-lg px-4 pt-4"
				style="padding-bottom: calc(var(--gonn-size) + 80px)"
			>
				<!-- Habits List -->
				<section>
					{#if $sortedHabits.length > 0}
						<div class="mb-3 flex items-center justify-between">
							<h3 class="font-semibold text-content-muted">Your Habits</h3>
							<a
								href={resolve('/habits/new')}
								class="text-body-sm font-medium text-accent-warm hover:text-accent-warm-hover"
							>
								+ Add New
							</a>
						</div>
						<div class="space-y-3">
							{#each $sortedHabits as habit (habit.id)}
								<HabitCardCompact {habit} />
							{/each}
						</div>
					{:else}
						<!-- Empty state with habit suggestions -->
						<div class="card py-6">
							<HabitSuggestions maxSuggestions={4} />
						</div>
					{/if}
				</section>
			</div>
		</main>

		<!-- Scroll-more horizon fade: visible when content overflows -->
		{#if canScrollMore}
			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-surface/80 to-transparent transition-opacity duration-300"
			></div>
		{/if}
	</div>
</div>

<style>
	/* Desktop scrollbar styling - hidden on mobile */
	@media (min-width: 768px) {
		.scrollable-main {
			scrollbar-gutter: stable;
		}

		/* WebKit browsers (Chrome, Safari, Edge) */
		.scrollable-main::-webkit-scrollbar {
			width: 8px;
			background-color: transparent;
		}

		.scrollable-main::-webkit-scrollbar-track {
			background-color: rgba(0, 0, 0, 0.05);
			border-radius: 4px;
		}

		.scrollable-main::-webkit-scrollbar-thumb {
			background-color: rgba(0, 0, 0, 0.2);
			border-radius: 4px;
		}

		.scrollable-main::-webkit-scrollbar-thumb:hover {
			background-color: rgba(0, 0, 0, 0.3);
		}

		/* Firefox */
		@supports (scrollbar-width: thin) {
			.scrollable-main {
				scrollbar-width: thin;
				scrollbar-color: rgba(0, 0, 0, 0.2) rgba(0, 0, 0, 0.05);
			}
		}
	}

	/* Mobile - hide scrollbar completely */
	@media (max-width: 767px) {
		.scrollable-main::-webkit-scrollbar {
			display: none;
		}

		.scrollable-main {
			-ms-overflow-style: none; /* IE and Edge */
			scrollbar-width: none; /* Firefox */
		}
	}
</style>
