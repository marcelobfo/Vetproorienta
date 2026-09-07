// VetPro Orienta - Service Worker
const CACHE_NAME = 'vetpro-pwa-v2';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/dashboard/pets',
  '/dashboard/parceiros',
  '/dashboard/chat',
  '/icon.svg',
  '/apple-touch-icon.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
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

  // Ignora requisições de API para não cachear chamadas dinâmicas do Gemini / Asaas / Supabase
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se for requisição válida para assets estáticos ou ícones, atualiza o cache
        if (
          networkResponse.status === 200 &&
          (event.request.url.endsWith('.png') ||
            event.request.url.endsWith('.svg') ||
            event.request.url.endsWith('.css') ||
            event.request.url.endsWith('.js'))
        ) {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Retorna fallback da página inicial se for navegação
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

