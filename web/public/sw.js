/* Manas 2026 — minimal offline service worker (Turbopack-friendly, no build step).
   - /api/*        : stale-while-revalidate (schedule/locations usable with no signal)
   - navigations   : network-first, fall back to cached page (or "/")
   - static assets : cache-first
*/
const VERSION = "manas-v1";
const SHELL = `${VERSION}-shell`;
const API = `${VERSION}-api`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(staleWhileRevalidate(request, API));
  } else if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, SHELL));
  } else if (
    url.pathname.startsWith("/_next/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(?:png|svg|webp|woff2?|css|js|json|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, SHELL));
  }
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((resp) => {
      if (resp && resp.ok) cache.put(request, resp.clone());
      return resp;
    })
    .catch(() => cached);
  return cached || network;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const resp = await fetch(request);
  if (resp && resp.ok) cache.put(request, resp.clone());
  return resp;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const resp = await fetch(request);
    if (resp && resp.ok) cache.put(request, resp.clone());
    return resp;
  } catch {
    return (await cache.match(request)) || (await cache.match("/")) || Response.error();
  }
}
