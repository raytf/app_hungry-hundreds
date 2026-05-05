import { page } from 'vitest/browser';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Toast from './Toast.svelte';
import { showToast, toastStore } from '$lib/stores/toast.svelte';

describe('Toast', () => {
	afterEach(() => {
		toastStore.hide();
		vi.restoreAllMocks();
	});

	it('renders a plain text toast', async () => {
		render(Toast);
		showToast('Habit created!');

		await expect.element(page.getByTestId('toast')).toBeInTheDocument();
		await expect.element(page.getByText('Habit created!')).toBeInTheDocument();
		await expect.element(page.getByTestId('toast-action')).not.toBeInTheDocument();
	});

	it('supports an action button for interactive toasts', async () => {
		const onAction = vi.fn();

		render(Toast);
		showToast({
			message: 'Save your progress',
			actionLabel: 'Create account',
			onAction,
			durationMs: 10_000
		});

		const button = page.getByRole('button', { name: 'Create account' });
		await expect.element(button).toBeInTheDocument();
		await button.click();

		expect(onAction).toHaveBeenCalledOnce();
		await expect.element(page.getByTestId('toast')).not.toBeInTheDocument();
	});
});
