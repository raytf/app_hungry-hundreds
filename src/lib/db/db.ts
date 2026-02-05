/**
 * Dexie.js Database Schema for Hungry Hundreds
 *
 * This is the local-first IndexedDB storage layer.
 * All operations save here first, then sync to Supabase (Phase 4).
 *
 * @see docs/API.md for full data model documentation
 */
import Dexie, { type Table } from 'dexie';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * Frequency type for habits
 * - 'daily': Must be completed every day (traditional streak)
 * - 'weekly': Target completions per week (e.g., 3x per week)
 */
export type FrequencyType = 'daily' | 'weekly';

/**
 * Represents a user's habit stored locally in IndexedDB
 */
export interface Habit {
	id?: number; // Auto-incremented local ID
	serverId?: string; // Supabase UUID (set after sync)
	name: string; // Habit name (e.g., "Morning Run")
	emoji: string; // Emoji icon for the habit
	color: string; // Hex color code (e.g., "#3498db")
	reminderTime?: string; // HH:MM format (24-hour)
	// Frequency configuration (Phase 1: Flexible Streaks)
	frequencyType: FrequencyType; // 'daily' or 'weekly'
	/**
	 * Target completions per period:
	 * - For 'daily': 1-10 times per day (e.g., "Drink water 8 times per day")
	 * - For 'weekly': 1-7 times per week (e.g., "Gym 3 times per week")
	 * Default: 1
	 */
	frequencyTarget: number;
	weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
	createdAt: number; // Unix timestamp
	updatedAt: number; // Unix timestamp
}

/**
 * Records each habit completion event
 */
export interface HabitLog {
	id?: number; // Auto-incremented local ID
	serverId?: string; // Supabase UUID (set after sync)
	habitId: number; // Local habit ID
	date: string; // YYYY-MM-DD format
	completedAt: number; // Unix timestamp
	synced: boolean; // Whether synced to Supabase
}

/**
 * Tracks pending operations for offline sync (Phase 4)
 */
export interface SyncQueue {
	id?: number; // Auto-incremented ID
	action: 'create' | 'update' | 'delete';
	table: 'habits' | 'logs';
	payload: unknown; // Data to sync
	timestamp: number; // When operation occurred
	retries: number; // Number of sync attempts
}

// ============================================================================
// Dexie Database Class
// ============================================================================

export class HungryHundredsDB extends Dexie {
	habits!: Table<Habit>;
	logs!: Table<HabitLog>;
	syncQueue!: Table<SyncQueue>;

	constructor() {
		super('HungryHundreds');

		// Version 1: Initial schema
		this.version(1).stores({
			// Primary key is ++id (auto-increment)
			// Additional indexes for queries
			habits: '++id, serverId, createdAt',
			// Compound index [habitId+date] for checking if habit was completed on a date
			logs: '++id, serverId, [habitId+date], habitId, completedAt, synced',
			syncQueue: '++id, timestamp'
		});

		// Version 2: Add frequency fields for flexible streaks
		this.version(2)
			.stores({
				// Schema unchanged - just adding fields to existing table
				habits: '++id, serverId, createdAt',
				logs: '++id, serverId, [habitId+date], habitId, completedAt, synced',
				syncQueue: '++id, timestamp'
			})
			.upgrade((tx) => {
				// Migrate existing habits to use daily frequency by default
				return tx
					.table('habits')
					.toCollection()
					.modify((habit: Partial<Habit>) => {
						habit.frequencyType = 'daily';
						habit.frequencyTarget = 1;
						habit.weekStartsOn = 1; // Default to Monday
					});
			});
	}
}

// Singleton database instance
export const db = new HungryHundredsDB();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format a Date object to YYYY-MM-DD string in local timezone
 * This is the single source of truth for date formatting to avoid timezone bugs.
 */
export function formatDateLocal(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 */
export function getTodayDate(): string {
	return formatDateLocal(new Date());
}

/**
 * Get current Unix timestamp in milliseconds
 */
export function now(): number {
	return Date.now();
}

/**
 * Clear all user data from IndexedDB
 * Called on logout to prevent cross-user data contamination
 */
export async function clearAllUserData(): Promise<void> {
	await db.transaction('rw', [db.habits, db.logs, db.syncQueue], async () => {
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
	});
	console.log('[db] All user data cleared');
}
