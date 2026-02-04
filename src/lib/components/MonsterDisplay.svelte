<script lang="ts">
	/**
	 * MonsterDisplay Component
	 *
	 * Displays the monster companion with Rive animation (or emoji fallback),
	 * evolution progress bar, stage badge, and monster name.
	 *
	 * @see docs/ANIMATION.md for animation system documentation
	 */
	import { monsterStages, type Monster as MonsterType } from '$lib/stores/monster';
	import Monster from './Monster.svelte';

	interface Props {
		monster: MonsterType;
		/** Trigger happy animation (e.g., after habit completion) */
		isHappy?: boolean;
	}

	let { monster, isHappy = false }: Props = $props();

	let stageConfig = $derived(monsterStages[monster.stage]);
</script>

<div
	class="relative mx-auto flex h-48 w-48 items-center justify-center rounded-3xl"
	style="background-color: {stageConfig.color}"
>
	<!-- Monster animation (Rive with emoji fallback) -->
	<Monster stage={monster.stage} {isHappy} />

	<!-- Evolution progress bar -->
	<div class="absolute right-2 bottom-2 left-2 h-2 overflow-hidden rounded-full bg-black/10">
		<div
			class="h-full rounded-full bg-white/60 transition-all duration-500"
			style="width: {monster.evolutionProgress}%"
		></div>
	</div>

	<!-- Stage badge -->
	<span
		class="absolute top-2 right-2 rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium capitalize"
	>
		{monster.stage}
	</span>
</div>

<!-- Monster name -->
<p class="mt-3 text-center font-display text-xl font-semibold text-gray-700">
	{monster.name}
</p>
