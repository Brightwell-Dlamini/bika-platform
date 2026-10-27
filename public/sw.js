/* BIKA Platform – Service Worker v6.2.2
 * Network-first for documents; cache shell assets; Web Push for OPS.
 */
const CACHE_NAME = 'bika-v622-pwa-icons';
const PRECACHE_URLS = [
  '/manifest.json',
  '/api/pwa-icon/192?purpose=any',
  '/api/pwa-icon/512?purpose=any',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

function isNavigation(request) {
  return (
    request.mode === 'navigate' ||
    (request.method === 'GET' &&
      request.headers.get('accept') &&
      request.headers.get('accept').includes('text/html'))
  );
}

function isNextAsset(url) {
  return (
    url.pathname.startsWith('/_next/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  );
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API (except pwa icons)
  if (url.pathname.startsWith('/api/') && !url.pathname.startsWith('/api/pwa-icon')) {
    return;
  }

  if (isNavigation(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(event.request).then((c) => c || caches.match('/')))
    );
    return;
  }

  if (isNextAsset(url) || url.pathname.startsWith('/api/pwa-icon') || url.pathname === '/manifest.json') {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const res = await fetch(event.request);
          if (res.ok) cache.put(event.request, res.clone());
          return res;
        } catch {
          const cached = await cache.match(event.request);
          if (cached) return cached;
          throw new Error('offline');
        }
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let payload = { title: 'BIKA', body: 'New update', url: '/' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title || 'BIKA', {
      body: payload.body || '',
      icon: '/api/pwa-icon/192?purpose=any',
      badge: '/api/pwa-icon/192?purpose=any',
      data: { url: payload.url || payload.href || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ('focus' in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
