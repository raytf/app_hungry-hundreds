/**
 * Firebase Cloud Messaging (FCM) Configuration
 *
 * This module initializes Firebase for push notification support.
 * FCM is used because it provides cross-platform delivery (iOS, Android, Web).
 *
 * @see docs/DEPLOYMENT.md for Firebase setup instructions
 */

import { browser } from '$app/environment';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getMessaging, type Messaging } from 'firebase/messaging';
import {
	PUBLIC_FIREBASE_API_KEY,
	PUBLIC_FIREBASE_AUTH_DOMAIN,
	PUBLIC_FIREBASE_PROJECT_ID,
	PUBLIC_FIREBASE_STORAGE_BUCKET,
	PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
	PUBLIC_FIREBASE_APP_ID,
	PUBLIC_FIREBASE_VAPID_KEY
} from '$env/static/public';

// ============================================================================
// Types
// ============================================================================

export interface FirebaseConfig {
	apiKey: string;
	authDomain: string;
	projectId: string;
	storageBucket: string;
	messagingSenderId: string;
	appId: string;
}

// ============================================================================
// Configuration
// ============================================================================

/**
 * Firebase configuration from environment variables.
 * These should be set in .env or Cloudflare Pages environment settings.
 */
function getFirebaseConfig(): FirebaseConfig | null {
	// Check for required environment variables
	// Using dynamic import to avoid SSR issues
	if (!browser) return null;

	const config = {
		apiKey: PUBLIC_FIREBASE_API_KEY,
		authDomain: PUBLIC_FIREBASE_AUTH_DOMAIN,
		projectId: PUBLIC_FIREBASE_PROJECT_ID,
		storageBucket: PUBLIC_FIREBASE_STORAGE_BUCKET,
		messagingSenderId: PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
		appId: PUBLIC_FIREBASE_APP_ID
	};

	// Validate required fields
	if (!config.apiKey || !config.projectId) {
		console.warn(
			'[Firebase] Missing configuration. Push notifications disabled.',
			'Set PUBLIC_FIREBASE_* environment variables to enable.'
		);
		return null;
	}

	return config;
}

// ============================================================================
// Singleton Instances
// ============================================================================

let firebaseApp: FirebaseApp | null = null;
let messaging: Messaging | null = null;

/**
 * Initialize Firebase app (singleton)
 */
export function initFirebase(): FirebaseApp | null {
	if (!browser) return null;

	if (firebaseApp) return firebaseApp;

	const config = getFirebaseConfig();
	if (!config) return null;

	try {
		// Check if already initialized
		const existingApps = getApps();
		if (existingApps.length > 0) {
			firebaseApp = existingApps[0];
		} else {
			firebaseApp = initializeApp(config);
		}

		console.log('[Firebase] Initialized successfully');
		return firebaseApp;
	} catch (error) {
		console.error('[Firebase] Initialization failed:', error);
		return null;
	}
}

/**
 * Get Firebase Cloud Messaging instance
 */
export function getFirebaseMessaging(): Messaging | null {
	if (!browser) return null;

	if (messaging) return messaging;

	const app = initFirebase();
	if (!app) return null;

	try {
		// Check if service worker is supported
		if (!('serviceWorker' in navigator)) {
			console.warn('[Firebase] Service workers not supported');
			return null;
		}

		messaging = getMessaging(app);
		console.log('[Firebase] Messaging initialized');
		return messaging;
	} catch (error) {
		console.error('[Firebase] Messaging initialization failed:', error);
		return null;
	}
}

/**
 * Check if Firebase is properly configured
 */
export function isFirebaseConfigured(): boolean {
	return getFirebaseConfig() !== null;
}

/**
 * Get VAPID key for push notifications
 */
export function getVapidKey(): string | null {
	if (!browser) return null;
	return PUBLIC_FIREBASE_VAPID_KEY || null;
}
