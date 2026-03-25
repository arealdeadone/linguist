/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { build, files, version } from '$service-worker';

const CACHE_NAME = `linguist-${version}`;
const STATIC_ASSETS = [...build, ...files];

const AUDIO_CACHE = 'linguist-audio-v1';
const AUDIO_CACHE_MAX = 200;

self.addEventListener('install', (event: ExtendableEvent) => {
	event.waitUntil(
		caches
			.open(CACHE_NAME)
			.then((cache) => cache.addAll(STATIC_ASSETS))
			.then(() => (self as unknown as ServiceWorkerGlobalScope).skipWaiting())
	);
});

self.addEventListener('activate', (event: ExtendableEvent) => {
	event.waitUntil(
		caches
			.keys()
			.then((keys) =>
				Promise.all(
					keys
						.filter((key) => key !== CACHE_NAME && key !== AUDIO_CACHE)
						.map((key) => caches.delete(key))
				)
			)
			.then(() => (self as unknown as ServiceWorkerGlobalScope).clients.claim())
	);
});

self.addEventListener('fetch', (event: FetchEvent) => {
	const url = new URL(event.request.url);

	if (event.request.method !== 'GET') return;
	if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

	// Static assets — cache first
	if (STATIC_ASSETS.includes(url.pathname)) {
		event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)));
		return;
	}

	// TTS audio responses — cache with size limit
	if (url.pathname === '/api/speech/tts') return;

	// API calls — network only (AI responses should not be cached)
	if (url.pathname.startsWith('/api/')) return;

	// SvelteKit internal data requests — network only (must not be cached)
	if (url.pathname.includes('__data.json') || url.pathname.includes('__data')) return;

	// Admin routes — network only (auth required)
	if (url.pathname.startsWith('/admin')) return;

	// Pages — network first, fall back to cache
	if (event.request.headers.get('accept')?.includes('text/html')) {
		event.respondWith(
			fetch(event.request)
				.then((response) => {
					const clone = response.clone();
					caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
					return response;
				})
				.catch((e) => {
					console.error('SW fetch failed:', e);
					return caches
						.match(event.request)
						.then((cached) => cached ?? new Response('Offline', { status: 503 }));
				})
		);
		return;
	}

	// Everything else — stale while revalidate
	event.respondWith(
		caches.match(event.request).then((cached) => {
			const fetching = fetch(event.request).then((response) => {
				const clone = response.clone();
				caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
				return response;
			});
			return cached ?? fetching;
		})
	);
});
