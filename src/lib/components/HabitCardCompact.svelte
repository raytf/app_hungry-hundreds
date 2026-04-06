<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { habits, type HabitWithStatus } from '$lib/stores/habits';
	import { prefersReducedMotion } from '$lib/animations/transitions';
	import { monsterSetExpression } from '$lib/stores/monster';
	import { animate } from 'motion';

	interface Props {
		habit: HabitWithStatus;
		/** Callback when habit is completed (not uncompleted) */
		onComplete?: () => void;
	}

	let { habit, onComplete }: Props = $props();

	let expressionTimeout: ReturnType<typeof setTimeout> | null = null;

	const isFullyCompleted = $derived(habit.completionType === 'full');
	const isPartiallyCompleted = $derived(habit.completionType === 'partial');

	// Mirror the 4-case schedule detection from HabitCard.svelte
	const isIntervalBased = $derived(habit.schedule?.type === 'every-x-days');
	const isWeekly = $derived(
		!isIntervalBased &&
			(habit.frequencyType === 'weekly' || habit.schedule?.type === 'weekly')
	);
	const isMultiDaily = $derived(
		!isIntervalBased && habit.frequencyType === 'daily' && (habit.frequencyTarget ?? 1) > 1
	);

	/** Streak-line text shown below the habit name */
	const streakLabel = $derived.by(() => {
		if (isIntervalBased) {
			const interval = habit.schedule?.intervalDays;
			const prefix = `Every ${interval} day${interval !== 1 ? 's' : ''}`;
			if (habit.completedToday) return `${prefix} · Done ✓`;
			if (habit.dueInDays === undefined) return prefix;
			if (habit.dueInDays > 0)
				return `${prefix} · Due in ${habit.dueInDays} day${habit.dueInDays !== 1 ? 's' : ''}`;
			if (habit.dueInDays === 0) return `${prefix} · Due today`;
			return `${prefix} · Overdue by ${Math.abs(habit.dueInDays)} day${Math.abs(habit.dueInDays) !== 1 ? 's' : ''}`;
		}
		const done = habit.periodProgress >= habit.periodTarget;
		if (isWeekly)
			return `This week: ${habit.periodProgress}/${habit.periodTarget}${done ? ' ✓' : ''}`;
		if (isMultiDaily)
			return `Today: ${habit.periodProgress}/${habit.periodTarget}${done ? ' ✓' : ''}`;
		// Single-daily
		if (habit.streak === 0) return 'No streak yet';
		return `🔥 ${habit.streak} day${habit.streak === 1 ? '' : 's'}`;
	});

	function animateCircle(element: HTMLElement) {
		if (prefersReducedMotion()) return;
		animate(element, { scale: [1, 1.2, 1] }, { type: 'spring', stiffness: 400, damping: 15 });
	}

	async function handleToggle(event: MouseEvent) {
		event.stopPropagation();
		if (habit.id === undefined) return;

		const target = event.currentTarget as HTMLElement;
		animateCircle(target);

		// Milestone celebration on completing
		const newStreak = habit.completedToday ? habit.streak - 1 : habit.streak + 1;
		if (!habit.completedToday && (newStreak === 7 || newStreak === 30 || newStreak === 100)) {
			const { celebrateMilestone } = await import('$lib/animations/confetti');
			setTimeout(() => celebrateMilestone(target), 200);
		}

		// Monster reaction on completing (not uncompleting)
		if (!habit.completedToday) {
			if (expressionTimeout) clearTimeout(expressionTimeout);
			monsterSetExpression('excited');
			expressionTimeout = setTimeout(() => {
				monsterSetExpression('normal');
				expressionTimeout = null;
			}, 2000);
			onComplete?.();
		}

		habits.toggle(habit.id);
	}

	function handleCardClick() {
		if (habit.id !== undefined) {
			goto(resolve(`/habits/${habit.id}`));
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	onclick={handleCardClick}
	class="card flex w-full cursor-pointer items-center gap-3 text-left transition-colors active:scale-[0.99]"
	class:bg-success-soft={isFullyCompleted}
	class:bg-amber-50={isPartiallyCompleted}
	role="link"
	tabindex="0"
>
	<!-- Flavor icon: 32×32px emoji in bg-surface-sunken pill -->
	<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-sunken">
		<span class="text-base leading-none">{habit.emoji}</span>
	</div>

	<!-- Name + streak line -->
	<div class="min-w-0 flex-1">
		<p class="truncate text-body-lg text-content" title={habit.name}>
			{habit.name}
		</p>
		<p class="text-body-sm text-content-subtle">{streakLabel}</p>
	</div>

	<!-- Completion circle: 28×28px -->
	<button
		type="button"
		onclick={handleToggle}
		class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-all"
		class:bg-success={isFullyCompleted}
		class:border-2={!isFullyCompleted}
		class:border-edge={!isPartiallyCompleted && !isFullyCompleted}
		class:border-amber-400={isPartiallyCompleted}
		class:bg-amber-100={isPartiallyCompleted}
		aria-label={isFullyCompleted
			? `Mark ${habit.name} as incomplete`
			: `Mark ${habit.name} as complete`}
	>
		{#if isFullyCompleted}
			<svg class="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
				<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
			</svg>
		{:else if isPartiallyCompleted}
			<span class="text-xs font-bold text-amber-600">½</span>
		{/if}
	</button>
</div>
