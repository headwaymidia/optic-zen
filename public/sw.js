// Service Worker — CRM Ótica Dominante
// Lida com push notifications e cache básico

const CACHE_NAME = "od-crm-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification recebida
self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "Nova mensagem", body: event.data.text() };
  }

  const title = payload.title ?? "Nova mensagem";
  const options = {
    body: payload.body ?? "",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    tag: payload.tag ?? "od-crm-message",
    data: payload.data ?? {},
    vibrate: [200, 100, 200],
    requireInteraction: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clique na notificação — abre o CRM na conversa certa
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const leadId = event.notification.data?.lead_id;
  const url = leadId
    ? `/whatsapp?leadId=${leadId}`
    : "/whatsapp";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Foca na aba existente se já aberta
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.postMessage({ type: "navigate", url });
          return;
        }
      }
      // Abre nova aba
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
