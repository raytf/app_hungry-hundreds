import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte (Home)', () => {
	it('should render greeting heading', async () => {
		render(Page);

		// Should show a greeting (Good morning/afternoon/evening)
		const heading = page.getByRole('heading', { level: 2 });
		await expect.element(heading).toBeInTheDocument();
	});

	it('should render habits section or suggestions when empty', async () => {
		render(Page);

		// When there are no habits, shows suggestions; with habits, shows "Your Habits"
		// Look for either the suggestions heading or the habits heading
		const suggestionsHeading = page.getByText('Start Your Habit Journey');
		await expect.element(suggestionsHeading).toBeInTheDocument();
	});
});
