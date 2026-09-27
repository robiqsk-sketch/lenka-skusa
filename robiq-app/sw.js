// Robiq service worker — only for push notifications (no offline caching: the app always loads fresh).
// A push carries { title, body, url, tag } from the Supabase function `notify`.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Robiq', {
    body: d.body || '', tag: d.tag, renotify: !!d.tag,
    icon: 'icons/icon-192.png', badge: 'icons/icon-192.png',
    data: { url: d.url || './' },
  }));
});

// Tap on the notification: focus the open app (and go to the chat), or open it.
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) if (c.url.startsWith(self.registration.scope)) {
      c.postMessage({ type: 'open', url });
      return c.focus();
    }
    return self.clients.openWindow(url);
  }));
});
