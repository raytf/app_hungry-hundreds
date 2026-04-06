<script lang="ts">
	import { onMount } from 'svelte';
	import Header from '$lib/components/Header.svelte';
	import MonsterDisplay from '$lib/components/MonsterDisplay.svelte';
	import { monster, monsterLookAt, monsterSetExpression, monsterSetDialogue } from '$lib/stores/monster';
	import { gonnState, feedGonn, resetGonnState, debugSetGonn } from '$lib/stores/gonn';
	import { mascotState } from '$lib/stores/mascot';
	import { EVOLUTION_STAGE_NAMES, type EvolutionStage } from '$lib/types/mascot';
	import { generateDialogue, clearDialogueCache, getTimeContext } from '$lib/ai/dialogue';
	import { db } from '$lib/db/db';
	import type { DialogueCacheEntry } from '$lib/types/mascot';

	// ── Expression controls ────────────────────────────────────────────────────
	const expressions = ['normal', 'excited', 'bored', 'surprised'] as const;
	let activeExpression = $state<string>('normal');

	function setExpression(expression: string) {
		activeExpression = expression;
		monsterSetExpression(expression);
	}

	// ── Mouse → head tracking ─────────────────────────────────────────────────
	function handlePageMouseMove(event: MouseEvent) {
		const x = (event.clientX / window.innerWidth - 0.5) * 2;
		const y = (event.clientY / window.innerHeight - 1) * 2;
		monsterLookAt(x, y);
	}

	// ── Satiation slider ──────────────────────────────────────────────────────
	// While dragging, show the in-progress value; otherwise mirror the live store
	let draggingSatiation = $state<number | null>(null);
	let displaySatiation = $derived(draggingSatiation ?? $gonnState.satiation);

	function handleSatiationInput(e: Event) {
		draggingSatiation = Number((e.target as HTMLInputElement).value);
	}

	async function handleSatiationChange(e: Event) {
		const value = Number((e.target as HTMLInputElement).value);
		draggingSatiation = null;
		await debugSetGonn(value);
	}

	// ── Evolution stage buttons ───────────────────────────────────────────────
	const stages = [1, 2, 3, 4, 5] as const;

	async function forceStage(stage: EvolutionStage) {
		// Pick a representative satiation that lands inside the stage band
		const satiationForStage: Record<EvolutionStage, number> = { 1: 5, 2: 20, 3: 55, 4: 80, 5: 95 };
		await debugSetGonn(satiationForStage[stage], stage);
	}

	// ── Feed / Reset ─────────────────────────────────────────────────────────
	async function handleFeed() {
		await feedGonn();
	}

	async function handleReset() {
		await resetGonnState();
	}

	// ── Dialogue ─────────────────────────────────────────────────────────────
	const interactionTypes = ['tap', 'complete', 'danger_zone', 'ambient', 'evolve'] as const;
	type InteractionType = (typeof interactionTypes)[number];

	let dlgInteractionType = $state<InteractionType>('tap');
	let dlgHabitName = $state('Morning run');
	let dlgStreakLength = $state(5);
	let dlgResult = $state<string | null>(null);
	let dlgSource = $state<'llm' | 'cache' | null>(null);
	let dlgLoading = $state(false);
	let dlgError = $state<string | null>(null);

	// Cache inspector
	let cacheEntries = $state<DialogueCacheEntry[]>([]);

	async function refreshCache() {
		cacheEntries = await db.dialogueCache.toArray();
	}

	async function handleClearCache() {
		await clearDialogueCache();
		await refreshCache();
	}

	// Rate limit state (reads the module-level lastCallAt via a re-export we can't access directly,
	// so we track it locally on each call instead)
	let lastCallMs = $state<number>(0);
	let throttleRemainingSec = $derived(
		lastCallMs === 0 ? 0 : Math.max(0, Math.ceil((12_000 - (Date.now() - lastCallMs)) / 1000))
	);

	async function handleGenerateDialogue() {
		dlgLoading = true;
		dlgError = null;
		dlgResult = null;
		dlgSource = null;

		// Build a minimal but valid DialogueRequest
		const request = {
			interactionType: dlgInteractionType,
			mascotState: {
				primaryEmotion: $mascotState.primaryEmotion,
				emotionIntensity: $mascotState.emotionIntensity,
				evolutionStage: $gonnState.evolutionStage,
				lookX: 0,
				lookY: 0,
				context: { type: 'ambient' as const }
			},
			gonn: $gonnState,
			habits: [
				{
					name: dlgHabitName,
					flavorTag: 'health',
					completionCount: dlgStreakLength,
					streakLength: dlgStreakLength,
					dangerZone: false,
					window: {
						isScheduledToday: true,
						completionsInWindow: 1,
						targetForWindow: 1,
						daysRemaining: 0
					}
				}
			],
			memory: { permanent: [], shortTerm: [] },
			timeContext: getTimeContext()
		};

		// Check if cache has a hit first (to mark source)
		const { db: _db } = await import('$lib/db/db');
		const hashKey = btoa(
			[
				request.interactionType,
				request.mascotState.primaryEmotion,
				request.timeContext.hourOfDay,
				request.mascotState.evolutionStage,
				request.habits.map((h) => h.streakLength).join(',')
			].join('-')
		).slice(0, 32);
		const existingCache = await _db.dialogueCache.get(hashKey);

		const result = await generateDialogue(request as Parameters<typeof generateDialogue>[0]);
		dlgLoading = false;

		if (result) {
			dlgResult = result.dialogue;
			dlgSource = existingCache ? 'cache' : 'llm';
			lastCallMs = Date.now();
			await refreshCache();
		} else {
			dlgError =
				throttleRemainingSec > 0
					? `Throttled — wait ${throttleRemainingSec}s`
					: 'No response (check auth/network)';
		}
	}

	// Rive typewriter test
	let typewriterText = $state("Hey! Keep going, you're doing great! 🔥");

	function handleSendToRive() {
		monsterSetDialogue(typewriterText);
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

	onMount(async () => {
		await refreshCache();
	});
</script>

<svelte:head>
	<title>Monster Debug | Hungry Hundreds</title>
</svelte:head>

<!-- ── Gonn fixed layers (debug: canvas only, no chat tap zone) ──────────── -->

<!-- Layer 1 (z-ground=5): Ground surface -->
<div
	class="pointer-events-none fixed inset-x-0 bottom-0 z-ground bg-ground-gradient"
	style="height: calc(var(--gonn-size) + env(safe-area-inset-bottom, 0px))"
	aria-hidden="true"
></div>

<!-- Layer 2 (z-rive=10): Gonn canvas — mounts MonsterDisplay so debug callbacks register -->
<div
	class="pointer-events-none fixed bottom-0 left-1/2 z-rive -translate-x-1/2"
	style="width: var(--gonn-size); height: var(--gonn-size);"
>
	<MonsterDisplay monster={$monster} />
</div>

<!-- ── Page layout ─────────────────────────────────────────────────────────── -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="flex h-screen flex-col" onmousemove={handlePageMouseMove}>
	<Header title="Monster Debug" />

	<div class="relative flex-1 overflow-hidden">
		<main
			class="scrollable-main h-full overflow-y-auto overscroll-contain"
			bind:this={mainEl}
			onscroll={checkScroll}
		>
			<div
				class="mx-auto w-full max-w-lg space-y-4 px-4 pt-4"
				style="padding-bottom: calc(var(--gonn-size) + 24px)"
			>
				<!-- ── Expression ──────────────────────────────────────────────── -->
				<div class="card">
					<h3 class="mb-3 text-sm font-semibold text-gray-700">Expression (3 s override)</h3>
					<div class="grid grid-cols-4 gap-2">
						{#each expressions as expr (expr)}
							<button
								type="button"
								class="rounded-xl px-3 py-2.5 text-sm font-semibold transition-all active:scale-95"
								class:bg-hungry-500={activeExpression === expr}
								class:text-white={activeExpression === expr}
								class:bg-gray-100={activeExpression !== expr}
								class:text-gray-700={activeExpression !== expr}
								onclick={() => setExpression(expr)}
							>
								{expr.charAt(0).toUpperCase() + expr.slice(1)}
							</button>
						{/each}
					</div>
				</div>

				<!-- ── Satiation Slider ────────────────────────────────────────── -->
				<div class="card">
					<h3 class="mb-3 text-sm font-semibold text-gray-700">
						Satiation — <span class="text-hungry-500">{$gonnState.satiation.toFixed(1)}</span>
					</h3>
					<input
						type="range"
						min="0"
						max="100"
						step="1"
						value={displaySatiation}
						oninput={handleSatiationInput}
						onchange={handleSatiationChange}
						class="w-full accent-orange-500"
					/>
					<div class="mt-1 flex justify-between text-xs text-gray-400">
						<span>0</span><span>50</span><span>100</span>
					</div>
				</div>

				<!-- ── Force Evolution Stage ───────────────────────────────────── -->
				<div class="card">
					<h3 class="mb-3 text-sm font-semibold text-gray-700">Force Stage</h3>
					<div class="grid grid-cols-5 gap-1.5">
						{#each stages as s (s)}
							<button
								type="button"
								class="rounded-xl py-2 text-xs font-semibold transition-all active:scale-95"
								class:bg-hungry-500={$gonnState.evolutionStage === s}
								class:text-white={$gonnState.evolutionStage === s}
								class:bg-gray-100={$gonnState.evolutionStage !== s}
								class:text-gray-700={$gonnState.evolutionStage !== s}
								onclick={() => forceStage(s)}
							>
								{EVOLUTION_STAGE_NAMES[s]}
							</button>
						{/each}
					</div>
				</div>

				<!-- ── Feed / Reset ───────────────────────────────────────────── -->
				<div class="card">
					<h3 class="mb-3 text-sm font-semibold text-gray-700">Actions</h3>
					<div class="flex gap-3">
						<button
							type="button"
							class="flex-1 rounded-xl bg-green-100 py-2.5 text-sm font-semibold text-green-700 transition-all hover:bg-green-200 active:scale-95"
							onclick={handleFeed}
						>
							🍖 Feed Gonn
						</button>
						<button
							type="button"
							class="flex-1 rounded-xl bg-red-100 py-2.5 text-sm font-semibold text-red-700 transition-all hover:bg-red-200 active:scale-95"
							onclick={handleReset}
						>
							🗑️ Reset
						</button>
					</div>
				</div>

				<!-- ── Dialogue: Fire a call ─────────────────────────────────── -->
				<div class="card">
					<h3 class="mb-3 text-sm font-semibold text-gray-700">Dialogue — Fire a call</h3>

					<!-- Interaction type selector -->
					<div class="mb-3 grid grid-cols-5 gap-1">
						{#each interactionTypes as t (t)}
							<button
								type="button"
								class="rounded-lg py-1.5 text-xs font-semibold transition-all active:scale-95"
								class:bg-hungry-500={dlgInteractionType === t}
								class:text-white={dlgInteractionType === t}
								class:bg-gray-100={dlgInteractionType !== t}
								class:text-gray-600={dlgInteractionType !== t}
								onclick={() => (dlgInteractionType = t)}
							>
								{t.replace('_', ' ')}
							</button>
						{/each}
					</div>

					<!-- Habit context -->
					<div class="mb-3 flex gap-2">
						<input
							type="text"
							bind:value={dlgHabitName}
							placeholder="Habit name"
							class="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-hungry-500 focus:outline-none"
						/>
						<input
							type="number"
							bind:value={dlgStreakLength}
							min="0"
							max="999"
							class="w-20 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-hungry-500 focus:outline-none"
							title="Streak length"
						/>
					</div>

					<button
						type="button"
						class="mb-3 w-full rounded-xl bg-hungry-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-hungry-600 active:scale-95 disabled:opacity-50"
						onclick={handleGenerateDialogue}
						disabled={dlgLoading}
					>
						{dlgLoading ? '⏳ Generating…' : '🗣️ Generate Dialogue'}
					</button>

					{#if dlgResult}
						<div class="rounded-lg bg-green-50 p-3">
							<div class="mb-1 flex items-center gap-2">
								<span class="text-xs font-semibold text-green-700">Response</span>
								{#if dlgSource}
									<span
										class="rounded-full px-2 py-0.5 text-xs font-medium"
										class:bg-blue-100={dlgSource === 'cache'}
										class:text-blue-700={dlgSource === 'cache'}
										class:bg-purple-100={dlgSource === 'llm'}
										class:text-purple-700={dlgSource === 'llm'}
									>
										{dlgSource === 'cache' ? '📦 cache' : '🤖 llm'}
									</span>
								{/if}
							</div>
							<p class="text-sm text-gray-700">{dlgResult}</p>
						</div>
					{/if}

					{#if dlgError}
						<div class="rounded-lg bg-red-50 p-3">
							<p class="text-sm text-red-700">{dlgError}</p>
						</div>
					{/if}
				</div>

				<!-- ── Dialogue: Cache inspector ──────────────────────────────── -->
				<div class="card">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-sm font-semibold text-gray-700">
							Dialogue Cache <span class="ml-1 text-gray-400">({cacheEntries.length})</span>
						</h3>
						<div class="flex gap-2">
							<button
								type="button"
								class="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-200 active:scale-95"
								onclick={refreshCache}
							>
								↻ Refresh
							</button>
							<button
								type="button"
								class="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-200 active:scale-95"
								onclick={handleClearCache}
							>
								🗑️ Clear
							</button>
						</div>
					</div>

					{#if cacheEntries.length === 0}
						<p class="text-xs text-gray-400">No cached entries</p>
					{:else}
						<div class="space-y-2">
							{#each cacheEntries as entry (entry.contextHash)}
								<div class="rounded-lg bg-gray-50 p-2.5">
									<div class="mb-1 flex items-center gap-2">
										<code class="text-xs text-gray-500">{entry.contextHash}</code>
										<span class="ml-auto text-xs text-gray-400"
											>{new Date(entry.createdAt).toLocaleTimeString()}</span
										>
									</div>
									<p class="text-xs text-gray-600">{JSON.parse(entry.response).dialogue}</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- ── Dialogue: Rate limit inspector ────────────────────────── -->
				<div class="card">
					<h3 class="mb-3 text-sm font-semibold text-gray-700">Rate Limit Inspector</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between">
							<span class="text-gray-500">Last LLM call</span>
							<span class="font-medium text-gray-700">
								{lastCallMs === 0 ? 'None this session' : new Date(lastCallMs).toLocaleTimeString()}
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-500">Client throttle (12 s)</span>
							<span
								class="font-medium"
								class:text-green-600={throttleRemainingSec === 0}
								class:text-orange-500={throttleRemainingSec > 0}
							>
								{throttleRemainingSec === 0 ? '✅ Ready' : `⏳ ${throttleRemainingSec}s`}
							</span>
						</div>
						<div class="flex justify-between">
							<span class="text-gray-500">Server limits</span>
							<span class="text-xs text-gray-400">5 / min · 50 / day (edge fn)</span>
						</div>
						<a
							href="https://supabase.com/dashboard/project/kpafaoouebsijkowhpzj/functions"
							target="_blank"
							rel="noopener"
							class="block text-center text-xs text-hungry-500 underline"
						>
							View edge function logs ↗
						</a>
					</div>
				</div>

				<!-- ── Dialogue: Rive typewriter test ────────────────────────── -->
				<div class="card">
					<h3 class="mb-3 text-sm font-semibold text-gray-700">Rive Typewriter Test</h3>
					<textarea
						bind:value={typewriterText}
						rows="2"
						class="mb-3 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-hungry-500 focus:outline-none"
					></textarea>
					<button
						type="button"
						class="w-full rounded-xl bg-purple-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-purple-600 active:scale-95"
						onclick={handleSendToRive}
					>
						📺 Send to Rive
					</button>
					<p class="mt-2 text-center text-xs text-gray-400">
						Watch the speech bubble appear on Gonn above
					</p>
				</div>

				<!-- ── Live GonnState ─────────────────────────────────────────── -->
				<div class="card">
					<h3 class="mb-2 text-sm font-semibold text-gray-700">GonnState (live)</h3>
					<pre
						class="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{JSON.stringify(
							$gonnState,
							null,
							2
						)}</pre>
				</div>

				<!-- ── Live MascotState ───────────────────────────────────────── -->
				<div class="card">
					<h3 class="mb-2 text-sm font-semibold text-gray-700">MascotState (live)</h3>
					<pre
						class="overflow-x-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">{JSON.stringify(
							$mascotState,
							null,
							2
						)}</pre>
				</div>
			</div>
		</main>
		<!-- Scroll-more indicator -->
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
			-ms-overflow-style: none;
			scrollbar-width: none;
		}
	}
</style>
