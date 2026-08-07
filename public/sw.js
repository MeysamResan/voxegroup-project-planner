const CACHE_PREFIX = "voxe-pricing-studio-v";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith(CACHE_PREFIX))
          .map((cacheName) => caches.delete(cacheName)),
      );

      await self.clients.claim();
      const openWindows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      await self.registration.unregister();
      await Promise.all(openWindows.map((client) => client.navigate(client.url)));
    })(),
  );
});
