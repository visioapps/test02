
Copier

// sw.js — Amblyup Patient PWA
const CACHE_NAME = 'amblyup-v1';

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Clic sur notification → ouvre l'appli à la bonne page
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si une fenêtre est déjà ouverte, la focus et naviguer
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Sinon ouvrir nouvelle fenêtre
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// Réception push serveur (V2 — backend → player)
self.addEventListener('push', event => {
  if (!event.data) return;
  let data;
  try { data = event.data.json(); }
  catch(e) { data = { title: 'Amblyup', body: event.data.text() }; }

  const options = {
    body: data.body || '',
    icon: data.icon || 'icon-192.png',
    badge: 'icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'amblyup',
    data: { url: data.url || '/' },
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Amblyup', options)
  );
});
