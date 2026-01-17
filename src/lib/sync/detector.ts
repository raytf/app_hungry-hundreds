/**
 * Online/Offline Detection
 *
 * Provides reactive connectivity status and event handling.
 * Used to trigger sync operations when connection is restored.
 *
 * @see docs/API.md for sync documentation
 */
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// ============================================================================
// Types
// ============================================================================

export interface ConnectionState {
	online: boolean;
	lastOnline: number | null;
	lastOffline: number | null;
}

export type ConnectionEventHandler = (online: boolean) => void;

// ============================================================================
// Connection Store
// ============================================================================

function createConnectionStore() {
	const { subscribe, set, update } = writable<ConnectionState>({
		online: browser ? navigator.onLine : true,
		lastOnline: null,
		lastOffline: null
	});

	const handlers: Set<ConnectionEventHandler> = new Set();

	// Set up event listeners in browser
	if (browser) {
		const handleOnline = () => {
			update((state) => ({
				...state,
				online: true,
				lastOnline: Date.now()
			}));
			handlers.forEach((handler) => handler(true));
		};

		const handleOffline = () => {
			update((state) => ({
				...state,
				online: false,
				lastOffline: Date.now()
			}));
			handlers.forEach((handler) => handler(false));
		};

		window.addEventListener('online', handleOnline);
		window.addEventListener('offline', handleOffline);
	}

	return {
		subscribe,

		/**
		 * Check if currently online
		 */
		isOnline(): boolean {
			return get({ subscribe }).online;
		},

		/**
		 * Register a handler to be called when connection status changes
		 * @returns Unsubscribe function
		 */
		onConnectionChange(handler: ConnectionEventHandler): () => void {
			handlers.add(handler);
			return () => handlers.delete(handler);
		},

		/**
		 * Manually trigger a connection check
		 * Useful for verifying actual connectivity vs navigator.onLine
		 */
		async checkConnection(): Promise<boolean> {
			if (!browser) return true;

			try {
				// Try to fetch a small resource to verify actual connectivity
				// Using a HEAD request to minimize data transfer
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 5000);

				const response = await fetch('/api/health', {
					method: 'HEAD',
					cache: 'no-store',
					signal: controller.signal
				});

				clearTimeout(timeoutId);

				const isOnline = response.ok;
				update((state) => ({
					...state,
					online: isOnline,
					lastOnline: isOnline ? Date.now() : state.lastOnline
				}));

				return isOnline;
			} catch {
				// Network error or timeout - we're offline
				update((state) => ({
					...state,
					online: false,
					lastOffline: Date.now()
				}));
				return false;
			}
		}
	};
}

export const connection = createConnectionStore();

// ============================================================================
// Derived Stores
// ============================================================================

/**
 * Simple boolean store for online status
 */
export const isOnline = derived(connection, ($connection) => $connection.online);

/**
 * Time since last online (in ms), or null if never was online
 */
export const timeSinceOnline = derived(connection, ($connection) => {
	if ($connection.online || !$connection.lastOnline) return null;
	return Date.now() - $connection.lastOnline;
});

// ============================================================================
// Utilities
// ============================================================================

/**
 * Wait for connection to be restored
 * @param timeout Maximum time to wait in ms (default: 30 seconds)
 * @returns Promise that resolves to true if online, false if timeout
 */
export function waitForConnection(timeout: number = 30000): Promise<boolean> {
	return new Promise((resolve) => {
		if (connection.isOnline()) {
			resolve(true);
			return;
		}

		const timeoutId = setTimeout(() => {
			unsubscribe();
			resolve(false);
		}, timeout);

		const unsubscribe = connection.onConnectionChange((online) => {
			if (online) {
				clearTimeout(timeoutId);
				unsubscribe();
				resolve(true);
			}
		});
	});
}

