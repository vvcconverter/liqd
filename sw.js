const CACHE_NAME = 'liqd-v18';
const ASSETS = [
  '/',
  '/index.html',
  '/sports.html',
  '/manifest.json'
];

function isImageRequest(request, url) {
  if (request.destination === 'image') return true;
  return /\.(webp|png|jpe?g|gif|svg|avif|ico)(\?|$)/i.test(url.pathname)
    || /\/liqd-casino\//i.test(url.pathname);
}

function isLiqdFrameNavigate(request, url) {
  if (request.mode !== 'navigate') return false;
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

  if (isLiqdFrameNavigate(event.request, reqUrl)
      && reqUrl.origin === new URL(self.registration.scope).origin) {
    event.respondWith(
      caches.match('/index.html')
        .then((cached) => cached || caches.match('/') || fetch('/index.html'))
        .catch(() => fetch('/index.html'))
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
      }).catch(() => caches.match(event.request))
    );
    return;
  }

    if (reqUrl.origin !== self.location.origin) {
    return;
  }

  const isHtmlNav = event.request.mode === 'navigate'
    || reqUrl.pathname === '/'
    || reqUrl.pathname === '/index.html'
    || reqUrl.pathname.endsWith('.html');

  if (isHtmlNav) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          }).catch(() => {});
        }
        return networkResponse;
      }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html') || caches.match('/')))
    );
    return;
  }

event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || !response.ok || event.request.method !== 'GET') {
          return response;
        }
        if (isImageRequest(event.request, reqUrl)) {
          return response;
        }
        const id = reqUrl.searchParams.get('id');
        if (id && /^liqd\d+$/.test(id)) {
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
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});