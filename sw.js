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
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});