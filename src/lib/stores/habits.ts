/**
 * Habits Store with Dexie.js Persistence
 *
 * This store provides reactive habit data backed by IndexedDB.
 * Uses Dexie's liveQuery for automatic reactivity when data changes.
 *
 * All users (authenticated and unauthenticated) start with an empty habit list.
 * Users create their own habits manually, with suggested habits available in the UI.
 *
 * @see docs/API.md for data model documentation
 */
import { readable, derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { liveQuery } from 'dexie';
import {
	db,
	getAllHabits,
	createHabit,
	updateHabit,
	deleteHabit,
	toggleHabitCompletion,
	markPartialCompletion,
	getCompletionTypeForDate,
	calculateFlexibleStreaksForHabits,
	getCompletedTodayMap,
	type Habit,
	type CreateHabitInput,
	type UpdateHabitInput,
	type CompletionType
} from '$lib/db';

// ============================================================================
// Types
// ============================================================================

/**
 * Extended habit with computed streak and completion status
 * This is what components receive - includes streak/completedToday
 *
 * @see docs/features/flexible-streaks.md for field descriptions
 */
export interface HabitWithStatus extends Habit {
	streak: number; // Consecutive days (daily) or consecutive successful weeks (weekly)
	completedToday: boolean;
	// Flexible streak fields (Phase 1)
	periodProgress: number; // Completions in current period (0/1 for daily, 0-7 for weekly)
	periodTarget: number; // Target for current period (1 for daily, user-configured for weekly)
	periodType: 'day' | 'week';
	totalCompletions: number; // Lifetime completion count
	// Partial completion fields (Phase 2)
	completionType: CompletionType | null; // 'full' | 'partial' | null (no completion today)
	// Interval habit fields (every-x-days)
	dueInDays?: number; // Days until next due; negative = overdue; undefined for non-interval habits
}

// ============================================================================
// Core Habits Store (Dexie LiveQuery)
// ============================================================================

/**
 * Track whether habits have been loaded from IndexedDB
 * This helps distinguish between "still loading" and "no habits exist"
 */
const habitsLoadedInternal = writable(false);

/**
 * Raw habits from IndexedDB, updated reactively via liveQuery
 */
const rawHabits = readable<Habit[]>([], (set) => {
	// Only run in browser - IndexedDB is not available during SSR
	if (!browser) {
		return () => {};
	}

	// Subscribe to Dexie liveQuery for reactive updates
	const subscription = liveQuery(() => getAllHabits()).subscribe({
		next: (habits) => {
			habitsLoadedInternal.set(true);
			set(habits);
		},
		error: (err) => console.error('[habits] LiveQuery error:', err)
	});

	return () => subscription.unsubscribe();
});

/**
 * Whether habits have been loaded from IndexedDB (read-only)
 * Use this to show loading states and distinguish "loading" from "empty"
 */
export const habitsLoaded = derived(habitsLoadedInternal, ($loaded) => $loaded);

// Note: habitStatus was removed as it's superseded by habitStatusWithTrigger below

// ============================================================================
// Trigger for Status Refresh
// ============================================================================

/**
 * Writable trigger to force status refresh after toggle or date change
 * Increment this to re-run the habitStatus derived store
 */
const statusRefreshTrigger = writable(0);

/**
 * Force a refresh of the habit status (streaks, completedToday)
 * Called after toggle, and also on app initialization to handle date changes
 */
export function refreshStatus() {
	statusRefreshTrigger.update((n) => n + 1);
}

/**
 * Status result for a single habit including flexible streak data
 */
interface HabitStatusResult {
	streak: number;
	completedToday: boolean;
	periodProgress: number;
	periodTarget: number;
	periodType: 'day' | 'week';
	totalCompletions: number;
	completionType: CompletionType | null;
	dueInDays?: number;
}

// Derived store that fetches flexible streaks and completion status
const habitStatusWithTrigger = derived<
	[typeof rawHabits, typeof statusRefreshTrigger],
	Map<number, HabitStatusResult>
>(
	[rawHabits, statusRefreshTrigger],
	([$rawHabits], set) => {
		// Skip if no habits or not in browser
		if ($rawHabits.length === 0 || !browser) {
			set(new Map());
			return;
		}

		// Get flexible streaks, completion status, and completion types in parallel
		const habitIds = $rawHabits.map((h) => h.id!);
		const completionTypePromises = habitIds.map((id) => getCompletionTypeForDate(id));

		Promise.all([
			calculateFlexibleStreaksForHabits($rawHabits),
			getCompletedTodayMap(habitIds),
			Promise.all(completionTypePromises)
		])
			.then(([flexibleStreaks, completedTodayMap, completionTypes]) => {
				const statusMap = new Map<number, HabitStatusResult>();
				for (let i = 0; i < $rawHabits.length; i++) {
					const habit = $rawHabits[i];
					const id = habit.id!;
					const flexResult = flexibleStreaks.get(id);
					const completionType = completionTypes[i];

					if (flexResult) {
						// Determine completedToday based on schedule type
						const scheduleType = habit.schedule?.type;
						let completedToday: boolean;
						if (scheduleType === 'every-x-days') {
							// Interval habits: "done" means completed within the current window
							completedToday = flexResult.periodProgress >= 1;
						} else if (habit.frequencyType === 'daily' || scheduleType === 'daily') {
							// Daily habits: target met for the day
							completedToday = flexResult.periodProgress >= flexResult.periodTarget;
						} else {
							// Weekly habits: has any completion for TODAY specifically
							completedToday = completedTodayMap.get(id) ?? false;
						}

						statusMap.set(id, {
							streak: flexResult.streak,
							completedToday,
							periodProgress: flexResult.periodProgress,
							periodTarget: flexResult.periodTarget,
							periodType: flexResult.periodType,
							totalCompletions: flexResult.totalCompletions,
							completionType,
							dueInDays: flexResult.dueInDays
						});
					} else {
						// Fallback for edge cases
						statusMap.set(id, {
							streak: 0,
							completedToday: false,
							periodProgress: 0,
							periodTarget: 1,
							periodType: 'day',
							totalCompletions: 0,
							completionType: null
						});
					}
				}
				set(statusMap);
			})
			.catch((err) => console.error('[habits] Status fetch error:', err));
	},
	new Map()
);

/**
 * Combined habits with their computed status (using refresh trigger)
 */
const habitsWithStatusFinal = derived<
	[typeof rawHabits, typeof habitStatusWithTrigger],
	HabitWithStatus[]
>([rawHabits, habitStatusWithTrigger], ([$rawHabits, $habitStatus]) => {
	return $rawHabits.map((habit) => {
		const status = $habitStatus.get(habit.id!) ?? {
			streak: 0,
			completedToday: false,
			periodProgress: 0,
			periodTarget: 1,
			periodType: 'day' as const,
			totalCompletions: 0,
			completionType: null,
			dueInDays: undefined
		};
		return {
			...habit,
			streak: status.streak,
			completedToday: status.completedToday,
			periodProgress: status.periodProgress,
			periodTarget: status.periodTarget,
			periodType: status.periodType,
			totalCompletions: status.totalCompletions,
			completionType: status.completionType,
			dueInDays: status.dueInDays
		};
	});
});

// ============================================================================
// Public API
// ============================================================================

/**
 * Main habits store with methods for managing habits
 * Maintains backward compatibility with the old mock data store
 */
export const habits = {
	subscribe: habitsWithStatusFinal.subscribe,

	/**
	 * Toggle habit completion for today (full completion)
	 */
	toggle: async (id: number): Promise<void> => {
		if (!browser) return;
		await toggleHabitCompletion(id);
		refreshStatus();
	},

	/**
	 * Mark habit as partially completed for today
	 * - If no completion exists, adds partial
	 * - If partial exists, no change
	 * - If full exists, no change (won't downgrade)
	 */
	togglePartial: async (id: number): Promise<void> => {
		if (!browser) return;
		await markPartialCompletion(id);
		refreshStatus();
	},

	/**
	 * Add a new habit
	 */
	add: async (habit: CreateHabitInput): Promise<number> => {
		if (!browser) return -1;
		return await createHabit(habit);
	},

	/**
	 * Remove a habit by ID
	 */
	remove: async (id: number): Promise<void> => {
		if (!browser) return;
		await deleteHabit(id);
	},

	/**
	 * Update an existing habit
	 */
	edit: async (id: number, updates: UpdateHabitInput): Promise<void> => {
		if (!browser) return;
		await updateHabit(id, updates);
	},

	/**
	 * Clear all habits and logs (for testing or account reset)
	 */
	reset: async (): Promise<void> => {
		if (!browser) return;
		await db.habits.clear();
		await db.logs.clear();
		refreshStatus();
	}
};

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * Derived store that calculates today's progress
 */
export const todaysProgress = derived(habitsWithStatusFinal, ($habits) => {
	const total = $habits.length;
	const completed = $habits.filter((h) => h.completedToday).length;
	const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

	return { total, completed, pct };
});

/**
 * Derived store that returns habits sorted by completion status
 */
export const sortedHabits = derived(habitsWithStatusFinal, ($habits) => {
	return [...$habits].sort((a, b) => {
		// Incomplete habits first
		if (a.completedToday !== b.completedToday) {
			return a.completedToday ? 1 : -1;
		}
		// Then by streak (higher first)
		return b.streak - a.streak;
	});
});
