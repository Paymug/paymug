self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
      await self.registration.unregister();

      const windowClients = await self.clients.matchAll({ type: "window" });
      await Promise.all(
        windowClients.map((client) => client.navigate(client.url))
      );
    })()
  );
});
