// Service Worker for Forecaster PWA
const CACHE_NAME = 'forecaster-v1.0.1';
const STATIC_CACHE_NAME = 'forecaster-static-v1.0.1';
const DYNAMIC_CACHE_NAME = 'forecaster-dynamic-v1.0.1';

// Files to cache immediately (only assets guaranteed to exist in public/)
const STATIC_FILES = [
  '/manifest.json',
  '/icon.svg',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^\/api\/health$/,
  /^\/api\/weather$/,
];

// Install event - cache static files safely
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(async (cache) => {
        // Cache files individually so a missing asset doesn't reject entire install
        await Promise.all(
          STATIC_FILES.map(async (url) => {
            try {
              const res = await fetch(url);
              if (res.ok) await cache.put(url, res);
            } catch (err) {
              console.warn('Service Worker: Optional static pre-cache skipped for', url, err);
            }
          })
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME &&
                cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files
  if (STATIC_FILES.includes(url.pathname)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Handle other requests with network-first strategy
  event.respondWith(handleDynamicRequest(request));
});

// Handle API requests with cache-first for health, network-first for others
async function handleApiRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Health check can be served from cache
    if (url.pathname === '/api/health') {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        // Refresh cache in background
        fetch(request).then(response => {
          if (response.ok) {
            caches.open(DYNAMIC_CACHE_NAME).then(cache => {
              cache.put(request, response.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }
    }

    // Try network first for API requests
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Try to serve from cache if network fails
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for API failures
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Network unavailable. Operating in offline reconnaissance mode.',
        offline: true
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static file requests with cache-first strategy safely
async function handleStaticRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const fallback = await caches.match(request);
    if (fallback) return fallback;
    return new Response(null, { status: 204, statusText: 'No Content' });
  }
}

// Handle dynamic requests with network-first strategy
async function handleDynamicRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/offline') || await caches.match('/');
      if (offlineResponse) {
        return offlineResponse;
      }
    }
    
    // Fallback gracefully without emitting 503 errors in console
    return new Response('', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  console.log('Service Worker: Performing background sync');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    console.log('Service Worker: Push notification received', data);
    
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      vibrate: [100, 50, 100],
      data: data.data,
      actions: [
        {
          action: 'view',
          title: 'View Forecast',
          icon: '/icons/view-96x96.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-96x96.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
