/**
 * Unit tests for Sync Queue operations
 *
 * Tests that habit edit/delete operations correctly queue sync operations.
 * Uses fake-indexeddb for Node.js testing of Dexie operations.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db } from '$lib/db/db';
import {
	queueHabitCreate,
	queueHabitUpdate,
	queueHabitDelete,
	queueLogCreate,
	queueLogDelete,
	getPendingOperations,
	getPendingCount,
	removeFromQueue,
	clearQueue
} from './queue';

describe('Sync Queue Operations', () => {
	beforeEach(async () => {
		// Clear sync queue before each test
		await db.syncQueue.clear();
	});

	afterEach(async () => {
		// Clean up after each test
		await db.syncQueue.clear();
	});

	describe('queueHabitCreate', () => {
		it('should add a create operation to the queue', async () => {
			const habitData = { name: 'Test Habit', emoji: '🏃', color: '#3498db' };

			const queueId = await queueHabitCreate(1, habitData);

			expect(queueId).toBeGreaterThan(0);

			const pending = await getPendingOperations();
			expect(pending).toHaveLength(1);
			expect(pending[0].action).toBe('create');
			expect(pending[0].table).toBe('habits');
			expect(pending[0].payload).toMatchObject({
				localId: 1,
				data: habitData
			});
		});
	});

	describe('queueHabitUpdate', () => {
		it('should add an update operation to the queue', async () => {
			const updateData = { name: 'Updated Name', emoji: '✨' };

			const queueId = await queueHabitUpdate(1, 'server-uuid-123', updateData);

			expect(queueId).toBeGreaterThan(0);

			const pending = await getPendingOperations();
			expect(pending).toHaveLength(1);
			expect(pending[0].action).toBe('update');
			expect(pending[0].table).toBe('habits');
			expect(pending[0].payload).toMatchObject({
				localId: 1,
				serverId: 'server-uuid-123',
				data: updateData
			});
		});

		it('should work without serverId for unsynced habits', async () => {
			const updateData = { color: '#ff0000' };

			const queueId = await queueHabitUpdate(2, undefined, updateData);

			expect(queueId).toBeGreaterThan(0);

			const pending = await getPendingOperations();
			expect(pending[0].payload).toMatchObject({
				localId: 2,
				data: updateData
			});
			expect((pending[0].payload as { serverId?: string }).serverId).toBeUndefined();
		});
	});

	describe('queueHabitDelete', () => {
		it('should add a delete operation to the queue', async () => {
			const queueId = await queueHabitDelete(1, 'server-uuid-456');

			expect(queueId).toBeGreaterThan(0);

			const pending = await getPendingOperations();
			expect(pending).toHaveLength(1);
			expect(pending[0].action).toBe('delete');
			expect(pending[0].table).toBe('habits');
			expect(pending[0].payload).toMatchObject({
				localId: 1,
				serverId: 'server-uuid-456'
			});
		});

		it('should work without serverId for unsynced habits', async () => {
			const queueId = await queueHabitDelete(3, undefined);

			expect(queueId).toBeGreaterThan(0);

			const pending = await getPendingOperations();
			expect(pending[0].payload).toMatchObject({
				localId: 3
			});
		});
	});

	describe('getPendingCount', () => {
		it('should return 0 when queue is empty', async () => {
			const count = await getPendingCount();
			expect(count).toBe(0);
		});

		it('should return correct count of pending operations', async () => {
			await queueHabitCreate(1, { name: 'H1' });
			await queueHabitUpdate(2, undefined, { name: 'H2' });
			await queueHabitDelete(3, 'uuid-3');

			const count = await getPendingCount();
			expect(count).toBe(3);
		});
	});

	describe('removeFromQueue', () => {
		it('should remove a specific operation from the queue', async () => {
			const id1 = await queueHabitCreate(1, { name: 'H1' });
			const id2 = await queueHabitCreate(2, { name: 'H2' });

			await removeFromQueue(id1);

			const pending = await getPendingOperations();
			expect(pending).toHaveLength(1);
			expect(pending[0].id).toBe(id2);
		});
	});

	describe('clearQueue', () => {
		it('should remove all operations from the queue', async () => {
			await queueHabitCreate(1, { name: 'H1' });
			await queueHabitUpdate(2, undefined, { name: 'H2' });
			await queueHabitDelete(3, 'uuid-3');

			await clearQueue();

			const count = await getPendingCount();
			expect(count).toBe(0);
		});
	});
});

