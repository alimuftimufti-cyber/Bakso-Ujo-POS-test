const CACHE_NAME = 'bakso-ujo-pos-v1';
const DYNAMIC_CACHE = 'bakso-ujo-dynamic-v1';

// Assets to pre-cache immediately
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Cache Tailwind CDN to ensure UI works offline
  'https://cdn.tailwindcss.com', 
  // Cache Fonts
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap'
];

// Install Event: Cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching offline assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== DYNAMIC_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Event: Network First for API/Data, Stale-While-Revalidate for Assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Google Fonts & Tailwind (Cache First, falling back to Network)
  if (url.origin === 'https://fonts.googleapis.com' || 
      url.origin === 'https://fonts.gstatic.com' || 
      url.origin === 'https://cdn.tailwindcss.com') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        return cachedResponse || fetch(event.request).then((response) => {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // 2. Images (Cache First for Picsum/Placeholders)
  if (event.request.destination === 'image') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(event.request).then((response) => {
          return caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        }).catch(() => {
            // Return a fallback SVG if offline and image not cached
            return new Response('<svg role="img" aria-labelledby="offline-title" viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg"><title id="offline-title">Offline</title><g fill="none" fill-rule="evenodd"><rect fill="#eee" width="400" height="300"/><text fill="#aaa" font-family="sans-serif" font-size="30" font-weight="bold" x="50%" y="50%" text-anchor="middle" dominant-baseline="middle">Offline</text></g></svg>', { headers: { 'Content-Type': 'image/svg+xml' }});
        });
      })
    );
    return;
  }

  // 3. Default Strategy: Network First, fallback to Cache (For App Logic)
  // Since this is an SPA, we often want the latest index.html but fallback if offline
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response to store in cache
        const responseClone = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            // If it's a navigation request (page load), return index.html
            if (event.request.mode === 'navigate') {
                return caches.match('/index.html');
            }
        });
      })
  );
});