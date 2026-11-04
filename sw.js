const CACHE_NAME = 'liqd-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/sports.html',
  '/manifest.json',
  '/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3yUBHMdazQ.woff2',
  '/fonts/KFO7CnqEu92Fr1ME7kSn66aGLdTylUAMa3iUBHMdazTgWw.woff2',
  'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d63541879.04889628!2d-56.1534069!3d13.5791767!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x69b0a13348b63a51%3A0x1a1a95c4b285ede9!2sLIQD!5e0!3m2!1sru!2sru!4v1793632721867!5m2!1sru!2sru'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
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
