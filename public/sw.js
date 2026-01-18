// Service Worker for Push Notifications

self.addEventListener('push', function(event) {
  console.log('[SW] Push received:', event);
  
  let data = { 
    title: 'New Notification', 
    body: 'You have a new notification',
    url: '/',
    notificationId: null
  };
  
  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      data.body = event.data.text();
    }
  }
  
  console.log('[SW] Notification data:', data);
  
  const options = {
    body: data.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    tag: data.notificationId || 'default',
    renotify: true,
    data: {
      url: data.url || '/',
      notificationId: data.notificationId,
      dateOfArrival: Date.now(),
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[SW] Notification clicked:', event);
  
  event.notification.close();

  // If dismiss action, just close
  if (event.action === 'dismiss') {
    return;
  }

  // Build the URL to open - always open notification center first
  const notificationId = event.notification.data?.notificationId;
  let urlToOpen = event.notification.data?.url || '/';
  
  // If we have a notification ID, open with notification center showing that notification
  if (notificationId) {
    // Add query param to indicate which notification to highlight
    const separator = urlToOpen.includes('?') ? '&' : '?';
    urlToOpen = `${urlToOpen}${separator}openNotification=${notificationId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // Try to focus an existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(function(focusedClient) {
            if ('navigate' in focusedClient) {
              return focusedClient.navigate(urlToOpen);
            }
          });
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

self.addEventListener('install', function(event) {
  console.log('[SW] Installing service worker');
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  console.log('[SW] Activating service worker');
  event.waitUntil(clients.claim());
});
