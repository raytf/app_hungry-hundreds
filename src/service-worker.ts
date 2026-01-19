/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

declare const self: ServiceWorkerGlobalScope;

// Cache names
const CACHE_NAME = `hungry-hundreds-${version}`;
const STATIC_CACHE = `static-${version}`;
const RUNTIME_CACHE = 'runtime-cache';

// Assets to cache on install
const PRECACHE_ASSETS = [
	...build, // Built app assets
	...files // Static files from /static
];

// API routes that should use network-first strategy
const API_ROUTES = ['/api/', 'supabase.co', 'googleapis.com', 'firebase'];

// ============================================================================
// Install Event - Cache static assets
// ============================================================================

self.addEventListener('install', (event: ExtendableEvent) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(STATIC_CACHE);

			// Cache all static assets
			await cache.addAll(PRECACHE_ASSETS);

			// Activate immediately
			await self.skipWaiting();
		})()
	);
});

// ============================================================================
// Activate Event - Clean old caches
// ============================================================================

self.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		(async () => {
			// Delete old caches
			const cacheNames = await caches.keys();
			await Promise.all(
				cacheNames
					.filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
					.map((name) => caches.delete(name))
			);

			// Take control immediately
			await self.clients.claim();
		})()
	);
});

// ============================================================================
// Fetch Event - Serve from cache with appropriate strategy
// ============================================================================

self.addEventListener('fetch', (event: FetchEvent) => {
	const url = new URL(event.request.url);

	// Skip non-GET requests
	if (event.request.method !== 'GET') return;

	// Skip cross-origin requests except for API calls
	if (url.origin !== self.location.origin) {
		// Allow API calls but don't cache them
		if (API_ROUTES.some((route) => event.request.url.includes(route))) {
			return; // Let the browser handle it
		}
		return;
	}

	// Network-first for HTML pages (for fresh content)
	if (event.request.mode === 'navigate') {
		event.respondWith(networkFirst(event.request));
		return;
	}

	// Cache-first for static assets
	event.respondWith(cacheFirst(event.request));
});

// ============================================================================
// Caching Strategies
// ============================================================================

async function cacheFirst(request: Request): Promise<Response> {
	const cached = await caches.match(request);
	if (cached) return cached;

	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(RUNTIME_CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		// Return offline fallback if available
		return new Response('Offline', { status: 503 });
	}
}

async function networkFirst(request: Request): Promise<Response> {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(RUNTIME_CACHE);
			cache.put(request, response.clone());
		}
		return response;
	} catch {
		// Fall back to cache
		const cached = await caches.match(request);
		if (cached) return cached;

		// Return offline page
		return new Response('Offline - Please check your connection', {
			status: 503,
			headers: { 'Content-Type': 'text/html' }
		});
	}
}

// ============================================================================
// Push Notification Event
// ============================================================================

self.addEventListener('push', (event: PushEvent) => {
	if (!event.data) return;

	const data = event.data.json();

	const options: NotificationOptions = {
		body: data.body || 'Time to check your habits!',
		icon: '/icon-192.png',
		badge: '/icon-192.png',
		vibrate: [100, 50, 100],
		data: {
			url: data.url || '/',
			timestamp: Date.now()
		},
		actions: [
			{ action: 'open', title: 'Open App' },
			{ action: 'dismiss', title: 'Dismiss' }
		],
		tag: data.tag || 'hungry-hundreds-notification',
		renotify: true
	};

	event.waitUntil(self.registration.showNotification(data.title || 'Hungry Hundreds', options));
});

// ============================================================================
// Notification Click Event
// ============================================================================

self.addEventListener('notificationclick', (event: NotificationEvent) => {
	event.notification.close();

	const url = event.notification.data?.url || '/';

	if (event.action === 'dismiss') {
		return;
	}

	event.waitUntil(
		(async () => {
			// Try to focus existing window
			const windowClients = await self.clients.matchAll({
				type: 'window',
				includeUncontrolled: true
			});

			for (const client of windowClients) {
				if (client.url.includes(self.location.origin) && 'focus' in client) {
					await client.focus();
					if ('navigate' in client) {
						await (client as WindowClient).navigate(url);
					}
					return;
				}
			}

			// Open new window if none exists
			await self.clients.openWindow(url);
		})()
	);
});

// ============================================================================
// Background Sync Event (for offline actions)
// ============================================================================

self.addEventListener('sync', (event: SyncEvent) => {
	if (event.tag === 'sync-habits') {
		event.waitUntil(
			(async () => {
				// Notify all clients to trigger sync
				const clients = await self.clients.matchAll();
				clients.forEach((client) => {
					client.postMessage({ type: 'SYNC_REQUESTED' });
				});
			})()
		);
	}
});

// ============================================================================
// Message Event (for communication with main app)
// ============================================================================

self.addEventListener('message', (event: ExtendableMessageEvent) => {
	if (event.data?.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});
