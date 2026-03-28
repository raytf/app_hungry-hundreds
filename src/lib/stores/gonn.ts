/**
 * Gonn State Store
 *
 * Dexie-backed singleton store for the mascot's persistent state.
 * Provides reactive $gonnState via liveQuery and mutation methods
 * (feedGonn, tickDecay) that write back to IndexedDB.
 *
 * @see docs/RULE_ENGINE_SPEC.md §2 — Satiation & Evolution
 * @see src/lib/ai/ruleEngine.ts — pure logic consumed here
 */
import { readable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { liveQuery } from 'dexie';
import { db, type HabitSchedule } from '$lib/db/db';
import { DEFAULT_GONN_STATE, type GonnState, type EvolutionStage } from '$lib/types/mascot';
import {
	feedAmount,
	expectedDailyFeeds,
	totalDecay,
	deriveEvolutionStage
} from '$lib/ai/ruleEngine';

// ============================================================================
// Reactive Store (Dexie LiveQuery)
// ============================================================================

/**
 * Reactive GonnState from IndexedDB.
 * Falls back to DEFAULT_GONN_STATE when not yet initialised.
 */
const rawGonnState = readable<GonnState>(DEFAULT_GONN_STATE, (set) => {
	if (!browser) return () => {};

	const subscription = liveQuery(() => db.gonnState.get('gonn')).subscribe({
		next: (state) => set(state ?? DEFAULT_GONN_STATE),
		error: (err) => console.error('[gonn] LiveQuery error:', err)
	});

	return () => subscription.unsubscribe();
});

/** Read-only reactive GonnState for consumers */
export const gonnState = derived(rawGonnState, ($s) => $s);

// ============================================================================
// Helpers
// ============================================================================

/** Calculate calendar days between two ISO timestamps */
function daysBetween(isoA: string, isoB: string): number {
	const a = new Date(isoA);
	const b = new Date(isoB);
	a.setHours(0, 0, 0, 0);
	b.setHours(0, 0, 0, 0);
	return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000));
}

/**
 * Ensure the singleton row exists in IndexedDB.
 * Called lazily before any mutation.
 */
async function ensureGonnRow(): Promise<GonnState> {
	let row = await db.gonnState.get('gonn');
	if (!row) {
		row = { ...DEFAULT_GONN_STATE, lastFedAt: new Date().toISOString() };
		await db.gonnState.add(row);
	}
	return row;
}

// ============================================================================
// Mutations
// ============================================================================

/** Get today's date as YYYY-MM-DD */
function todayDateStr(): string {
	return new Date().toISOString().split('T')[0];
}

/**
 * Feed Gonn after a habit completion (harmonic model).
 * The nth completion today adds 1/n satiation (diminishing bonuses).
 * Resets the daily counter if the date has changed.
 */
export async function feedGonn(): Promise<void> {
	if (!browser) return;

	const gonn = await ensureGonnRow();
	const today = todayDateStr();

	// Reset daily counter if new day
	const feedsToday = gonn.lastFedDate === today ? gonn.feedsToday : 0;
	const nth = feedsToday + 1;
	const amount = feedAmount(nth);
	const newSatiation = Math.min(100, gonn.satiation + amount);
	const newStage = deriveEvolutionStage(newSatiation, gonn.evolutionStage);
	const newPeak = Math.max(gonn.peakStage, newStage) as EvolutionStage;

	await db.gonnState.update('gonn', {
		satiation: newSatiation,
		evolutionStage: newStage,
		peakStage: newPeak,
		lastFedAt: new Date().toISOString(),
		daysSinceLastFed: 0,
		totalCompletions: gonn.totalCompletions + 1,
		feedsToday: nth,
		lastFedDate: today
	});
}

/**
 * Reverse the last feed after a habit uncompletion.
 * Subtracts the harmonic value that was added by the last nth completion.
 */
export async function unfeedGonn(): Promise<void> {
	if (!browser) return;

	const gonn = await ensureGonnRow();
	const today = todayDateStr();

	// Only reverse if there are feeds today to reverse
	if (gonn.lastFedDate !== today || gonn.feedsToday <= 0) return;

	const lastNth = gonn.feedsToday;
	const amount = feedAmount(lastNth);
	const newSatiation = Math.max(0, gonn.satiation - amount);
	const newStage = deriveEvolutionStage(newSatiation, gonn.evolutionStage);
	const newPeak = Math.max(gonn.peakStage, newStage) as EvolutionStage;

	await db.gonnState.update('gonn', {
		satiation: newSatiation,
		evolutionStage: newStage,
		peakStage: newPeak,
		feedsToday: lastNth - 1
	});
}

/**
 * Apply accumulated decay since last feed.
 * Call on app-open and midnight rollover.
 *
 * @param schedules — current habit schedules (for expectedDailyFeeds)
 * @param totalActiveHabits — number of active habits
 */
export async function tickDecay(
	schedules: HabitSchedule[],
	totalActiveHabits: number
): Promise<void> {
	if (!browser) return;

	const gonn = await ensureGonnRow();
	const now = new Date().toISOString();
	const daysSince = daysBetween(gonn.lastFedAt, now);

	if (daysSince <= 0) return; // fed today, no decay

	const expected = expectedDailyFeeds(schedules);
	const decay = totalDecay(daysSince, expected, totalActiveHabits);
	const newSatiation = Math.max(0, gonn.satiation - decay);
	const newStage = deriveEvolutionStage(newSatiation, gonn.evolutionStage);
	const newPeak = Math.max(gonn.peakStage, newStage) as EvolutionStage;

	await db.gonnState.update('gonn', {
		satiation: newSatiation,
		evolutionStage: newStage,
		peakStage: newPeak,
		daysSinceLastFed: daysSince,
		expectedDailyFeeds: expected
	});
}

/**
 * Reset GonnState to defaults (used in tests / data clear).
 */
export async function resetGonnState(): Promise<void> {
	if (!browser) return;
	await db.gonnState.put({ ...DEFAULT_GONN_STATE, lastFedAt: new Date().toISOString() });
}

/**
 * Debug-only: directly set satiation and/or force an evolution stage.
 * Automatically recalculates stage from satiation if stage is not provided.
 *
 * @param satiation - New satiation value (0–100)
 * @param stage - Force a specific evolution stage (optional)
 */
export async function debugSetGonn(satiation: number, stage?: EvolutionStage): Promise<void> {
	if (!browser) return;

	const gonn = await ensureGonnRow();
	const clampedSatiation = Math.max(0, Math.min(100, satiation));
	const newStage = stage ?? deriveEvolutionStage(clampedSatiation, gonn.evolutionStage);
	const newPeak = Math.max(gonn.peakStage, newStage) as EvolutionStage;

	await db.gonnState.put({
		...gonn,
		satiation: clampedSatiation,
		evolutionStage: newStage,
		peakStage: newPeak
	});
}
