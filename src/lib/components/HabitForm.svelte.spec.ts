/**
 * Component tests for HabitForm
 *
 * Tests the HabitForm component including create mode, edit mode with
 * initial values, form validation, and submission handling.
 */
import { page } from 'vitest/browser';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HabitForm from './HabitForm.svelte';

describe('HabitForm Component', () => {
	let mockSubmit: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		mockSubmit = vi.fn();
	});

	describe('create mode (default)', () => {
		it('should render empty form fields', async () => {
			render(HabitForm, { props: { onsubmit: mockSubmit } });

			const nameInput = page.getByLabelText('Habit Name');
			await expect.element(nameInput).toHaveValue('');
		});

		it('should display "Create Habit" button text', async () => {
			render(HabitForm, { props: { onsubmit: mockSubmit } });

			const button = page.getByRole('button', { name: 'Create Habit' });
			await expect.element(button).toBeInTheDocument();
		});

		it('should show preview with placeholder text when name is empty', async () => {
			render(HabitForm, { props: { onsubmit: mockSubmit } });

			const preview = page.getByText('New Habit');
			await expect.element(preview).toBeInTheDocument();
		});

		it('should disable submit button when name is empty', async () => {
			render(HabitForm, { props: { onsubmit: mockSubmit } });

			const button = page.getByRole('button', { name: 'Create Habit' });
			await expect.element(button).toBeDisabled();
		});
	});

	describe('edit mode with initialValues', () => {
		const initialValues = {
			name: 'Morning Run',
			emoji: '🏃',
			color: '#3b82f6',
			reminderTime: '07:00'
		};

		it('should pre-populate name field', async () => {
			render(HabitForm, {
				props: { onsubmit: mockSubmit, initialValues, mode: 'edit' }
			});

			const nameInput = page.getByLabelText('Habit Name');
			await expect.element(nameInput).toHaveValue('Morning Run');
		});

		it('should display "Save Changes" button text', async () => {
			render(HabitForm, {
				props: { onsubmit: mockSubmit, initialValues, mode: 'edit' }
			});

			const button = page.getByRole('button', { name: 'Save Changes' });
			await expect.element(button).toBeInTheDocument();
		});

		it('should pre-populate reminder time field', async () => {
			render(HabitForm, {
				props: { onsubmit: mockSubmit, initialValues, mode: 'edit' }
			});

			const timeInput = page.getByLabelText(/Reminder Time/);
			await expect.element(timeInput).toHaveValue('07:00');
		});

		it('should enable submit button with pre-populated name', async () => {
			render(HabitForm, {
				props: { onsubmit: mockSubmit, initialValues, mode: 'edit' }
			});

			const button = page.getByRole('button', { name: 'Save Changes' });
			await expect.element(button).not.toBeDisabled();
		});

		it('should show habit name in preview', async () => {
			render(HabitForm, {
				props: { onsubmit: mockSubmit, initialValues, mode: 'edit' }
			});

			const preview = page.getByText('Morning Run');
			await expect.element(preview).toBeInTheDocument();
		});
	});

	describe('submitting state', () => {
		it('should disable button when isSubmitting is true', async () => {
			render(HabitForm, {
				props: {
					onsubmit: mockSubmit,
					initialValues: { name: 'Test' },
					isSubmitting: true
				}
			});

			const button = page.getByRole('button', { name: /creating/i });
			await expect.element(button).toBeDisabled();
		});

		it('should show "Creating..." text in create mode', async () => {
			render(HabitForm, {
				props: {
					onsubmit: mockSubmit,
					initialValues: { name: 'Test' },
					mode: 'create',
					isSubmitting: true
				}
			});

			const text = page.getByText('Creating...');
			await expect.element(text).toBeInTheDocument();
		});

		it('should show "Saving..." text in edit mode', async () => {
			render(HabitForm, {
				props: {
					onsubmit: mockSubmit,
					initialValues: { name: 'Test' },
					mode: 'edit',
					isSubmitting: true
				}
			});

			const text = page.getByText('Saving...');
			await expect.element(text).toBeInTheDocument();
		});
	});

	describe('accessibility', () => {
		it('should have labeled form fields', async () => {
			render(HabitForm, { props: { onsubmit: mockSubmit } });

			const nameInput = page.getByLabelText('Habit Name');
			await expect.element(nameInput).toBeInTheDocument();
		});

		it('should have icon selection with radiogroup role', async () => {
			render(HabitForm, { props: { onsubmit: mockSubmit } });

			const radiogroup = page.getByRole('radiogroup', { name: 'Select habit icon' });
			await expect.element(radiogroup).toBeInTheDocument();
		});

		it('should have color selection with radiogroup role', async () => {
			render(HabitForm, { props: { onsubmit: mockSubmit } });

			const radiogroup = page.getByRole('radiogroup', { name: 'Select habit color' });
			await expect.element(radiogroup).toBeInTheDocument();
		});
	});
});
