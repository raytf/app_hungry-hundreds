/**
 * Suggested Habits Data
 *
 * Common habit suggestions to help users get started.
 * These are displayed in the empty state when users have no habits.
 */
import type { HabitSchedule } from '$lib/db/db';

export interface SuggestedHabit {
	name: string;
	emoji: string;
	color: string;
	reminderTime?: string;
	schedule: HabitSchedule;
	category: 'health' | 'learning' | 'mindfulness' | 'productivity';
}

/**
 * Curated list of popular habit suggestions
 */
export const suggestedHabits: SuggestedHabit[] = [
	{
		name: 'Morning Run',
		emoji: '🏃',
		color: '#22c55e',
		reminderTime: '07:00',
		schedule: { type: 'daily' },
		category: 'health'
	},
	{
		name: 'Read 30 mins',
		emoji: '📚',
		color: '#3b82f6',
		reminderTime: '21:00',
		schedule: { type: 'daily' },
		category: 'learning'
	},
	{
		name: 'Meditate',
		emoji: '🧘',
		color: '#8b5cf6',
		reminderTime: '06:30',
		schedule: { type: 'daily' },
		category: 'mindfulness'
	},
	{
		name: 'Drink 8 glasses',
		emoji: '💧',
		color: '#06b6d4',
		schedule: { type: 'daily' },
		category: 'health'
	},
	{
		name: 'Journal',
		emoji: '✍️',
		color: '#f97316',
		reminderTime: '22:00',
		schedule: { type: 'daily' },
		category: 'mindfulness'
	},
	{
		name: 'Exercise',
		emoji: '💪',
		color: '#ef4444',
		reminderTime: '18:00',
		schedule: { type: 'weekly', timesPerWeek: 3 },
		category: 'health'
	},
	{
		name: 'Learn language',
		emoji: '🗣️',
		color: '#10b981',
		schedule: { type: 'weekly', timesPerWeek: 5 },
		category: 'learning'
	},
	{
		name: 'No phone before bed',
		emoji: '📵',
		color: '#6366f1',
		reminderTime: '21:30',
		schedule: { type: 'daily' },
		category: 'productivity'
	}
];

/**
 * Get category label for display
 */
export function getCategoryLabel(category: SuggestedHabit['category']): string {
	switch (category) {
		case 'health':
			return 'Health & Fitness';
		case 'learning':
			return 'Learning';
		case 'mindfulness':
			return 'Mindfulness';
		case 'productivity':
			return 'Productivity';
	}
}

