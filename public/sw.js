// VetPro Orienta - Service Worker
const CACHE_NAME = 'vetpro-v1';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/pets',
  '/dashboard/parceiros',
  '/manifest.webmanifest'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Cache inicial parcial:', err);
      });
    })
  );
  self.skipWaiting();
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

self.addEventListener('fetch', (event) => {
  // Apenas métodos GET de assets ou navegação
  if (event.request.method !== 'GET') return;

  // Ignora requisições de API para não cachear chamadas dinâmicas do Gemini / Asaas
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return caches.match('/');
      });
    })
  );
});
