/**
 * Habits Store with Dexie.js Persistence
 *
 * This store provides reactive habit data backed by IndexedDB.
 * Uses Dexie's liveQuery for automatic reactivity when data changes.
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
	seedHabitsIfEmpty,
	toggleHabitCompletion,
	calculateStreaksForHabits,
	getCompletedTodayMap,
	type Habit,
	type CreateHabitInput,
	type UpdateHabitInput
} from '$lib/db';
import { mockHabits } from '$lib/data/mockData';

// ============================================================================
// Types
// ============================================================================

/**
 * Extended habit with computed streak and completion status
 * This is what components receive - includes streak/completedToday
 */
export interface HabitWithStatus extends Habit {
	streak: number;
	completedToday: boolean;
}

// ============================================================================
// Database Initialization
// ============================================================================

/** Flag to track if database has been seeded */
let isInitialized = false;

/**
 * Initialize the database with seed data if empty
 * Called automatically when the store is first accessed
 */
async function initializeDatabase(): Promise<void> {
	if (isInitialized) return;

	const seedData: CreateHabitInput[] = mockHabits.map((h) => ({
		name: h.name,
		emoji: h.emoji,
		color: h.color,
		reminderTime: h.reminderTime ?? undefined
	}));

	const result = await seedHabitsIfEmpty(seedData);
	if (result.seeded) {
		console.log(`[habits] Seeded database with ${result.count} habits`);
	}
	isInitialized = true;
}

// ============================================================================
// Core Habits Store (Dexie LiveQuery)
// ============================================================================

/**
 * Raw habits from IndexedDB, updated reactively via liveQuery
 */
const rawHabits = readable<Habit[]>([], (set) => {
	// Only run in browser - IndexedDB is not available during SSR
	if (!browser) {
		return () => {};
	}

	// Initialize database on first subscription (with error handling)
	initializeDatabase().catch((err) => console.error('[habits] Init error:', err));

	// Subscribe to Dexie liveQuery for reactive updates
	const subscription = liveQuery(() => getAllHabits()).subscribe({
		next: (habits) => set(habits),
		error: (err) => console.error('[habits] LiveQuery error:', err)
	});

	return () => subscription.unsubscribe();
});

// Note: habitStatus was removed as it's superseded by habitStatusWithTrigger below

// ============================================================================
// Trigger for Status Refresh
// ============================================================================

/**
 * Writable trigger to force status refresh after toggle
 * Increment this to re-run the habitStatus derived store
 */
const statusRefreshTrigger = writable(0);

function refreshStatus() {
	statusRefreshTrigger.update((n) => n + 1);
}

// Derived store that fetches streaks and completion status
const habitStatusWithTrigger = derived<
	[typeof rawHabits, typeof statusRefreshTrigger],
	Map<number, { streak: number; completedToday: boolean }>
>(
	[rawHabits, statusRefreshTrigger],
	([$rawHabits], set) => {
		// Skip if no habits or not in browser
		if ($rawHabits.length === 0 || !browser) {
			set(new Map());
			return;
		}

		const habitIds = $rawHabits.map((h) => h.id!);

		Promise.all([calculateStreaksForHabits(habitIds), getCompletedTodayMap(habitIds)])
			.then(([streaks, completed]) => {
				const statusMap = new Map<number, { streak: number; completedToday: boolean }>();
				for (const id of habitIds) {
					statusMap.set(id, {
						streak: streaks.get(id) ?? 0,
						completedToday: completed.get(id) ?? false
					});
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
		const status = $habitStatus.get(habit.id!) ?? { streak: 0, completedToday: false };
		return {
			...habit,
			streak: status.streak,
			completedToday: status.completedToday
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
	 * Clear all habits and reseed from mock data
	 */
	reset: async (): Promise<void> => {
		if (!browser) return;
		await db.habits.clear();
		await db.logs.clear();
		isInitialized = false;
		await initializeDatabase();
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
