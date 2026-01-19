/**
 * PWA Install Store
 *
 * Manages PWA installability state and install prompt.
 * Captures the beforeinstallprompt event and provides methods to trigger install.
 *
 * @see https://web.dev/learn/pwa/installation-prompt/
 */

import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';

// ============================================================================
// Types
// ============================================================================

export interface PWAState {
	/** Whether the app can be installed */
	canInstall: boolean;
	/** Whether the app is already installed (standalone mode) */
	isInstalled: boolean;
	/** Whether install prompt is showing */
	isPrompting: boolean;
	/** Whether user has dismissed the install banner */
	isDismissed: boolean;
}

interface BeforeInstallPromptEvent extends Event {
	readonly platforms: string[];
	readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
	prompt(): Promise<void>;
}

// ============================================================================
// Store
// ============================================================================

const initialState: PWAState = {
	canInstall: false,
	isInstalled: false,
	isPrompting: false,
	isDismissed: false
};

// Store the deferred prompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;

function createPWAStore() {
	const { subscribe, set, update } = writable<PWAState>(initialState);

	return {
		subscribe,

		/**
		 * Initialize PWA detection
		 * Call this on app mount
		 */
		init(): void {
			if (!browser) return;

			// Check if already installed (standalone mode)
			const isInstalled =
				window.matchMedia('(display-mode: standalone)').matches ||
				// iOS Safari
				(window.navigator as Navigator & { standalone?: boolean }).standalone === true;

			update((s) => ({ ...s, isInstalled }));

			// Check if user previously dismissed
			const dismissed = localStorage.getItem('pwa-install-dismissed');
			if (dismissed) {
				update((s) => ({ ...s, isDismissed: true }));
			}

			// Listen for beforeinstallprompt event
			window.addEventListener('beforeinstallprompt', (e: Event) => {
				// Prevent automatic prompt
				e.preventDefault();

				// Store the event for later use
				deferredPrompt = e as BeforeInstallPromptEvent;

				update((s) => ({ ...s, canInstall: true }));
				console.log('[PWA] Install prompt available');
			});

			// Listen for app installed event
			window.addEventListener('appinstalled', () => {
				deferredPrompt = null;
				update((s) => ({
					...s,
					canInstall: false,
					isInstalled: true,
					isPrompting: false
				}));
				console.log('[PWA] App installed');
			});

			// Listen for display mode changes
			window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
				update((s) => ({ ...s, isInstalled: e.matches }));
			});
		},

		/**
		 * Trigger the install prompt
		 */
		async promptInstall(): Promise<boolean> {
			if (!deferredPrompt) {
				console.warn('[PWA] No install prompt available');
				return false;
			}

			update((s) => ({ ...s, isPrompting: true }));

			try {
				// Show the install prompt
				await deferredPrompt.prompt();

				// Wait for user choice
				const { outcome } = await deferredPrompt.userChoice;

				if (outcome === 'accepted') {
					console.log('[PWA] User accepted install');
					deferredPrompt = null;
					update((s) => ({ ...s, canInstall: false, isPrompting: false }));
					return true;
				} else {
					console.log('[PWA] User dismissed install');
					update((s) => ({ ...s, isPrompting: false }));
					return false;
				}
			} catch (error) {
				console.error('[PWA] Install prompt failed:', error);
				update((s) => ({ ...s, isPrompting: false }));
				return false;
			}
		},

		/**
		 * Dismiss the install banner (user doesn't want to see it)
		 */
		dismiss(): void {
			update((s) => ({ ...s, isDismissed: true }));
			localStorage.setItem('pwa-install-dismissed', 'true');
		},

		/**
		 * Reset dismissed state (for settings)
		 */
		resetDismissed(): void {
			update((s) => ({ ...s, isDismissed: false }));
			localStorage.removeItem('pwa-install-dismissed');
		}
	};
}

export const pwaStore = createPWAStore();

// ============================================================================
// Derived Stores
// ============================================================================

/** Whether to show the install banner */
export const showInstallBanner = derived(pwaStore, ($pwa) => {
	return $pwa.canInstall && !$pwa.isInstalled && !$pwa.isDismissed && !$pwa.isPrompting;
});

