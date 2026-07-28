// White Glove service worker. Provides installability + basic offline
// resilience.
//
// IMPORTANT: this build emits stable (non content-hashed) filenames for the
// app's JavaScript under /_next/static. Serving those cache-first meant a
// browser kept running the first copy of the app it ever cached, so new
// releases never reached people even though the server had them. Code and
// styles are therefore network-first: the newest version always wins when
// online, and the cache is only a fallback when offline. Only truly static
// media (images, fonts) is cache-first.
const CACHE = "wg-cache-v2";
const PRECACHE = ["/", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Deleting every other cache clears any stale app code a browser is holding.
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network-first: use the network when we can, fall back to the cache offline.
function networkFirst(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("/") : undefined)));
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave partner/API/cross-origin alone
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/admin") || url.pathname.startsWith("/access")) return;

  // Pages and app code (scripts, styles): always prefer the network so a new
  // release takes effect immediately.
  if (req.mode === "navigate" || req.destination === "script" || req.destination === "style") {
    event.respondWith(networkFirst(req));
    return;
  }

  // Images and fonts don't change behaviour — cache-first is safe here.
  if (req.destination === "image" || req.destination === "font") {
    event.respondWith(
      caches.match(req).then((cached) =>
        cached ||
        fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached),
      ),
    );
  }
});
