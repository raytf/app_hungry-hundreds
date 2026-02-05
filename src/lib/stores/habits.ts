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
	calculateFlexibleStreaksForHabits,
	getCompletedTodayMap,
	type Habit,
	type CreateHabitInput,
	type UpdateHabitInput
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

		// Get flexible streaks and actual today completion status in parallel
		const habitIds = $rawHabits.map((h) => h.id!);
		Promise.all([calculateFlexibleStreaksForHabits($rawHabits), getCompletedTodayMap(habitIds)])
			.then(([flexibleStreaks, completedTodayMap]) => {
				const statusMap = new Map<number, HabitStatusResult>();
				for (const habit of $rawHabits) {
					const id = habit.id!;
					const flexResult = flexibleStreaks.get(id);

					if (flexResult) {
						// For daily habits: completedToday = target met for the day
						// For weekly habits: completedToday = has any completion for TODAY specifically
						// (not just any progress this week)
						const completedToday =
							habit.frequencyType === 'daily'
								? flexResult.periodProgress >= flexResult.periodTarget
								: (completedTodayMap.get(id) ?? false);

						statusMap.set(id, {
							streak: flexResult.streak,
							completedToday,
							periodProgress: flexResult.periodProgress,
							periodTarget: flexResult.periodTarget,
							periodType: flexResult.periodType,
							totalCompletions: flexResult.totalCompletions
						});
					} else {
						// Fallback for edge cases
						statusMap.set(id, {
							streak: 0,
							completedToday: false,
							periodProgress: 0,
							periodTarget: 1,
							periodType: 'day',
							totalCompletions: 0
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
			totalCompletions: 0
		};
		return {
			...habit,
			streak: status.streak,
			completedToday: status.completedToday,
			periodProgress: status.periodProgress,
			periodTarget: status.periodTarget,
			periodType: status.periodType,
			totalCompletions: status.totalCompletions
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
	 * Toggle habit completion for today
	 */
	toggle: async (id: number): Promise<void> => {
		if (!browser) return;
		await toggleHabitCompletion(id);
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
