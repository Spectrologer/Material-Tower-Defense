// This is the service worker file. It helps the game work offline.
/// <reference lib="webworker" />
const CACHE_NAME = 'material-tower-defense-v1';

async function cacheEssentials() {
    const cache = await caches.open(CACHE_NAME);
    // These are the absolute must-have files for the game to start.
    const urls = [
        '/',
        '/index.html',
        '/manifest.json',
    ];

    // Try to cache each file. If one fails, we'll just log it and move on.
    for (const url of urls) {
        try {
            await cache.add(url);
        } catch (error) {
            console.warn(`Failed to cache ${url}:`, error);
        }
    }
}

function shouldCache(request) {
    const url = new URL(request.url);

    // Skip POST requests and other non-GET methods
    if (request.method !== 'GET') return false;

    // Skip chrome-extension and other non-http protocols
    if (!url.protocol.startsWith('http')) return false;

    // Allowed domains for caching
    const allowedDomains = [
        location.origin, // Same-origin (our app)
        'https://cdn.tailwindcss.com',
        'https://fonts.googleapis.com',
        'https://fonts.gstatic.com', // Google font files
        'https://cdnjs.cloudflare.com'
    ];

    // Is the request from one of our approved domains?
    return allowedDomains.some(domain =>
        url.origin === domain || url.href.startsWith(domain)
    );
}

// If a response is cacheable, stick it in the cache.
async function cacheResponse(request, response) {
    if (shouldCache(request)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response);
    }
}

// Tries to get a response from the cache.
async function getCachedResponse(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    return new Response('Offline - resource not cached', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

// This is the main fetch handler. It tries the network first, then the cache.
async function handleFetch(request) {
    try {
        // Try to get the file from the network.
        const response = await fetch(request);
        if (response.ok) {
            cacheResponse(request, response.clone());
        }
        return response;
    } catch {
        return getCachedResponse(request);
    }
}

/**
 * @param {Event} event
 */
self.addEventListener('install', event => {
    /** @type {ExtendableEvent} */ (event).waitUntil(cacheEssentials());
});

/**
 * @param {Event} event
 */
self.addEventListener('fetch', event => {
    /** @type {FetchEvent} */ (event).respondWith(handleFetch(/** @type {FetchEvent} */(event).request));
});