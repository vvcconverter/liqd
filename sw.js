const CACHE_NAME = 'liqd-v25';
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

function isDataRequest(url) {
  return url.pathname.startsWith('/data/')
    || /\.json($|\?)/i.test(url.pathname + (url.search || ''));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const reqUrl = new URL(event.request.url);

  if (event.request.method !== 'GET') {
    return;
  }

  if (reqUrl.origin !== self.location.origin) {
    return;
  }

  if (isImageRequest(event.request, reqUrl)) {
    return;
  }

  if (isLiqdFrameNavigate(event.request, reqUrl)) {
    event.respondWith(
      caches.match('/index.html')
        .then((cached) => cached || caches.match('/') || fetch('/index.html'))
        .catch(() => fetch('/index.html'))
    );
    return;
  }

  const isFontRequest = /\.woff2?($|\?)/i.test(reqUrl.pathname);

  if (isFontRequest) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cloned);
          }).catch(() => {});
        }
        return networkResponse;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  if (isDataRequest(reqUrl)) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }

  const isHtmlNav = event.request.mode === 'navigate'
    || reqUrl.pathname === '/'
    || reqUrl.pathname === '/index.html'
    || /\.html($|\?)/i.test(reqUrl.pathname);

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
      }).catch(() =>
        caches.match(event.request).then((cached) =>
          cached || caches.match('/index.html') || caches.match('/')
        )
      )
    );
    return;
  }

  event.respondWith(
    fetch(event.request).then((response) => {
      if (!response || !response.ok) {
        return response;
      }
      const cloned = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, cloned);
      }).catch(() => {});
      return response;
    }).catch(() =>
      caches.match(event.request).then((cached) =>
        cached || new Response('', { status: 503, statusText: 'Offline' })
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
