/**
 * Push Notification Manager
 *
 * Handles registration, permission requests, and token management
 * for Firebase Cloud Messaging push notifications.
 *
 * @see docs/DEPLOYMENT.md for FCM configuration
 */

import { browser } from '$app/environment';
import { writable, derived, get } from 'svelte/store';
import { getToken, onMessage, type MessagePayload } from 'firebase/messaging';
import { getFirebaseMessaging, getVapidKey, isFirebaseConfigured } from './firebase';

// ============================================================================
// Types
// ============================================================================

export type NotificationPermission = 'default' | 'granted' | 'denied';

export interface PushState {
	/** Whether push notifications are supported */
	isSupported: boolean;
	/** Current notification permission status */
	permission: NotificationPermission;
	/** Whether user has enabled notifications */
	isEnabled: boolean;
	/** FCM token for this device */
	token: string | null;
	/** Whether we're currently requesting permission/token */
	isLoading: boolean;
	/** Error message if something went wrong */
	error: string | null;
}

export interface PushNotification {
	title: string;
	body: string;
	icon?: string;
	data?: Record<string, string>;
}

// ============================================================================
// Store
// ============================================================================

const initialState: PushState = {
	isSupported: false,
	permission: 'default',
	isEnabled: false,
	token: null,
	isLoading: false,
	error: null
};

function createPushStore() {
	const { subscribe, set, update } = writable<PushState>(initialState);

	return {
		subscribe,
		set,
		update,

		/**
		 * Initialize push notification support
		 */
		async init(): Promise<void> {
			if (!browser) return;

			// Check browser support
			const isSupported =
				'Notification' in window &&
				'serviceWorker' in navigator &&
				'PushManager' in window &&
				isFirebaseConfigured();

			update((s) => ({
				...s,
				isSupported,
				permission: isSupported ? (Notification.permission as NotificationPermission) : 'denied'
			}));

			if (!isSupported) {
				console.log('[Push] Not supported or Firebase not configured');
				return;
			}

			// Check if already granted
			if (Notification.permission === 'granted') {
				await this.getToken();
			}
		},

		/**
		 * Request notification permission and get FCM token
		 */
		async requestPermission(): Promise<boolean> {
			if (!browser) return false;

			update((s) => ({ ...s, isLoading: true, error: null }));

			try {
				const permission = await Notification.requestPermission();
				update((s) => ({ ...s, permission: permission as NotificationPermission }));

				if (permission === 'granted') {
					await this.getToken();
					return true;
				}

				update((s) => ({
					...s,
					isLoading: false,
					error: permission === 'denied' ? 'Notifications blocked by user' : null
				}));

				return false;
			} catch (error) {
				console.error('[Push] Permission request failed:', error);
				update((s) => ({
					...s,
					isLoading: false,
					error: 'Failed to request notification permission'
				}));
				return false;
			}
		},

		/**
		 * Get FCM token for push notifications
		 */
		async getToken(): Promise<string | null> {
			if (!browser) return null;

			const messaging = getFirebaseMessaging();
			const vapidKey = getVapidKey();

			if (!messaging || !vapidKey) {
				update((s) => ({
					...s,
					isLoading: false,
					error: 'Push notifications not configured'
				}));
				return null;
			}

			try {
				// Wait for service worker to be ready
				const registration = await navigator.serviceWorker.ready;

				const token = await getToken(messaging, {
					vapidKey,
					serviceWorkerRegistration: registration
				});

				update((s) => ({
					...s,
					token,
					isEnabled: true,
					isLoading: false,
					error: null
				}));

				console.log('[Push] Token obtained');
				return token;
			} catch (error) {
				console.error('[Push] Token retrieval failed:', error);
				update((s) => ({
					...s,
					isLoading: false,
					error: 'Failed to get push token'
				}));
				return null;
			}
		},

		/**
		 * Set up foreground message listener
		 */
		setupForegroundListener(
			callback: (notification: PushNotification) => void
		): (() => void) | null {
			if (!browser) return null;

			const messaging = getFirebaseMessaging();
			if (!messaging) return null;

			const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
				console.log('[Push] Foreground message received:', payload);

				const notification: PushNotification = {
					title: payload.notification?.title || 'Hungry Hundreds',
					body: payload.notification?.body || '',
					icon: payload.notification?.icon,
					data: payload.data
				};

				callback(notification);
			});

			return unsubscribe;
		},

		/**
		 * Disable push notifications
		 */
		disable(): void {
			update((s) => ({
				...s,
				isEnabled: false,
				token: null
			}));
			console.log('[Push] Disabled');
		}
	};
}

export const pushStore = createPushStore();

// ============================================================================
// Derived Stores
// ============================================================================

/** Whether push notifications can be enabled */
export const canEnablePush = derived(pushStore, ($push) => {
	return $push.isSupported && $push.permission !== 'denied';
});

/** Whether we should show the permission prompt */
export const shouldShowPushPrompt = derived(pushStore, ($push) => {
	return $push.isSupported && $push.permission === 'default' && !$push.isEnabled;
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Show a local notification (when app is in foreground)
 */
export function showLocalNotification(notification: PushNotification): void {
	if (!browser || Notification.permission !== 'granted') return;

	new Notification(notification.title, {
		body: notification.body,
		icon: notification.icon || '/icon-192.png',
		badge: '/icon-192.png',
		data: notification.data
	});
}
