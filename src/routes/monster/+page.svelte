<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import { monsterLookAt, monsterSetExpression } from '$lib/stores/monster';

	const expressions = ['normal', 'excited', 'bored', 'surprised'] as const;
	let activeExpression = $state<string>('normal');

	/**
	 * Convert a pointer's viewport position to monster head coordinates (-1..1).
	 * X maps left→right to -1→1, Y maps top→bottom to 1→-1 (inverted).
	 */
	function handlePageMouseMove(event: MouseEvent) {
		const x = (event.clientX / window.innerWidth - 0.5) * 2;
		const y = (event.clientY / window.innerHeight - 1) * 2;
		monsterLookAt(x, y);
	}

	function setExpression(expression: string) {
		activeExpression = expression;
		monsterSetExpression(expression);
	}
</script>

<svelte:head>
	<title>Monster Test | Hungry Hundreds</title>
</svelte:head>

<!-- Full page grid layout: Header (auto) | Main (1fr) | BottomNav spacer (auto) -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative grid"
	style="height: calc(100vh - env(safe-area-inset-bottom, 0px)); grid-template-rows: auto 1fr auto;"
	onmousemove={handlePageMouseMove}
>
	<Header title="Monster Animations" />

	<!-- Main content area - expression controls at bottom -->
	<main class="flex flex-col items-center">
		<div class="mx-auto w-full max-w-lg px-4">
			<div class="card">
				<h3 class="mb-3 text-sm font-semibold text-gray-700">Expression</h3>
				<div class="grid grid-cols-4 gap-2">
					{#each expressions as expr (expr)}
						<button
							type="button"
							class="rounded-xl px-3 py-2.5 text-sm font-semibold transition-all active:scale-95"
							class:bg-hungry-500={activeExpression === expr}
							class:text-white={activeExpression === expr}
							class:bg-gray-100={activeExpression !== expr}
							class:text-gray-700={activeExpression !== expr}
							class:hover:bg-hungry-600={activeExpression === expr}
							class:hover:bg-gray-200={activeExpression !== expr}
							onclick={() => setExpression(expr)}
						>
							{expr.charAt(0).toUpperCase() + expr.slice(1)}
						</button>
					{/each}
				</div>
			</div>
		</div>
	</main>
</div>
