import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST);

// Bei `strategies: 'injectManifest'` fügt vite-plugin-pwa diese beiden
// Listener NICHT automatisch hinzu (anders als bei `generateSW`) - ohne sie
// bleibt ein neu installierter Service Worker für immer im Zustand "waiting",
// solange irgendwo noch ein Tab mit der alten Version offen ist (z.B. ein
// Tablet, das während des ganzen Turniertags nie neu geladen wird). Das war
// der Grund, warum die App nach einem Deploy mehrere Versionen hinterherhing.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Macht das Turnier!';
  const options = {
    body: data.body || 'Neue Benachrichtigung',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data.url || '/';
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
