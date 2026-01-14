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

	it('should render habits section', async () => {
		render(Page);

		// Should show "Your Habits" section
		const habitsHeading = page.getByText('Your Habits');
		await expect.element(habitsHeading).toBeInTheDocument();
	});
});
