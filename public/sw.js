const CACHE_PREFIX = "voxe-pricing-studio-v";
const CACHE_NAME = `${CACHE_PREFIX}45`;
const APP_SHELL = ["/", "/manifest.webmanifest", "/favicon.svg"];

const openCache = () => caches.open(CACHE_NAME);

const canCache = (request, response) =>
  response.status === 200 &&
  !request.headers.has("range") &&
  !response.headers.get("cache-control")?.toLowerCase().includes("no-store");

const storeResponse = (cache, cacheKey, response, sourceRequest = cacheKey) => {
  if (!canCache(sourceRequest, response)) return Promise.resolve();
  return cache.put(cacheKey, response.clone()).catch(() => undefined);
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    openCache()
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    const networkResponse = fetch(event.request);
    event.waitUntil(
      networkResponse
        .then((response) => openCache().then(
          (cache) => storeResponse(cache, "/", response, event.request),
        ))
        .catch(() => undefined),
    );
    event.respondWith(
      networkResponse
        .catch(() => openCache().then(
          (cache) => cache.match("/").then((cached) => cached || Response.error()),
        )),
    );
    return;
  }

  const cacheableAsset =
    ["font", "image", "script", "style"].includes(event.request.destination) ||
    APP_SHELL.includes(requestUrl.pathname);
  if (!cacheableAsset) return;

  event.respondWith(
    openCache().then((cache) => cache.match(event.request).then(async (cached) => {
      if (cached) return cached;
      const response = await fetch(event.request);
      await storeResponse(cache, event.request, response);
      return response;
    })),
  );
});
