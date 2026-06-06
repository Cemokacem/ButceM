// BütçeM Service Worker
const CACHE_NAME = 'butcem-v1';

// Çevrimdışı sayfası için önbellek
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([OFFLINE_URL]);
    })
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

self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini yakala
  if (event.request.method !== 'GET') return;

  // API isteklerini önbelleğe alma
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Başarılı yanıtı döndür
        return response;
      })
      .catch(() => {
        // İnternet yoksa offline sayfasını göster
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('', { status: 503 });
      })
  );
});
