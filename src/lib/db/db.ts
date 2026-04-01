/**
 * Dexie.js Database Schema for Hungry Hundreds
 *
 * This is the local-first IndexedDB storage layer.
 * All operations save here first, then sync to Supabase (Phase 4).
 *
 * @see docs/API.md for full data model documentation
 */
import Dexie, { type Table } from 'dexie';
import type { GonnState, MemoryEntry, DialogueCacheEntry, ChatSession } from '$lib/types/mascot';
import { DEFAULT_GONN_STATE } from '$lib/types/mascot';

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/** Habit frequency type for the flexible streaks system */
export type FrequencyType = 'daily' | 'weekly';

/** Completion quality for a habit log entry */
export type CompletionType = 'full' | 'partial';

/**
 * Schedule configuration for a habit
 */
export interface HabitSchedule {
	type: 'daily' | 'weekly' | 'every-x-days';
	timesPerWeek?: number; // 1–7, for 'weekly'
	intervalDays?: number; // 2–30, for 'every-x-days'
}

/**
 * Default schedule for habits without one (backward compatibility)
 */
export const DEFAULT_HABIT_SCHEDULE: HabitSchedule = { type: 'daily' };

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
	schedule: HabitSchedule; // Schedule type and frequency
	// Frequency configuration (Phase 1: Flexible Streaks)
	// These are optional for every-x-days habits which use schedule.intervalDays instead
	frequencyType?: FrequencyType; // 'daily' or 'weekly' (undefined for every-x-days habits)
	/**
	 * Target completions per period:
	 * - For 'daily': 1-10 times per day (e.g., "Drink water 8 times per day")
	 * - For 'weekly': 1-7 times per week (e.g., "Gym 3 times per week")
	 * Default: 1
	 */
	frequencyTarget?: number;
	weekStartsOn?: 0 | 1; // 0 = Sunday, 1 = Monday
	/**
	 * User-defined criteria for what constitutes a partial completion
	 * e.g., "20 pushups instead of full gym session" or "10 minutes instead of 30"
	 */
	partialCriteria?: string;
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
	completionType: CompletionType; // 'full' or 'partial' completion
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
	gonnState!: Table<GonnState>;
	mascotMemory!: Table<MemoryEntry>;
	dialogueCache!: Table<DialogueCacheEntry>;
	chatSessions!: Table<ChatSession>;

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

		// Version 2: Add schedule field to habits (defaults applied via upgrade)
		this.version(2)
			.stores({
				habits: '++id, serverId, createdAt',
				logs: '++id, serverId, [habitId+date], habitId, completedAt, synced',
				syncQueue: '++id, timestamp'
			})
			.upgrade((tx) => {
				return tx
					.table('habits')
					.toCollection()
					.modify((habit) => {
						if (!habit.schedule) {
							habit.schedule = { type: 'daily' };
						}
					});
			});

		// Version 3: Add mascot system tables (gonnState, mascotMemory, dialogueCache)
		this.version(3)
			.stores({
				habits: '++id, serverId, createdAt',
				logs: '++id, serverId, [habitId+date], habitId, completedAt, synced',
				syncQueue: '++id, timestamp',
				gonnState: 'id',
				mascotMemory: '++id, type, key, createdAt',
				dialogueCache: 'contextHash, createdAt'
			})
			.upgrade(async (tx) => {
				// Seed the singleton GonnState row
				const table = tx.table('gonnState');
				const existing = await table.get('gonn');
				if (!existing) {
					await table.add({
						...DEFAULT_GONN_STATE,
						lastFedAt: new Date().toISOString()
					});
				}
			});

		// Version 4: Add chatSessions table (Phase 8 — Chatbot)
		this.version(4).stores({
			habits: '++id, serverId, createdAt',
			logs: '++id, serverId, [habitId+date], habitId, completedAt, synced',
			syncQueue: '++id, timestamp',
			gonnState: 'id',
			mascotMemory: '++id, type, key, createdAt',
			dialogueCache: 'contextHash, createdAt',
			chatSessions: '++id, createdAt'
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
	await db.transaction(
		'rw',
		[
			db.habits,
			db.logs,
			db.syncQueue,
			db.gonnState,
			db.mascotMemory,
			db.dialogueCache,
			db.chatSessions
		],
		async () => {
			await db.habits.clear();
			await db.logs.clear();
			await db.syncQueue.clear();
			await db.gonnState.clear();
			await db.mascotMemory.clear();
			await db.dialogueCache.clear();
			await db.chatSessions.clear();
		}
	);
	console.log('[db] All user data cleared');
}
