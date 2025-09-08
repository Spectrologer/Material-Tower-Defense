const CACHE_NAME = 'material-tower-defense-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/js/main.js',
  '/js/game-entities.js',
  '/js/game-state.js',
  '/js/merge-logic.js',
  '/js/path-generator.js',
  '/js/ui-manager.js',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clone the response before caching
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});