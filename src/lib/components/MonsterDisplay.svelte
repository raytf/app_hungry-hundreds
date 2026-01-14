<script lang="ts">
	import { monsterStages, type Monster } from '$lib/data/mockData';

	interface Props {
		monster: Monster;
	}

	let { monster }: Props = $props();

	let stageConfig = $derived(monsterStages[monster.stage]);
</script>

<div
	class="relative mx-auto flex h-48 w-48 items-center justify-center rounded-3xl"
	style="background-color: {stageConfig.color}"
>
	<!-- Monster emoji with bounce animation -->
	<span class="animate-bounce text-7xl">{stageConfig.emoji}</span>

	<!-- Evolution progress bar -->
	<div class="absolute bottom-2 left-2 right-2 h-2 overflow-hidden rounded-full bg-black/10">
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

