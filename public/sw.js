// Service worker de Puggy.
// A propósito NO cachea la app ni los datos: siempre se sirve desde la red,
// para nunca mostrar información vieja (todo vive en Supabase).
// Su función es: (1) permitir instalar Puggy como app; (2) más adelante,
// recibir notificaciones push.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Handler de fetch mínimo (necesario para poder instalar la app). Pasa todo a la red.
self.addEventListener('fetch', () => {
  // Sin respondWith: el navegador maneja el pedido normalmente (a la red).
})
