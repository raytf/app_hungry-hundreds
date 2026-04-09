import { page } from 'vitest/browser';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SpeechBubble from './SpeechBubble.svelte';
import { hideDialogue, showDialogue } from '$lib/stores/dialogue.svelte';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const originalMatchMedia = window.matchMedia;

function readBubbleText() {
	return document.querySelector('[data-testid="speech-bubble-text"]')?.textContent ?? null;
}

function isContentHidden() {
	return document.querySelector('.speech-content')?.classList.contains('is-hidden') ?? false;
}

async function waitForValue<T>(read: () => T, expected: T, timeoutMs = 1000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (read() === expected) return;
		await sleep(10);
	}
	expect(read()).toBe(expected);
}

async function waitForCondition(check: () => boolean, timeoutMs = 1000) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (check()) return;
		await sleep(10);
	}
	expect(check()).toBe(true);
}

function mockMatchMedia(matches: boolean) {
	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches,
			media: query,
			onchange: null,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			addListener: vi.fn(),
			removeListener: vi.fn(),
			dispatchEvent: vi.fn()
		}))
	});
}

describe('SpeechBubble', () => {
	beforeEach(() => {
		mockMatchMedia(false);
		hideDialogue();
	});

	afterEach(() => {
		hideDialogue();
		Object.defineProperty(window, 'matchMedia', {
			configurable: true,
			writable: true,
			value: originalMatchMedia
		});
		vi.restoreAllMocks();
	});

	it('types visible dialogue text into the bubble', async () => {
		render(SpeechBubble);
		showDialogue('Hello there', { charDelayMs: 1 });

		await expect.element(page.getByTestId('speech-bubble')).toBeInTheDocument();
		await waitForValue(readBubbleText, 'Hello there');
	});

	it('replaces an existing message and settles on the new text', async () => {
		render(SpeechBubble);
		showDialogue('First', { charDelayMs: 1 });
		await waitForValue(readBubbleText, 'First');

		showDialogue('Second', { charDelayMs: 1 });
		await waitForCondition(isContentHidden, 100);
		await waitForValue(readBubbleText, 'Second');
		await sleep(80);
		expect(readBubbleText()).toBe('Second');
	});

	it('dismisses the bubble when clicked', async () => {
		render(SpeechBubble);
		showDialogue('Tap to dismiss', { charDelayMs: 1 });

		const bubble = page.getByTestId('speech-bubble');
		await expect.element(bubble).toBeInTheDocument();
		await bubble.click();
		await waitForValue(() => document.querySelector('[data-testid="speech-bubble"]'), null);
	});

	it('shows the full message immediately when reduced motion is enabled', async () => {
		mockMatchMedia(true);
		render(SpeechBubble);
		await sleep(10);
		showDialogue('Reduced motion text', { charDelayMs: 25 });

		await waitForValue(readBubbleText, 'Reduced motion text', 50);
		expect(readBubbleText()).toBe('Reduced motion text');
	});
});
