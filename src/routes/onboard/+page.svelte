<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onDestroy, tick } from 'svelte';
	import { fade } from 'svelte/transition';
	import { suggestedHabits, type SuggestedHabit } from '$lib/data/suggestedHabits';
	import { habitColors, monsterStages } from '$lib/data/mockData';
	import { pushStore } from '$lib/notifications';
	import type { HabitSchedule } from '$lib/db/db';
	import { isAuthenticated } from '$lib/stores/auth';
	import { habits } from '$lib/stores/habits';
	import { showToast } from '$lib/stores/toast.svelte';

	type Screen = 'egg' | 'identity' | 'habit' | 'when' | 'frequency' | 'notifications' | 'reveal';

	interface OnboardingDraft {
		name: string;
		emoji: string;
		color: string;
		reminderTime: string | null;
		schedule: HabitSchedule;
	}

	const ONBOARDED_KEY = 'hh:onboarded';
	const DEFAULT_EMOJI = '📌';
	const DEFAULT_COLOR = habitColors[0];
	const HOME_PATH = resolve('/');

	const identityOptions = [
		{ emoji: '🏃', label: 'Healthier', reply: 'Strong habits make strong days.' },
		{ emoji: '🧠', label: 'Sharper', reply: 'Good. Let’s feed your focus.' },
		{ emoji: '🧘', label: 'Calmer', reply: 'Calm tastes good.' },
		{ emoji: '✨', label: 'More disciplined', reply: 'Consistency is a feast.' }
	] as const;

	const timePresets = [
		{ emoji: '🌅', label: 'Morning', time: '08:00' },
		{ emoji: '🍱', label: 'Lunch', time: '12:30' },
		{ emoji: '🌆', label: 'Evening', time: '19:00' },
		{ emoji: '🌙', label: 'Before bed', time: '22:00' }
	] as const;

	const weeklyOptions = [3, 4, 5, 6] as const;
	const intervalOptions = [2, 3, 5, 7] as const;

	let screen = $state<Screen>('egg');
	let draft = $state<OnboardingDraft>({
		name: '',
		emoji: DEFAULT_EMOJI,
		color: DEFAULT_COLOR,
		reminderTime: null,
		schedule: { type: 'daily' }
	});
	let identityReply = $state('');
	let showCustomTime = $state(false);
	let isFinishing = $state(false);
	let error = $state('');
	let habitInput = $state<HTMLInputElement | null>(null);
	let customTimeInput = $state<HTMLInputElement | null>(null);
	let identityTimeout: ReturnType<typeof setTimeout> | null = null;

	function normalizeText(value: string) {
		return value.trim().toLowerCase();
	}

	function timeToMinutes(time: string) {
		const [hours, minutes] = time.split(':').map(Number);
		return hours * 60 + minutes;
	}

	function formatTimeLabel(time: string | null) {
		if (!time) return 'No reminder';
		const [hours, minutes] = time.split(':').map(Number);
		return new Date(2024, 0, 1, hours, minutes).toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function findExactSuggestion(name: string) {
		const query = normalizeText(name);
		return suggestedHabits.find((habit) => normalizeText(habit.name) === query);
	}

	function findNearestTimePreset(time: string | null) {
		if (!time) return null;
		const minutes = timeToMinutes(time);
		return (
			timePresets.reduce<(typeof timePresets)[number] | null>((closest, option) => {
				if (!closest) return option;
				const closestDiff = Math.abs(timeToMinutes(closest.time) - minutes);
				const optionDiff = Math.abs(timeToMinutes(option.time) - minutes);
				return optionDiff < closestDiff ? option : closest;
			}, null) ?? null
		);
	}

	function scheduleLabel(schedule: HabitSchedule) {
		switch (schedule.type) {
			case 'weekly':
				return `${schedule.timesPerWeek ?? 3}× per week`;
			case 'every-x-days':
				return `Every ${schedule.intervalDays ?? 2} days`;
			default:
				return 'Every day';
		}
	}

	function clearIdentityTimer() {
		if (identityTimeout) {
			clearTimeout(identityTimeout);
			identityTimeout = null;
		}
	}

	const prompt = $derived.by(() => {
		switch (screen) {
			case 'egg':
				return "I'm hungry. Are you?";
			case 'identity':
				return 'Who do you want to become?';
			case 'habit':
				return 'What do you want to get hungry for?';
			case 'when':
				return 'When do you usually have time?';
			case 'frequency':
				return 'How often?';
			case 'notifications':
				return 'Want me to remind you?';
			case 'reveal':
				return 'Your first meal is ready.';
		}
	});

	const habitSuggestions = $derived.by(() => {
		const query = normalizeText(draft.name);
		if (!query) return suggestedHabits.slice(0, 4);
		return suggestedHabits.filter((habit) => normalizeText(habit.name).includes(query)).slice(0, 4);
	});

	const selectedTimePreset = $derived.by(() => findNearestTimePreset(draft.reminderTime));
	const canContinueHabit = $derived(draft.name.trim().length >= 2);
	const draftSummary = $derived.by(() => {
		const parts = [scheduleLabel(draft.schedule)];
		if (screen !== 'habit' && screen !== 'identity' && screen !== 'egg') {
			parts.unshift(formatTimeLabel(draft.reminderTime));
		}
		return parts.join(' · ');
	});

	$effect(() => {
		if (screen === 'habit') {
			void tick().then(() => habitInput?.focus());
		}
	});

	$effect(() => {
		if (screen === 'when' && showCustomTime) {
			void tick().then(() => customTimeInput?.focus());
		}
	});

	function goToHabitScreen() {
		clearIdentityTimer();
		identityReply = '';
		screen = 'habit';
	}

	function handleIdentitySelect(option: (typeof identityOptions)[number]) {
		clearIdentityTimer();
		identityReply = option.reply;
		identityTimeout = setTimeout(() => {
			screen = 'habit';
			identityReply = '';
			identityTimeout = null;
		}, 1200);
	}

	function applySuggestionDefaults(match: SuggestedHabit | undefined) {
		draft.emoji = match?.emoji ?? DEFAULT_EMOJI;
		draft.color = match?.color ?? DEFAULT_COLOR;
		draft.reminderTime = match?.reminderTime ?? null;
		showCustomTime = false;
	}

	function continueFromHabit() {
		if (!canContinueHabit) return;
		applySuggestionDefaults(findExactSuggestion(draft.name));
		error = '';
		screen = 'when';
	}

	function skipReminder() {
		draft.reminderTime = null;
		showCustomTime = false;
		screen = 'frequency';
	}

	function openCustomTime() {
		showCustomTime = true;
		draft.reminderTime ??= selectedTimePreset?.time ?? '08:00';
	}

	function continueFromWhen() {
		error = '';
		screen = 'frequency';
	}

	function selectSchedule(schedule: HabitSchedule) {
		draft.schedule = schedule;
	}

	function continueFromFrequency() {
		screen = draft.reminderTime ? 'notifications' : 'reveal';
	}

	async function handleNotificationChoice(shouldPrompt: boolean) {
		if (shouldPrompt) {
			await pushStore.requestPermission();
		}
		screen = 'reveal';
	}

	function buildHabitPayload() {
		const payload = {
			name: draft.name.trim(),
			emoji: draft.emoji,
			color: draft.color,
			reminderTime: draft.reminderTime ?? undefined,
			schedule: draft.schedule
		};

		if (draft.schedule.type === 'weekly') {
			return {
				...payload,
				frequencyType: 'weekly' as const,
				frequencyTarget: draft.schedule.timesPerWeek ?? 3
			};
		}

		if (draft.schedule.type === 'daily') {
			return {
				...payload,
				frequencyType: 'daily' as const,
				frequencyTarget: 1
			};
		}

		return payload;
	}

	async function finishOnboarding() {
		if (isFinishing) return;

		isFinishing = true;
		error = '';

		try {
			await habits.add(buildHabitPayload());
			localStorage.setItem(ONBOARDED_KEY, '1');

			if (!$isAuthenticated) {
				showToast({
					message: 'Save your progress',
					actionLabel: 'Create account',
					onAction: () => goto(resolve('/auth/signup'))
				});
			}

			await goto(HOME_PATH, { replaceState: true });
		} catch (err) {
			error = err instanceof Error ? err.message : 'Could not create your first habit.';
			isFinishing = false;
		}
	}

	function goBack() {
		clearIdentityTimer();

		switch (screen) {
			case 'habit':
				screen = 'identity';
				break;
			case 'when':
				screen = 'habit';
				break;
			case 'frequency':
				screen = 'when';
				break;
			case 'notifications':
				screen = 'frequency';
				break;
			case 'reveal':
				screen = draft.reminderTime ? 'notifications' : 'frequency';
				break;
		}
	}

	onDestroy(() => clearIdentityTimer());
</script>

<svelte:head>
	<title>Welcome | Hungry Hundreds</title>
</svelte:head>

<main class="bg-primary px-4 py-6">
	<div
		class="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-lg flex-col items-center justify-center"
	>
		<div class="mb-8 flex w-full flex-col items-center">
			<div
				class="mb-4 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-white/70 bg-white/65 shadow-lg shadow-black/5"
			>
				<span class="text-6xl">{monsterStages.egg.emoji}</span>
			</div>

			<div
				class="max-w-sm rounded-[1.75rem] border border-white/70 bg-white px-5 py-4 text-center shadow-lg shadow-black/5"
			>
				<p data-testid="onboarding-prompt" class="font-display text-xl leading-tight text-content">
					{prompt}
				</p>
				{#if screen === 'identity' && identityReply}
					<p class="mt-2 text-sm text-content-subtle">{identityReply}</p>
				{/if}
			</div>
		</div>

		<div
			class="w-full rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-xl shadow-black/5 backdrop-blur-sm"
		>
			{#if draft.name.trim() && screen !== 'egg' && screen !== 'identity'}
				<div class="mb-4 flex items-center gap-3 rounded-2xl bg-surface-sunken px-4 py-3">
					<div
						class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
						style:background-color={`${draft.color}22`}
					>
						{draft.emoji}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate font-semibold text-content">{draft.name}</p>
						<p class="text-sm text-content-subtle">{draftSummary}</p>
					</div>
				</div>
			{/if}

			{#key screen}
				<section in:fade={{ duration: 220 }} out:fade={{ duration: 140 }} class="space-y-4">
					{#if screen === 'egg'}
						<button type="button" onclick={() => (screen = 'identity')} class="btn-primary w-full">
							Feed me a habit →
						</button>
					{:else if screen === 'identity'}
						<div class="grid gap-3">
							{#each identityOptions as option (option.label)}
								<button
									type="button"
									onclick={() => handleIdentitySelect(option)}
									class="border-border bg-secondary rounded-2xl border px-4 py-3 text-left text-body-lg font-medium text-content transition-all hover:border-accent-warm hover:bg-[rgba(232,113,58,0.08)]"
								>
									<span class="mr-2">{option.emoji}</span>{option.label}
								</button>
							{/each}
						</div>

						<button
							type="button"
							onclick={goToHabitScreen}
							class="w-full text-sm text-content-subtle"
						>
							Skip this
						</button>
					{:else if screen === 'habit'}
						<div class="space-y-3">
							<label for="habit-name" class="block text-sm font-medium text-content-muted">
								Your first habit
							</label>
							<input
								id="habit-name"
								bind:this={habitInput}
								bind:value={draft.name}
								placeholder="Drink water, read, stretch…"
								maxlength="48"
								class="border-border w-full rounded-2xl border bg-surface px-4 py-3 text-body-lg text-content transition-colors outline-none focus:border-accent-warm"
								onkeydown={(event) => {
									if (event.key === 'Enter') {
										event.preventDefault();
										continueFromHabit();
									}
								}}
							/>

							<div class="flex flex-wrap gap-2">
								{#each habitSuggestions as suggestion (suggestion.name)}
									<button
										type="button"
										onclick={() => (draft.name = suggestion.name)}
										class="border-border bg-secondary rounded-full border px-3 py-2 text-sm font-medium text-content transition-colors hover:border-accent-warm hover:bg-[rgba(232,113,58,0.08)]"
									>
										{suggestion.emoji}
										{suggestion.name}
									</button>
								{/each}
							</div>

							<button
								type="button"
								onclick={continueFromHabit}
								data-testid="habit-continue"
								class="btn-primary w-full"
								disabled={!canContinueHabit}
							>
								Continue →
							</button>
							<button type="button" onclick={goBack} class="w-full text-sm text-content-subtle">
								Back
							</button>
						</div>
					{:else if screen === 'when'}
						<div class="space-y-3">
							<div class="grid gap-3 sm:grid-cols-2">
								{#each timePresets as option (option.time)}
									<button
										type="button"
										onclick={() => {
											draft.reminderTime = option.time;
											showCustomTime = false;
										}}
										class="rounded-2xl border px-4 py-3 text-left transition-all"
										class:border-accent-warm={selectedTimePreset?.time === option.time &&
											!showCustomTime}
										class:bg-[rgba(232,113,58,0.08)]={selectedTimePreset?.time === option.time &&
											!showCustomTime}
										class:border-border={selectedTimePreset?.time !== option.time || showCustomTime}
										class:bg-secondary={selectedTimePreset?.time !== option.time || showCustomTime}
										aria-pressed={selectedTimePreset?.time === option.time && !showCustomTime}
									>
										<p class="font-semibold text-content">{option.emoji} {option.label}</p>
										<p class="mt-1 text-sm text-content-subtle">{formatTimeLabel(option.time)}</p>
									</button>
								{/each}
							</div>

							<button
								type="button"
								onclick={openCustomTime}
								class="w-full text-sm font-medium text-accent-warm"
							>
								Pick a specific time
							</button>

							{#if showCustomTime}
								<div class="border-border rounded-2xl border bg-surface-sunken p-4">
									<label
										for="custom-time"
										class="mb-2 block text-sm font-medium text-content-muted"
									>
										Specific reminder time
									</label>
									<input
										id="custom-time"
										bind:this={customTimeInput}
										type="time"
										bind:value={draft.reminderTime}
										class="border-border w-full rounded-xl border bg-white px-3 py-2 text-content outline-none focus:border-accent-warm"
									/>
								</div>
							{/if}

							<button
								type="button"
								onclick={continueFromWhen}
								data-testid="when-continue"
								class="btn-primary w-full"
								disabled={!draft.reminderTime && showCustomTime}
							>
								Continue →
							</button>

							<button
								type="button"
								onclick={skipReminder}
								class="w-full text-sm text-content-subtle"
							>
								Skip — I don't want a reminder
							</button>
							<button type="button" onclick={goBack} class="w-full text-sm text-content-subtle">
								Back
							</button>
						</div>
					{:else if screen === 'frequency'}
						<div class="space-y-4">
							<div class="grid gap-3">
								<button
									type="button"
									onclick={() => selectSchedule({ type: 'daily' })}
									class="rounded-2xl border px-4 py-3 text-left transition-all"
									class:border-accent-warm={draft.schedule.type === 'daily'}
									class:bg-[rgba(232,113,58,0.08)]={draft.schedule.type === 'daily'}
									class:border-border={draft.schedule.type !== 'daily'}
									class:bg-secondary={draft.schedule.type !== 'daily'}
									aria-pressed={draft.schedule.type === 'daily'}
								>
									Every day
								</button>

								<button
									type="button"
									onclick={() =>
										selectSchedule({
											type: 'weekly',
											timesPerWeek:
												draft.schedule.type === 'weekly' ? (draft.schedule.timesPerWeek ?? 3) : 3
										})}
									class="rounded-2xl border px-4 py-3 text-left transition-all"
									class:border-accent-warm={draft.schedule.type === 'weekly'}
									class:bg-[rgba(232,113,58,0.08)]={draft.schedule.type === 'weekly'}
									class:border-border={draft.schedule.type !== 'weekly'}
									class:bg-secondary={draft.schedule.type !== 'weekly'}
									aria-pressed={draft.schedule.type === 'weekly'}
								>
									A few times a week
								</button>

								{#if draft.schedule.type === 'weekly'}
									<div class="flex flex-wrap gap-2">
										{#each weeklyOptions as option (option)}
											<button
												type="button"
												onclick={() => selectSchedule({ type: 'weekly', timesPerWeek: option })}
												class="rounded-full border px-3 py-2 text-sm font-medium transition-all"
												class:border-accent-warm={draft.schedule.timesPerWeek === option}
												class:bg-[rgba(232,113,58,0.08)]={draft.schedule.timesPerWeek === option}
												class:border-border={draft.schedule.timesPerWeek !== option}
												class:bg-secondary={draft.schedule.timesPerWeek !== option}
											>
												{option}×
											</button>
										{/each}
									</div>
								{/if}

								<button
									type="button"
									onclick={() =>
										selectSchedule({
											type: 'every-x-days',
											intervalDays:
												draft.schedule.type === 'every-x-days'
													? (draft.schedule.intervalDays ?? 2)
													: 2
										})}
									class="rounded-2xl border px-4 py-3 text-left transition-all"
									class:border-accent-warm={draft.schedule.type === 'every-x-days'}
									class:bg-[rgba(232,113,58,0.08)]={draft.schedule.type === 'every-x-days'}
									class:border-border={draft.schedule.type !== 'every-x-days'}
									class:bg-secondary={draft.schedule.type !== 'every-x-days'}
									aria-pressed={draft.schedule.type === 'every-x-days'}
								>
									Every few days
								</button>

								{#if draft.schedule.type === 'every-x-days'}
									<div class="flex flex-wrap gap-2">
										{#each intervalOptions as option (option)}
											<button
												type="button"
												onclick={() =>
													selectSchedule({ type: 'every-x-days', intervalDays: option })}
												class="rounded-full border px-3 py-2 text-sm font-medium transition-all"
												class:border-accent-warm={draft.schedule.intervalDays === option}
												class:bg-[rgba(232,113,58,0.08)]={draft.schedule.intervalDays === option}
												class:border-border={draft.schedule.intervalDays !== option}
												class:bg-secondary={draft.schedule.intervalDays !== option}
											>
												Every {option} days
											</button>
										{/each}
									</div>
								{/if}
							</div>

							<button
								type="button"
								onclick={continueFromFrequency}
								data-testid="frequency-continue"
								class="btn-primary w-full"
							>
								Continue →
							</button>
							<button type="button" onclick={goBack} class="w-full text-sm text-content-subtle">
								Back
							</button>
						</div>
					{:else if screen === 'notifications'}
						<div class="space-y-3">
							<button
								type="button"
								onclick={() => handleNotificationChoice(true)}
								data-testid="notifications-yes"
								class="btn-primary w-full"
							>
								Yes, remind me
							</button>
							<button
								type="button"
								onclick={() => handleNotificationChoice(false)}
								class="btn-secondary w-full"
							>
								Not now
							</button>
							<button type="button" onclick={goBack} class="w-full text-sm text-content-subtle">
								Back
							</button>
						</div>
					{:else}
						<div class="space-y-4 text-center">
							<div class="rounded-2xl bg-surface-sunken px-4 py-4">
								<p class="text-sm text-content-subtle">Ready to start?</p>
								<p class="mt-2 font-display text-2xl text-content">{draft.name}</p>
								<p class="mt-2 text-sm text-content-subtle">{draftSummary}</p>
							</div>

							{#if error}
								<p class="text-sm text-red-600">{error}</p>
							{/if}

							<button
								type="button"
								onclick={finishOnboarding}
								data-testid="reveal-start"
								class="btn-primary w-full"
								disabled={isFinishing}
							>
								{#if isFinishing}Starting your journey…{:else}Start journey{/if}
							</button>
							<button
								type="button"
								onclick={goBack}
								class="w-full text-sm text-content-subtle"
								disabled={isFinishing}
							>
								Back
							</button>
						</div>
					{/if}
				</section>
			{/key}
		</div>
	</div>
</main>
