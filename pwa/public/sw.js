/* MicrOasis 2026 — minimal offline service worker (Turbopack-friendly, no build step).
   - /api/*        : network-first (always fresh online, cached copy offline)
   - navigations   : network-first, fall back to cached page (or "/")
   - static assets : cache-first
*/
const VERSION = "microasis-v2";
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
    event.respondWith(networkFirst(request, API));
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
    // The page revalidates /api/* with If-None-Match, so after a VERSION bump
    // this fresh cache could see nothing but bodyless 304s and stay empty
    // forever — no offline copy. Refill once per generation in the background
    // (a bare-URL fetch drops the page's conditional header).
    else if (resp && resp.status === 304 && !(await cache.match(request))) {
      fetch(request.url, { cache: "no-store" })
        .then((fresh) => {
          if (fresh.ok) cache.put(request, fresh.clone());
        })
        .catch(() => {});
    }
    return resp;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Only navigations fall back to the cached app shell; /api/ must not.
    if (request.mode === "navigate") return (await cache.match("/")) || Response.error();
    return Response.error();
  }
}
