const CACHE_NAME = 'liqd-v5';
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
  const frameMatch = frameId && /^liqd(\d+)$/.exec(frameId);
  if (frameMatch && event.request.destination === 'image') {
    const n = frameMatch[1];
    const framePath = new URL('liqd-casino/liqd' + n + '.webp', self.registration.scope).href;
    event.respondWith(fetch(framePath, { credentials: 'same-origin' }));
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
        return cached || fetch(event.request).then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        });
      })
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