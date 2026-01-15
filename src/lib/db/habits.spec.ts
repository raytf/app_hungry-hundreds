/**
 * Unit tests for Habit CRUD operations
 *
 * Uses fake-indexeddb for Node.js testing of Dexie operations.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from './db';
import {
	createHabit,
	getAllHabits,
	getHabitById,
	getHabitCount,
	updateHabit,
	deleteHabit,
	seedHabitsIfEmpty,
	type CreateHabitInput
} from './habits';
import { logHabitCompletion } from './habitLogs';

describe('Habit CRUD Operations', () => {
	beforeEach(async () => {
		// Clear all tables before each test
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
	});

	afterEach(async () => {
		// Clean up after each test
		await db.habits.clear();
		await db.logs.clear();
		await db.syncQueue.clear();
	});

	describe('createHabit', () => {
		it('should create a habit and return its ID', async () => {
			const input: CreateHabitInput = {
				name: 'Morning Run',
				emoji: '🏃',
				color: '#3498db'
			};

			const id = await createHabit(input);

			expect(id).toBeGreaterThan(0);
		});

		it('should store the habit with correct properties', async () => {
			const input: CreateHabitInput = {
				name: 'Meditation',
				emoji: '🧘',
				color: '#9b59b6',
				reminderTime: '07:00'
			};

			const id = await createHabit(input);
			const habit = await getHabitById(id);

			expect(habit).toBeDefined();
			expect(habit!.name).toBe('Meditation');
			expect(habit!.emoji).toBe('🧘');
			expect(habit!.color).toBe('#9b59b6');
			expect(habit!.reminderTime).toBe('07:00');
			expect(habit!.createdAt).toBeGreaterThan(0);
			expect(habit!.updatedAt).toBeGreaterThan(0);
		});

		it('should allow optional reminderTime', async () => {
			const input: CreateHabitInput = {
				name: 'Read',
				emoji: '📚',
				color: '#e74c3c'
			};

			const id = await createHabit(input);
			const habit = await getHabitById(id);

			expect(habit!.reminderTime).toBeUndefined();
		});
	});

	describe('getAllHabits', () => {
		it('should return empty array when no habits exist', async () => {
			const habits = await getAllHabits();

			expect(habits).toEqual([]);
		});

		it('should return habits ordered by createdAt (newest first)', async () => {
			await createHabit({ name: 'First', emoji: '1️⃣', color: '#111' });
			// Small delay to ensure different timestamps
			await new Promise((r) => setTimeout(r, 10));
			await createHabit({ name: 'Second', emoji: '2️⃣', color: '#222' });

			const habits = await getAllHabits();

			expect(habits).toHaveLength(2);
			expect(habits[0].name).toBe('Second');
			expect(habits[1].name).toBe('First');
		});
	});

	describe('getHabitById', () => {
		it('should return undefined for non-existent habit', async () => {
			const habit = await getHabitById(999);

			expect(habit).toBeUndefined();
		});

		it('should return the correct habit', async () => {
			const id = await createHabit({ name: 'Test', emoji: '🧪', color: '#000' });
			const habit = await getHabitById(id);

			expect(habit).toBeDefined();
			expect(habit!.id).toBe(id);
			expect(habit!.name).toBe('Test');
		});
	});

	describe('getHabitCount', () => {
		it('should return 0 when no habits exist', async () => {
			const count = await getHabitCount();

			expect(count).toBe(0);
		});

		it('should return correct count', async () => {
			await createHabit({ name: 'One', emoji: '1️⃣', color: '#111' });
			await createHabit({ name: 'Two', emoji: '2️⃣', color: '#222' });
			await createHabit({ name: 'Three', emoji: '3️⃣', color: '#333' });

			const count = await getHabitCount();

			expect(count).toBe(3);
		});
	});

	describe('updateHabit', () => {
		it('should update habit properties', async () => {
			const id = await createHabit({ name: 'Old Name', emoji: '👴', color: '#999' });
			const originalHabit = await getHabitById(id);

			await updateHabit(id, { name: 'New Name', emoji: '✨' });
			const updatedHabit = await getHabitById(id);

			expect(updatedHabit!.name).toBe('New Name');
			expect(updatedHabit!.emoji).toBe('✨');
			expect(updatedHabit!.color).toBe('#999'); // unchanged
			expect(updatedHabit!.updatedAt).toBeGreaterThanOrEqual(originalHabit!.updatedAt);
		});

		it('should return 0 when updating non-existent habit', async () => {
			const result = await updateHabit(999, { name: 'Ghost' });

			expect(result).toBe(0);
		});
	});

	describe('deleteHabit', () => {
		it('should delete the habit', async () => {
			const id = await createHabit({ name: 'To Delete', emoji: '🗑️', color: '#000' });

			await deleteHabit(id);
			const habit = await getHabitById(id);

			expect(habit).toBeUndefined();
		});

		it('should also delete associated logs', async () => {
			const id = await createHabit({ name: 'With Logs', emoji: '📝', color: '#000' });
			await logHabitCompletion(id, '2024-01-01');
			await logHabitCompletion(id, '2024-01-02');

			const logsBefore = await db.logs.where('habitId').equals(id).count();
			expect(logsBefore).toBe(2);

			await deleteHabit(id);

			const logsAfter = await db.logs.where('habitId').equals(id).count();
			expect(logsAfter).toBe(0);
		});
	});

	describe('seedHabitsIfEmpty', () => {
		it('should seed habits when database is empty', async () => {
			const seedData: CreateHabitInput[] = [
				{ name: 'Seed 1', emoji: '🌱', color: '#0f0' },
				{ name: 'Seed 2', emoji: '🌲', color: '#060' }
			];

			const result = await seedHabitsIfEmpty(seedData);

			expect(result.seeded).toBe(true);
			expect(result.count).toBe(2);
			expect(await getHabitCount()).toBe(2);
		});

		it('should not seed when habits already exist', async () => {
			await createHabit({ name: 'Existing', emoji: '✅', color: '#00f' });
			const seedData: CreateHabitInput[] = [{ name: 'Seed 1', emoji: '🌱', color: '#0f0' }];

			const result = await seedHabitsIfEmpty(seedData);

			expect(result.seeded).toBe(false);
			expect(result.count).toBe(1); // existing count
			expect(await getHabitCount()).toBe(1); // only the existing one
		});
	});
});
