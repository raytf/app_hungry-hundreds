<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { monsterLookAt, monsterSetExpression } from '$lib/stores/monster';
	import { gonnState, feedGonn, resetGonnState, debugSetGonn } from '$lib/stores/gonn';
	import { mascotState } from '$lib/stores/mascot';
	import { EVOLUTION_STAGE_NAMES, type EvolutionStage } from '$lib/types/mascot';

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
</script>

<svelte:head>
	<title>Monster Debug | Hungry Hundreds</title>
</svelte:head>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative grid"
	style="height: calc(100vh - env(safe-area-inset-bottom, 0px)); grid-template-rows: auto 1fr auto;"
	onmousemove={handlePageMouseMove}
>
	<Header title="Monster Debug" />

	<main class="overflow-y-auto pb-24">
		<div class="mx-auto w-full max-w-lg space-y-4 px-4 pt-4">
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
</div>
