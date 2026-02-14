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
	class="relative flex h-full w-full items-end justify-center"
	style="background: linear-gradient(to top, {stageConfig.color}40, transparent)"
>
	<!-- Monster container - full height and width -->
	<div class="relative flex h-full w-full items-end justify-center">
		<!-- Monster animation (Rive with emoji fallback) -->
		<Monster stage={monster.stage} {isHappy} />
		<div class="absolute right-0 bottom-2 left-0 z-10 h-1.5 bg-black/10">
			<div
				class="h-full bg-white/80 transition-all duration-500"
				style="width: {monster.evolutionProgress}%"
			></div>
		</div>
	</div>

	<!-- Evolution progress bar - full width at bottom -->

	<!-- Stage badge -->
	<span
		class="absolute top-2 right-4 rounded-full bg-white/80 px-2 py-0.5 text-xs font-medium capitalize"
	>
		{monster.stage}
	</span>
</div>
