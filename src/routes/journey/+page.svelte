<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import StatsCard from '$lib/components/StatsCard.svelte';
	import ProgressRing from '$lib/components/ProgressRing.svelte';
	import PeriodSelector from '$lib/components/PeriodSelector.svelte';
	import PeriodChart from '$lib/components/PeriodChart.svelte';
	import ConsistencyGauge from '$lib/components/ConsistencyGauge.svelte';
	import InsightCard from '$lib/components/InsightCard.svelte';
	import DayPatternGrid from '$lib/components/DayPatternGrid.svelte';
	import { habits, todaysProgress } from '$lib/stores/habits';
	import { advancedStats } from '$lib/stores/advancedStats';
	import { selectedPeriod, periodStats } from '$lib/stores/periodStats';

	// Calculate additional stats
	let totalStreak = $derived($habits.reduce((sum, h) => sum + h.streak, 0));
	let longestStreak = $derived(Math.max(...$habits.map((h) => h.streak), 0));
	let activeHabits = $derived($habits.length);

	const PERIOD_LABELS: Record<string, string> = {
		day: 'Yesterday',
		'7days': 'Last 7 Days',
		'30days': 'Last 30 Days',
		custom: 'Custom Range'
	};

	let chartTitle = $derived(PERIOD_LABELS[$selectedPeriod.preset] ?? 'Selected Period');
</script>

<svelte:head>
	<title>Journey | Hungry Hundreds</title>
</svelte:head>

<Header title="Journey" />

<main class="page-container pt-4">
	<!-- Today's Progress Card -->
	<section class="card mb-6">
		<div class="flex items-center gap-4">
			<ProgressRing pct={$todaysProgress.pct} size={80} />
			<div>
				<h3 class="text-lg font-semibold text-content">Today's Progress</h3>
				<p class="text-content-muted">
					{$todaysProgress.completed} of {$todaysProgress.total} habits completed
				</p>
				{#if $todaysProgress.pct === 100}
					<p class="mt-1 font-medium text-success">🎉 Perfect day!</p>
				{:else if $todaysProgress.pct >= 75}
					<p class="mt-1 font-medium text-success">Almost there!</p>
				{:else if $todaysProgress.pct >= 50}
					<p class="mt-1 font-medium text-accent-warm">Keep going!</p>
				{/if}
			</div>
		</div>
	</section>

	<!-- Period Selector + Chart -->
	<section class="mb-3">
		<PeriodSelector
			value={$selectedPeriod}
			onchange={(range) => selectedPeriod.set(range)}
		/>
	</section>
	<section class="mb-6">
		<PeriodChart data={$periodStats.chartData} title={chartTitle} />
	</section>

	<!-- Stats Grid -->
	<section class="mb-6 grid grid-cols-2 gap-3">
		<StatsCard label="Completion Rate" value="{$periodStats.completionRate}%" icon="📊" />
		<StatsCard label="Active Habits" value={String(activeHabits)} icon="📋" />
		<StatsCard label="Total Streak Days" value={String(totalStreak)} icon="🔥" />
		<StatsCard label="Longest Streak" value="{longestStreak} days" icon="🏆" />
	</section>

	<!-- Advanced Statistics -->
	{#if !$advancedStats.isLoading}
		<!-- Consistency Score -->
		<section class="mb-6">
			<ConsistencyGauge
				score={$advancedStats.consistencyScore.score}
				label={$advancedStats.consistencyScore.label}
				breakdown={$advancedStats.consistencyScore.breakdown}
			/>
		</section>

		<!-- Trend & Recovery -->
		<section class="mb-6 grid grid-cols-2 gap-3">
			<InsightCard
				icon="📈"
				label="Trend"
				value="{$advancedStats.trendDirection.arrow} {$advancedStats.trendDirection.direction ===
				'steady'
					? 'Steady'
					: $advancedStats.trendDirection.direction === 'improving'
						? 'Improving'
						: 'Declining'}"
				subtitle="vs. previous 2 weeks"
				trend={{
					direction: $advancedStats.trendDirection.direction,
					percentage: $advancedStats.trendDirection.percentageChange
				}}
			/>
			<InsightCard
				icon="🔄"
				label="Recovery Speed"
				value={$advancedStats.recoverySpeed.totalRecoveries === 0
					? 'Perfect!'
					: `${$advancedStats.recoverySpeed.averageRecoveryDays}d`}
				subtitle={$advancedStats.recoverySpeed.totalRecoveries === 0
					? 'No misses yet — keep it up!'
					: `${$advancedStats.recoverySpeed.totalRecoveries} recoveries`}
			/>
		</section>

		<!-- Day Patterns -->
		{#if $advancedStats.hasEnoughData}
			<section class="mb-6">
				<DayPatternGrid
					patterns={$advancedStats.dayPatterns.patterns}
					insight={$advancedStats.dayPatterns.insight}
				/>
			</section>
		{/if}

		<!-- Never Miss Twice & Time to Complete -->
		<section class="mb-6 grid grid-cols-2 gap-3">
			<InsightCard
				icon="🎯"
				label="Never Miss Twice"
				value="{$advancedStats.neverMissTwice.currentStreak}d"
				subtitle="Best: {$advancedStats.neverMissTwice.bestStreak}d"
			/>
			{#if $advancedStats.timeToComplete.applicableHabits > 0}
				<InsightCard
					icon="⏱️"
					label="Response Time"
					value="{$advancedStats.timeToComplete.averageDelayMinutes}m"
					subtitle="{$advancedStats.timeToComplete.applicableHabits} habit{$advancedStats
						.timeToComplete.applicableHabits > 1
						? 's'
						: ''} with reminders"
				/>
			{/if}
		</section>
	{:else}
		<!-- Loading skeleton -->
		<section class="mb-6 space-y-3">
			<div class="card animate-pulse">
				<div class="h-24 rounded bg-surface-sunken"></div>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div class="card animate-pulse"><div class="h-20 rounded bg-surface-sunken"></div></div>
				<div class="card animate-pulse"><div class="h-20 rounded bg-surface-sunken"></div></div>
			</div>
		</section>
	{/if}

	<!-- Motivation Section -->
	<section class="card bg-linear-to-br from-surface-raised to-surface-sunken">
		<div class="text-center">
			<p class="mb-2 text-4xl">💪</p>
			<h3 class="mb-1 font-semibold text-content">Keep it up!</h3>
			<p class="text-sm text-content-muted">
				Consistency is key. Every habit completed brings you closer to your goals.
			</p>
		</div>
	</section>
</main>
