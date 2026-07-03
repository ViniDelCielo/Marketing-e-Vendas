// ============================================================
// Service Worker — ROI Expert Push Notifications
// Arquivo: public/sw.js
// Este arquivo precisa estar na raiz /public para ser servido
// em https://seudominio.com/sw.js
// ============================================================

const APP_NAME = 'ROI Expert';
const APP_URL  = self.location.origin;

// ----- Instalação do SW -----
self.addEventListener('install', (event) => {
  console.log('[SW] Instalado v1');
  self.skipWaiting(); // Ativa imediatamente sem esperar tab fechar
});

// ----- Ativação do SW -----
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativado');
  event.waitUntil(self.clients.claim()); // Assume controle de todas as abas imediatamente
});

// ----- Recebimento de Push -----
self.addEventListener('push', (event) => {
  let data = {
    title: APP_NAME,
    body: 'Você tem uma nova notificação.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    url: APP_URL,
    tag: 'roi-notif-' + Date.now(),
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/favicon.svg',
    badge: data.badge || '/favicon.svg',
    tag: data.tag,
    data: { url: data.url || APP_URL },
    requireInteraction: false,
    silent: false,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Abrir plataforma' },
      { action: 'dismiss', title: 'Dispensar' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ----- Clique na notificação -----
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = event.notification.data?.url || APP_URL;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Se já existe uma aba aberta com o app, foca nela
      for (const client of clientList) {
        if (client.url.startsWith(APP_URL) && 'focus' in client) {
          client.postMessage({ type: 'PUSH_CLICK', url: targetUrl });
          return client.focus();
        }
      }
      // Caso contrário, abre uma nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ----- Fechar notificação -----
self.addEventListener('notificationclose', () => {
  // Pode registrar analytics aqui se quiser
});
