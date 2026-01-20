/**
 * Component tests for HabitCard
 *
 * Tests the HabitCard component including toggle functionality,
 * edit button rendering, and accessibility features.
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HabitCard from './HabitCard.svelte';
import type { HabitWithStatus } from '$lib/stores/habits';

// Mock the habits store
vi.mock('$lib/stores/habits', async (importOriginal) => {
	const original = await importOriginal<typeof import('$lib/stores/habits')>();
	return {
		...original,
		habits: {
			toggle: vi.fn(),
			subscribe: vi.fn((cb) => {
				cb([]);
				return () => {};
			})
		}
	};
});

const mockHabit: HabitWithStatus = {
	id: 1,
	name: 'Morning Run',
	emoji: '🏃',
	color: '#22c55e',
	createdAt: Date.now(),
	updatedAt: Date.now(),
	streak: 5,
	completedToday: false
};

const completedHabit: HabitWithStatus = {
	...mockHabit,
	completedToday: true
};

describe('HabitCard Component', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('rendering', () => {
		it('should display habit name', async () => {
			render(HabitCard, { props: { habit: mockHabit } });

			const name = page.getByText('Morning Run');
			await expect.element(name).toBeInTheDocument();
		});

		it('should display habit emoji when not completed', async () => {
			render(HabitCard, { props: { habit: mockHabit } });

			const emoji = page.getByText('🏃');
			await expect.element(emoji).toBeInTheDocument();
		});

		it('should display checkmark when completed', async () => {
			render(HabitCard, { props: { habit: completedHabit } });

			const checkmark = page.getByText('✓');
			await expect.element(checkmark).toBeInTheDocument();
		});

		it('should display streak count', async () => {
			render(HabitCard, { props: { habit: mockHabit } });

			const streak = page.getByText('5');
			await expect.element(streak).toBeInTheDocument();
		});

		it('should display fire emoji for active streak', async () => {
			render(HabitCard, { props: { habit: mockHabit } });

			const fire = page.getByText('🔥');
			await expect.element(fire).toBeInTheDocument();
		});

		it('should display reminder time when present', async () => {
			const habitWithReminder = { ...mockHabit, reminderTime: '07:00' };
			render(HabitCard, { props: { habit: habitWithReminder } });

			const time = page.getByText('07:00');
			await expect.element(time).toBeInTheDocument();
		});
	});

	describe('edit button', () => {
		it('should not show edit button by default', async () => {
			render(HabitCard, { props: { habit: mockHabit } });

			const editLink = page.getByRole('link', { name: /edit/i });
			await expect.element(editLink).not.toBeInTheDocument();
		});

		it('should show edit button when showEdit is true', async () => {
			render(HabitCard, { props: { habit: mockHabit, showEdit: true } });

			const editLink = page.getByRole('link', { name: `Edit ${mockHabit.name}` });
			await expect.element(editLink).toBeInTheDocument();
		});

		it('should have correct href for edit link', async () => {
			render(HabitCard, { props: { habit: mockHabit, showEdit: true } });

			const editLink = page.getByRole('link', { name: `Edit ${mockHabit.name}` });
			await expect.element(editLink).toHaveAttribute('href', '/habits/1/edit');
		});
	});

	describe('accessibility', () => {
		it('should have accessible toggle button', async () => {
			render(HabitCard, { props: { habit: mockHabit } });

			const button = page.getByRole('button', { name: `Mark ${mockHabit.name} as complete` });
			await expect.element(button).toBeInTheDocument();
		});

		it('should update button label when completed', async () => {
			render(HabitCard, { props: { habit: completedHabit } });

			const button = page.getByRole('button', { name: `Mark ${mockHabit.name} as incomplete` });
			await expect.element(button).toBeInTheDocument();
		});

		it('should have accessible edit link', async () => {
			render(HabitCard, { props: { habit: mockHabit, showEdit: true } });

			const editLink = page.getByRole('link', { name: `Edit ${mockHabit.name}` });
			await expect.element(editLink).toBeInTheDocument();
		});
	});
});

