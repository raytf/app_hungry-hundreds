/**
 * Notifications Module
 *
 * Provides Firebase Cloud Messaging integration for push notifications.
 *
 * @example
 * ```typescript
 * import { pushStore, canEnablePush } from '$lib/notifications';
 *
 * // Initialize on app load
 * await pushStore.init();
 *
 * // Request permission when user opts in
 * if ($canEnablePush) {
 *   await pushStore.requestPermission();
 * }
 * ```
 */

// Firebase configuration
export { initFirebase, getFirebaseMessaging, isFirebaseConfigured, getVapidKey } from './firebase';

// Push notification store and utilities
export {
	pushStore,
	canEnablePush,
	shouldShowPushPrompt,
	showLocalNotification,
	type PushState,
	type PushNotification,
	type NotificationPermission
} from './push';

