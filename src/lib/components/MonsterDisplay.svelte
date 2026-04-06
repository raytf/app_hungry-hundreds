<script lang="ts">
	/**
	 * MonsterDisplay Component
	 *
	 * Displays the monster companion with Rive animation (or emoji fallback),
	 * evolution progress bar, stage badge, and monster name.
	 *
	 * @see docs/ANIMATION.md for animation system documentation
	 */
	import { onDestroy } from 'svelte';
	import {
		registerMonsterLookAt,
		registerMonsterSetExpression,
		registerMonsterSetDialogue,
		type Monster as MonsterType
	} from '$lib/stores/monster';
	import Monster from './Monster.svelte';

	interface Props {
		monster: MonsterType;
	}

	let { monster }: Props = $props();

	// Get a reference to the Monster component so we can register its lookAt method
	let monsterRef: Monster | undefined = $state();

	// Register the lookAt, setExpression, and setDialogue callbacks once the Monster component is bound
	$effect(() => {
		if (monsterRef) {
			registerMonsterLookAt(monsterRef.lookAt);
			registerMonsterSetExpression(monsterRef.setExpression);
			registerMonsterSetDialogue(monsterRef.setDialogue);
		}
	});

	// Unregister on destroy
	onDestroy(() => {
		registerMonsterLookAt(null);
		registerMonsterSetExpression(null);
		registerMonsterSetDialogue(null);
	});
</script>

<!--
	MonsterDisplay — renders Gonn filling its parent container.
	Sizing and positioning are handled entirely by the parent in +layout.svelte.
	Evolution progress bar and stage badge removed (design guide §4.3:
	Gonn's state is communicated through animation, not chrome).
-->
<div class="h-full w-full">
	<Monster bind:this={monsterRef} stage={monster.stage} />
</div>
