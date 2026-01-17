<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import StatsCard from '$lib/components/StatsCard.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import WeeklyChart from '$lib/components/WeeklyChart.svelte';
	import { habits, todaysProgress } from '$lib/stores/habits';
	import { stats } from '$lib/stores/stats';

	// Calculate additional stats
	let totalStreak = $derived($habits.reduce((sum, h) => sum + h.streak, 0));
	let longestStreak = $derived(Math.max(...$habits.map((h) => h.streak), 0));
	let activeHabits = $derived($habits.length);
</script>

<svelte:head>
	<title>Statistics | Hungry Hundreds</title>
</svelte:head>

<Header title="Statistics" />

<main class="page-container pt-4">
	<!-- Today's Progress Card -->
	<section class="card mb-6">
		<div class="flex items-center gap-4">
			<ProgressRing pct={$todaysProgress.pct} size={80} />
			<div>
				<h3 class="text-lg font-semibold text-gray-800">Today's Progress</h3>
				<p class="text-gray-500">
					{$todaysProgress.completed} of {$todaysProgress.total} habits completed
				</p>
				{#if $todaysProgress.pct === 100}
					<p class="mt-1 font-medium text-hungry-600">🎉 Perfect day!</p>
				{:else if $todaysProgress.pct >= 75}
					<p class="mt-1 font-medium text-hungry-600">Almost there!</p>
				{:else if $todaysProgress.pct >= 50}
					<p class="mt-1 font-medium text-orange-500">Keep going!</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- Weekly Chart -->
	<section class="mb-6">
		<WeeklyChart data={$stats.weeklyData} />
	</section>

	<!-- Stats Grid -->
	<section class="mb-6 grid grid-cols-2 gap-3">
		<StatsCard label="Completion Rate" value="{$stats.completionRate}%" icon="📊" />
		<StatsCard label="Active Habits" value={String(activeHabits)} icon="📋" />
		<StatsCard label="Total Streak Days" value={String(totalStreak)} icon="🔥" />
		<StatsCard label="Longest Streak" value="{longestStreak} days" icon="🏆" />
	</section>

	<!-- Motivation Section -->
	<section class="card bg-linear-to-br from-hungry-50 to-hungry-100">
		<div class="text-center">
			<p class="mb-2 text-4xl">💪</p>
			<h3 class="mb-1 font-semibold text-gray-800">Keep it up!</h3>
			<p class="text-sm text-gray-600">
				Consistency is key. Every habit completed brings you closer to your goals.
			</p>
		</div>
	</section>
</main>
