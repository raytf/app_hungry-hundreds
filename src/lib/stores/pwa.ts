/**
 * PWA Install & Update Store
 *
 * Manages PWA installability state, install prompt, and app update detection.
 * Captures the beforeinstallprompt event and provides methods to trigger install.
 * Detects when a new service worker is waiting and prompts the user to update.
 *
 * @see https://web.dev/learn/pwa/installation-prompt/
 * @see https://web.dev/articles/service-worker-lifecycle
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
	/** Whether a new service worker update is available and waiting */
	updateAvailable: boolean;
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
	isDismissed: false,
	updateAvailable: false
};

// Store the deferred prompt event
let deferredPrompt: BeforeInstallPromptEvent | null = null;

// Store the waiting service worker so we can tell it to activate
let waitingSW: ServiceWorker | null = null;

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

			// ----- Service Worker Update Detection -----
			this._detectUpdates();
		},

		/**
		 * Detect service worker updates.
		 * Monitors registration for a new waiting worker and listens
		 * for controllerchange to reload once the new SW takes over.
		 */
		_detectUpdates(): void {
			if (!('serviceWorker' in navigator)) return;

			navigator.serviceWorker.ready.then((registration) => {
				// If a SW is already waiting (e.g. page was reloaded between update and activation)
				if (registration.waiting) {
					waitingSW = registration.waiting;
					update((s) => ({ ...s, updateAvailable: true }));
					console.log('[PWA] Update already waiting');
				}

				// When a new SW is installing, watch for it to enter the waiting state
				registration.addEventListener('updatefound', () => {
					const newSW = registration.installing;
					if (!newSW) return;

					newSW.addEventListener('statechange', () => {
						if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
							// A new SW is installed but waiting — there's an update available
							waitingSW = newSW;
							update((s) => ({ ...s, updateAvailable: true }));
							console.log('[PWA] New update available and waiting');
						}
					});
				});
			});

			// When a new SW takes control, reload to load fresh assets
			let refreshing = false;
			navigator.serviceWorker.addEventListener('controllerchange', () => {
				if (refreshing) return;
				refreshing = true;
				console.log('[PWA] New service worker activated, reloading...');
				window.location.reload();
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
		},

		/**
		 * Apply a waiting service worker update.
		 * Sends SKIP_WAITING to the waiting SW, which triggers controllerchange → reload.
		 */
		applyUpdate(): void {
			if (!waitingSW) {
				console.warn('[PWA] No waiting service worker to activate');
				return;
			}

			console.log('[PWA] Activating waiting service worker...');
			waitingSW.postMessage({ type: 'SKIP_WAITING' });
			// controllerchange listener in _detectUpdates() will reload the page
		},

		/**
		 * Manually check for a service worker update.
		 * Useful for a "Check for updates" action in settings.
		 */
		async checkForUpdate(): Promise<void> {
			if (!browser || !('serviceWorker' in navigator)) return;

			try {
				const registration = await navigator.serviceWorker.getRegistration();
				if (registration) {
					await registration.update();
					console.log('[PWA] Checked for updates');
				}
			} catch (error) {
				console.error('[PWA] Update check failed:', error);
			}
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

/** Whether to show the update prompt */
export const showUpdatePrompt = derived(pwaStore, ($pwa) => {
	return $pwa.updateAvailable;
});
