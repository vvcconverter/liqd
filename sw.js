const CACHE_NAME = 'liqd-v9';
const ASSETS = [
  '/',
  '/index.html',
  '/sports.html',
  '/manifest.json'
];

function isImageUrl(url) {
  return /\.(webp|png|jpe?g|gif|svg|avif|ico)(\?|$)/i.test(url.pathname)
    || /\/liqd-casino\//i.test(url.pathname);
}

function isImageRequest(request, url) {
  return request.destination === 'image' || isImageUrl(url);
}

function isLiqdFrameUrl(url) {
  const id = url.searchParams.get('id');
  return id && /^liqd\d+$/.test(id);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  if (isImageRequest(event.request, reqUrl)) {
    return;
  }

  const isLiqdFrame = isLiqdFrameUrl(reqUrl);

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
          if (isImageRequest(event.request, reqUrl) || isLiqdFrameUrl(reqUrl)) {
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
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    );

    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    await Promise.all(
      requests
        .filter((req) => {
          const u = new URL(req.url);
          return isImageUrl(u) || isLiqdFrameUrl(u);
        })
        .map((req) => cache.delete(req))
    );
  })());
  self.clients.claim();
});