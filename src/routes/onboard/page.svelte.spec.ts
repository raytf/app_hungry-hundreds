import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

const { gotoMock, addMock, requestPermissionMock, showToastMock } = vi.hoisted(() => ({
	gotoMock: vi.fn(),
	addMock: vi.fn().mockResolvedValue(1),
	requestPermissionMock: vi.fn().mockResolvedValue(true),
	showToastMock: vi.fn()
}));

vi.mock('$app/navigation', () => ({ goto: gotoMock }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => path }));
vi.mock('$lib/stores/habits', () => ({ habits: { add: addMock } }));
vi.mock('$lib/notifications', () => ({ pushStore: { requestPermission: requestPermissionMock } }));
vi.mock('$lib/stores/toast.svelte', () => ({ showToast: showToastMock }));
vi.mock('$lib/stores/auth', () => ({
	isAuthenticated: {
		subscribe: (run: (value: boolean) => void) => {
			run(false);
			return () => {};
		}
	}
}));

describe('/onboard/+page.svelte', () => {
	beforeEach(() => {
		gotoMock.mockReset();
		addMock.mockClear();
		requestPermissionMock.mockClear();
		showToastMock.mockClear();
		localStorage.clear();
	});

	async function reachHabitScreen() {
		render(Page);
		await page.getByRole('button', { name: 'Feed me a habit →' }).click();
		await page.getByRole('button', { name: 'Skip this' }).click();
	}

	it('fills the input from a suggestion without auto-advancing', async () => {
		await reachHabitScreen();

		await page.getByRole('button', { name: '🏃 Morning Run' }).click();

		const input = page.getByLabelText('Your first habit');
		await expect.element(input).toHaveValue('Morning Run');
		await expect.element(page.getByRole('button', { name: 'Continue →' })).toBeInTheDocument();
	});

	it('commits the first habit only on the reveal screen', async () => {
		await reachHabitScreen();

		await page.getByLabelText('Your first habit').fill('Stretch');
		await page.getByTestId('habit-continue').click();
		await page.getByRole('button', { name: "Skip — I don't want a reminder" }).click();
		await page.getByTestId('frequency-continue').click();

		expect(addMock).not.toHaveBeenCalled();

		await page.getByTestId('reveal-start').click();

		await vi.waitFor(() => expect(addMock).toHaveBeenCalledOnce());
		expect(addMock).toHaveBeenCalledWith({
			name: 'Stretch',
			emoji: '📌',
			color: '#22c55e',
			reminderTime: undefined,
			schedule: { type: 'daily' },
			frequencyType: 'daily',
			frequencyTarget: 1
		});
		expect(localStorage.getItem('hh:onboarded')).toBe('1');
		expect(showToastMock).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Save your progress',
				actionLabel: 'Create account'
			})
		);
		await vi.waitFor(() => expect(gotoMock).toHaveBeenCalledWith('/', { replaceState: true }));
	});

	it('requests notification permission only after the user opts in', async () => {
		await reachHabitScreen();

		await page.getByRole('button', { name: '🏃 Morning Run' }).click();
		await page.getByTestId('habit-continue').click();
		await expect
			.element(page.getByRole('button', { name: '🌅 Morning' }))
			.toHaveAttribute('aria-pressed', 'true');
		await page.getByTestId('when-continue').click();
		await page.getByTestId('frequency-continue').click();
		await page.getByTestId('notifications-yes').click();

		await vi.waitFor(() => expect(requestPermissionMock).toHaveBeenCalledOnce());
		await expect.element(page.getByTestId('reveal-start')).toBeInTheDocument();
	});
});
