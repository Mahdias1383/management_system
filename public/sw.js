// RailPulse Enterprise Service Worker v1.1.0
const CACHE_NAME = 'railpulse-v1.1.0';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-maskable.svg',
  '/icons/icon-monochrome.svg',
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
  '/icons/icon-1024.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-384.png',
  '/icons/icon-maskable-512.png',
  '/icons/icon-maskable-1024.png',
  '/icons/icon-monochrome-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/splash-dark.svg',
  '/icons/splash-light.svg',
  '/icons/splash-portrait-750x1334.png',
  '/icons/splash-portrait-1170x2532.png',
  '/icons/splash-portrait-light-1170x2532.png',
  '/icons/splash-portrait-1290x2796.png',
  '/icons/splash-landscape-2532x1170.png',
  '/icons/splash-tablet-1668x2388.png',
  '/icons/splash-tablet-landscape-2388x1668.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Stale-While-Revalidate for app assets and static icons
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      })
    );
  }
});
