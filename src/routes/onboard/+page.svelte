<script lang="ts">
	import { goto } from '$app/navigation';
	import MonsterDisplay from '$lib/components/MonsterDisplay.svelte';
	import HabitForm from '$lib/components/HabitForm.svelte';
	import { habits } from '$lib/stores/habits';
	import { mockMonster, monsterStages } from '$lib/data/mockData';
	import { isAuthenticated, userEmail } from '$lib/stores/auth';

	let step = $state<'welcome' | 'monster' | 'habit'>('welcome');
	let monsterName = $state('Chompy');

	const newMonster = $derived({
		...mockMonster,
		name: monsterName,
		stage: 'egg' as const,
		evolutionProgress: 0
	});

	// Get first name from email for personalized greeting
	const userName = $derived(() => {
		if ($userEmail) {
			return $userEmail.split('@')[0];
		}
		return null;
	});

	function handleHabitSubmit(habit: {
		name: string;
		emoji: string;
		color: string;
		reminderTime: string | null;
	}) {
		habits.reset(); // Start fresh
		habits.add({
			name: habit.name,
			emoji: habit.emoji,
			color: habit.color,
			reminderTime: habit.reminderTime ?? undefined
		});
		goto('/');
	}
</script>

<svelte:head>
	<title>Welcome | Hungry Hundreds</title>
</svelte:head>

<main class="page-container flex min-h-screen flex-col justify-center pt-4">
	{#if step === 'welcome'}
		<!-- Welcome Screen -->
		<div class="text-center">
			<div class="mb-6">
				<span class="text-7xl">{monsterStages.egg.emoji}</span>
			</div>
			{#if $isAuthenticated && userName()}
				<h1 class="mb-4 font-display text-3xl font-bold text-gray-800">
					Welcome, {userName()}!
				</h1>
				<p class="mb-8 text-gray-600">
					Let's set up your habit journey and hatch your monster companion!
				</p>
			{:else}
				<h1 class="mb-4 font-display text-3xl font-bold text-gray-800">
					Welcome to Hungry Hundreds
				</h1>
				<p class="mb-8 text-gray-600">
					Build better habits and watch your monster companion grow with you!
				</p>
			{/if}

			<div class="space-y-4">
				<button onclick={() => (step = 'monster')} class="btn-primary w-full"> Get Started </button>
				{#if !$isAuthenticated}
					<a href="/auth/signup" class="btn-secondary block w-full text-center"> Create Account </a>
					<button onclick={() => goto('/')} class="text-sm text-gray-500 hover:text-gray-700">
						Skip for Now
					</button>
				{:else}
					<button onclick={() => goto('/')} class="btn-secondary w-full"> Skip for Now </button>
				{/if}
			</div>
		</div>
	{:else if step === 'monster'}
		<!-- Monster Naming -->
		<div class="text-center">
			<MonsterDisplay monster={newMonster} />

			<h2 class="mt-6 mb-2 font-display text-2xl font-bold text-gray-800">Name Your Monster</h2>
			<p class="mb-6 text-gray-600">Give your new companion a name!</p>

			<input
				type="text"
				bind:value={monsterName}
				placeholder="Enter a name"
				class="input-field mb-6 text-center text-lg"
				maxlength="20"
			/>

			<div class="space-y-3">
				<button
					onclick={() => (step = 'habit')}
					class="btn-primary w-full"
					disabled={!monsterName.trim()}
				>
					Continue
				</button>
				<button
					onclick={() => (step = 'welcome')}
					class="text-sm text-gray-500 hover:text-gray-700"
				>
					← Back
				</button>
			</div>
		</div>
	{:else}
		<!-- First Habit Creation -->
		<div>
			<div class="mb-6 text-center">
				<span class="text-5xl">{monsterStages.egg.emoji}</span>
				<h2 class="mt-4 font-display text-2xl font-bold text-gray-800">Create Your First Habit</h2>
				<p class="text-gray-600">
					{monsterName} is hungry for good habits! Create one to get started.
				</p>
			</div>

			<HabitForm onsubmit={handleHabitSubmit} />

			<button
				onclick={() => (step = 'monster')}
				class="mt-4 w-full text-sm text-gray-500 hover:text-gray-700"
			>
				← Back
			</button>
		</div>
	{/if}
</main>
