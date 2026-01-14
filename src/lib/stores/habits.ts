import { writable, derived } from 'svelte/store';
import { mockHabits, type Habit } from '$lib/data/mockData';

/**
 * Creates a habits store with methods for managing habit state
 */
function createHabitsStore() {
	const { subscribe, set, update } = writable<Habit[]>(structuredClone(mockHabits));

	return {
		subscribe,

		/**
		 * Toggle habit completion for today
		 * Updates completedToday and adjusts streak accordingly
		 */
		toggle: (id: number) =>
			update((habits) =>
				habits.map((h) =>
					h.id === id
						? {
								...h,
								completedToday: !h.completedToday,
								streak: h.completedToday ? Math.max(0, h.streak - 1) : h.streak + 1
							}
						: h
				)
			),

		/**
		 * Add a new habit to the store
		 */
		add: (habit: Omit<Habit, 'id' | 'streak' | 'completedToday'>) =>
			update((habits) => [
				...habits,
				{
					...habit,
					id: Date.now(),
					streak: 0,
					completedToday: false
				}
			]),

		/**
		 * Remove a habit by ID
		 */
		remove: (id: number) => update((habits) => habits.filter((h) => h.id !== id)),

		/**
		 * Update an existing habit
		 */
		edit: (id: number, updates: Partial<Omit<Habit, 'id'>>) =>
			update((habits) => habits.map((h) => (h.id === id ? { ...h, ...updates } : h))),

		/**
		 * Reset store to initial mock data
		 */
		reset: () => set(structuredClone(mockHabits))
	};
}

export const habits = createHabitsStore();

/**
 * Derived store that calculates today's progress
 */
export const todaysProgress = derived(habits, ($habits) => {
	const total = $habits.length;
	const completed = $habits.filter((h) => h.completedToday).length;
	const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

	return { total, completed, pct };
});

/**
 * Derived store that returns habits sorted by completion status
 */
export const sortedHabits = derived(habits, ($habits) => {
	return [...$habits].sort((a, b) => {
		// Incomplete habits first
		if (a.completedToday !== b.completedToday) {
			return a.completedToday ? 1 : -1;
		}
		// Then by streak (higher first)
		return b.streak - a.streak;
	});
});

