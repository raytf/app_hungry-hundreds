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
 * Represents a user's habit stored locally in IndexedDB
 */
export interface Habit {
	id?: number; // Auto-incremented local ID
	serverId?: string; // Supabase UUID (set after sync)
	name: string; // Habit name (e.g., "Morning Run")
	emoji: string; // Emoji icon for the habit
	color: string; // Hex color code (e.g., "#3498db")
	reminderTime?: string; // HH:MM format (24-hour)
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

		this.version(1).stores({
			// Primary key is ++id (auto-increment)
			// Additional indexes for queries
			habits: '++id, serverId, createdAt',
			// Compound index [habitId+date] for checking if habit was completed on a date
			logs: '++id, serverId, [habitId+date], habitId, completedAt, synced',
			syncQueue: '++id, timestamp'
		});
	}
}

// Singleton database instance
export const db = new HungryHundredsDB();

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
	return new Date().toISOString().split('T')[0];
}

/**
 * Get current Unix timestamp in milliseconds
 */
export function now(): number {
	return Date.now();
}

