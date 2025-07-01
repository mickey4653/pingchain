const CACHE_NAME = 'pingchain-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/static/css/main.css',
  '/static/js/main.js'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      }
    )
  );
});

// Push notification event
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'You have a new reminder!',
    icon: '/pingchain-android-192x192.png',
    badge: '/pingchain-android-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Dashboard',
        icon: '/pingchain-android-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/pingchain-android-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('PingChain Reminder', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/dashboard')
    );
  }
}); 