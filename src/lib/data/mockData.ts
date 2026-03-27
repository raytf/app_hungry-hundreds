// Mock data for UI development - will be replaced with API calls in Phase 2

import type { HabitSchedule } from '$lib/db/db';

export interface Habit {
	id: number;
	name: string;
	emoji: string;
	color: string;
	streak: number;
	completedToday: boolean;
	reminderTime: string | null;
	schedule: HabitSchedule;
}

export interface Monster {
	name: string;
	stage: 'egg' | 'baby' | 'teen' | 'adult' | 'elder';
	evolutionProgress: number;
}

export interface WeeklyDataPoint {
	day: string;
	completed: number;
	total: number;
}

export interface Stats {
	completionRate: number;
	weeklyData: WeeklyDataPoint[];
}

export const mockHabits: Habit[] = [
	{
		id: 1,
		name: 'Morning Run',
		emoji: '🏃',
		color: '#22c55e',
		streak: 12,
		completedToday: false,
		reminderTime: '07:00',
		schedule: { type: 'daily' }
	},
	{
		id: 2,
		name: 'Read 30 mins',
		emoji: '📚',
		color: '#3b82f6',
		streak: 5,
		completedToday: true,
		reminderTime: '21:00',
		schedule: { type: 'daily' }
	},
	{
		id: 3,
		name: 'Meditate',
		emoji: '🧘',
		color: '#8b5cf6',
		streak: 3,
		completedToday: false,
		reminderTime: '06:30',
		schedule: { type: 'weekly', timesPerWeek: 5 }
	},
	{
		id: 4,
		name: 'Drink 8 glasses',
		emoji: '💧',
		color: '#06b6d4',
		streak: 0,
		completedToday: false,
		reminderTime: null,
		schedule: { type: 'daily' }
	}
];

export const mockMonster: Monster = {
	name: 'Chompy',
	stage: 'teen',
	evolutionProgress: 65
};

export const mockStats: Stats = {
	completionRate: 78,
	weeklyData: [
		{ day: 'Mon', completed: 4, total: 4 },
		{ day: 'Tue', completed: 3, total: 4 },
		{ day: 'Wed', completed: 4, total: 4 },
		{ day: 'Thu', completed: 2, total: 4 },
		{ day: 'Fri', completed: 4, total: 4 },
		{ day: 'Sat', completed: 3, total: 4 },
		{ day: 'Sun', completed: 1, total: 4 }
	]
};

// Available colors for habit creation
export const habitColors = [
	'#22c55e', // green
	'#3b82f6', // blue
	'#8b5cf6', // purple
	'#ec4899', // pink
	'#f97316', // orange
	'#06b6d4' // cyan
];

// Available emojis for habit creation
export const habitEmojis = ['🏃', '📚', '🧘', '💧', '💪', '🎯', '✍️', '🛏️'];

// Monster stage configuration
export const monsterStages = {
	egg: { emoji: '🥚', color: '#fef3c7' },
	baby: { emoji: '🐣', color: '#bfdbfe' },
	teen: { emoji: '🐲', color: '#c4b5fd' },
	adult: { emoji: '🦖', color: '#f9a8d4' },
	elder: { emoji: '🐉', color: '#fcd34d' }
} as const;

