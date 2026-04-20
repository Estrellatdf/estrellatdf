const CACHE_NAME = '19-agosto-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Estrategia "Network First": intenta la red siempre, si falla, busca en caché.
  // Ideal para aplicaciones dinámicas con Firebase.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Guardar una copia en caché si es una petición GET exitosa (no API/Firestore)
        if (event.request.method === 'GET' && !event.request.url.includes('firestore')) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, resClone);
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
