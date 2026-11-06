const CACHE_NAME = 'liqd-v7';
const ASSETS = [
  '/',
  '/index.html',
  '/sports.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);
  const frameId = reqUrl.searchParams.get('id');
  const isLiqdFrame = frameId && /^liqd\d+$/.test(frameId);

  // ?id=liqdN — только состояние URL/якоря, не отдельный сетевой ресурс
  if (isLiqdFrame && reqUrl.origin === new URL(self.registration.scope).origin) {
    event.respondWith(
      caches.match('/index.html')
        .then((cached) => cached || caches.match('/') || fetch('/index.html'))
        .catch(() => new Response('', { status: 503, statusText: 'Offline' }))
    );
    return;
  }

  const isFontRequest = event.request.url.match(/\.woff2?$/i);

  if (isFontRequest) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          });
        }
        return networkResponse;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || !response.ok || event.request.method !== 'GET') {
            return response;
          }
          const cloned = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          }).catch(() => {});
          return response;
        });
      }).catch(() =>
        fetch(event.request).catch(() =>
          new Response('', { status: 503, statusText: 'Offline' })
        )
      )
    );
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});