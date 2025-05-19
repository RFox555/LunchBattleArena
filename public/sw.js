const CACHE_NAME = 'kout-transport-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/admin-login.html',
  '/driver-login.html',
  '/employee-dashboard.html',
  '/driver-checkin.html',
  '/admin-dashboard.html',
  '/upload-master-list.html',
  '/css/kout-styles.css',
  '/images/kout-logo.jpg',
  '/js/ensure-extension.js',
  '/login-fix.js',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request).then(
          response => {
            // Return the response as-is for non-GET requests or if status is not 200
            if (!response || response.status !== 200 || event.request.method !== 'GET') {
              return response;
            }

            // Clone the response since it can only be consumed once
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
      .catch(() => {
        // If both cache and network fail, show a generic fallback
        if (event.request.url.indexOf('/api/') !== -1) {
          return new Response(JSON.stringify({ 
            message: 'Network connection unavailable. Please try again when online.'
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }
      })
  );
});

// Update service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});