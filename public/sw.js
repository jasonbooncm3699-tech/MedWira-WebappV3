const CACHE_NAME = 'medwira-ai-v18-persistent-banner';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/medwira-logo.png',
  '/medwira-icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Cache each resource individually to handle failures gracefully
        return Promise.all(
          urlsToCache.map((url) => {
            return cache.add(url).catch((error) => {
              console.warn(`Failed to cache ${url}:`, error);
              // Don't fail the entire cache operation for one resource
            });
          })
        );
      })
  );
});

self.addEventListener('fetch', (event) => {
  // CRITICAL FIX: Cache images and static assets, skip API calls
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('/auth/') ||
      event.request.destination === 'document') {
    // Skip caching for API calls and auth - use network only
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // If fetch fails and no cache, let browser handle it
        return fetch(event.request);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
