/**
 * Memory System for Gonn AI Dialogue (Phase 7)
 *
 * Reads and writes MemoryEntry records in Dexie (mascotMemory table).
 * Two tiers:
 *  - 'permanent': identity, anchor habit — written at onboarding, kept forever
 *  - 'short-term': completions, lapses — trimmed after 7 days, max 10 in LLM context
 *
 * @see docs/features/ai-implementation-spec.md — Memory System section
 */
import { browser } from '$app/environment';
import { db } from '$lib/db/db';
import type { MemoryEntry } from '$lib/types/mascot';
import type { HabitSnapshot } from '$lib/types/mascot';

// ============================================================================
// Write Memories
// ============================================================================

/**
 * Record a habit completion in short-term memory.
 * Called after feedGonn() when the user completes a habit.
 */
export async function writeCompletionMemory(habit: HabitSnapshot): Promise<void> {
	if (!browser) return;
	const dangerNote = habit.dangerZone
		? `, in danger zone (${habit.dangerZoneLabel ?? 'dropout window'})`
		: '';
	await db.mascotMemory.add({
		type: 'short-term',
		key: 'completion',
		value: `Completed "${habit.habitName}" (streak: ${habit.streakLength}${dangerNote})`,
		createdAt: new Date().toISOString()
	});
}

/**
 * Record a lapse-return event in short-term memory.
 * Called when the user returns after missing a habit window.
 *
 * @param reason - Optional explanation provided by the user
 */
export async function writeLapseReturn(reason?: string): Promise<void> {
	if (!browser) return;
	await db.mascotMemory.add({
		type: 'short-term',
		key: 'lapse-return',
		value: reason ? `Returned after miss. Reason: ${reason}` : 'Returned after miss.',
		createdAt: new Date().toISOString()
	});
}

/**
 * Write or overwrite a permanent memory entry.
 * Used for onboarding-collected identity/anchor info.
 *
 * @param key - e.g. 'identity', 'anchor_habit'
 * @param value - The memory text content
 */
export async function writePermanentMemory(key: string, value: string): Promise<void> {
	if (!browser) return;
	// Remove existing permanent entry for this key before adding new one
	await db.mascotMemory
		.where('type')
		.equals('permanent')
		.and((entry) => entry.key === key)
		.delete();
	await db.mascotMemory.add({
		type: 'permanent',
		key,
		value,
		createdAt: new Date().toISOString()
	});
}

// ============================================================================
// Read Memories
// ============================================================================

/**
 * Retrieve memory context for inclusion in a DialogueRequest.
 * Returns all permanent entries + the 10 most recent short-term entries.
 */
export async function getMemoryContext(): Promise<{
	permanent: MemoryEntry[];
	shortTerm: MemoryEntry[];
}> {
	if (!browser) return { permanent: [], shortTerm: [] };

	const permanent = await db.mascotMemory.where('type').equals('permanent').toArray();
	// sortBy returns a new array sorted ascending; we want most recent first
	const allShortTerm = await db.mascotMemory.where('type').equals('short-term').sortBy('createdAt');
	const shortTerm = allShortTerm.reverse().slice(0, 10);

	return { permanent, shortTerm };
}

// ============================================================================
// Chat Memory (Phase 8)
// ============================================================================

/**
 * Write a permanent memory when the user reveals something meaningful in chat.
 * Overwrites any existing permanent entry with the same key (singletons).
 * Call when user messages contain intent signals such as:
 *   "I keep missing because...", "my goal is...", "I struggle with..."
 *
 * @param key   - Semantic key, e.g. 'chat_goal', 'chat_struggle', 'anchor_habit'
 * @param value - The insight text to persist
 */
export async function writeChatMemory(key: string, value: string): Promise<void> {
	if (!browser) return;
	const existing = await db.mascotMemory
		.where('key')
		.equals(key)
		.and((e) => e.type === 'permanent')
		.first();

	if (existing?.id !== undefined) {
		await db.mascotMemory.update(existing.id, { value, createdAt: new Date().toISOString() });
	} else {
		await db.mascotMemory.add({
			type: 'permanent',
			key,
			value,
			createdAt: new Date().toISOString()
		});
	}
}

// ============================================================================
// Maintenance
// ============================================================================

/**
 * Delete short-term memory entries older than 7 days.
 * Call weekly or on app-open to keep the table lean.
 */
export async function trimShortTermMemory(): Promise<void> {
	if (!browser) return;
	const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
	await db.mascotMemory
		.where('type')
		.equals('short-term')
		.and((entry) => entry.createdAt < cutoff)
		.delete();
}
