const CACHE_NAME = 'material-tower-defense-v1';

async function cacheEssentials() {
    const cache = await caches.open(CACHE_NAME);
    // Cache essential files
    const urls = [
        '/',
        '/index.html',
        '/manifest.json',
    ];

    // Cache each URL individually to handle failures gracefully
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

    // Check if the request is from an allowed domain
    return allowedDomains.some(domain =>
        url.origin === domain || url.href.startsWith(domain)
    );
}

async function cacheResponse(request, response) {
    if (shouldCache(request)) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response);
    }
}

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

async function handleFetch(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            cacheResponse(request, response.clone());
        }
        return response;
    } catch {
        return getCachedResponse(request);
    }
}

self.addEventListener('install', event => {
    event.waitUntil(cacheEssentials());
});

self.addEventListener('fetch', event => {
    event.respondWith(handleFetch(event.request));
});