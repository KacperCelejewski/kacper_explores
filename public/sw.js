const CACHE = "wloczykij-v1";
const OFFLINE_URL = "/offline";

const PRECACHE = [
  "/",
  "/offline",
  "/quiz",
  "/flights",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and API routes
  if (request.method !== "GET" || url.pathname.startsWith("/api/")) return;

  // Cache-first for static assets
  if (url.pathname.match(/\.(js|css|png|jpg|svg|webp|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(request, clone));
        return res;
      }))
    );
    return;
  }

  // Network-first for pages, fallback to offline
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
    )
  );
});
