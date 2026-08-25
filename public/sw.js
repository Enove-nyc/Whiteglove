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
const PRECACHE = ["/", "/offline", "/icon-192.png", "/icon-512.png"];

/**
 * The day's documents, kept on purpose.
 *
 * SEPARATE FROM EVERYTHING ELSE, AND NEVER FILLED BY ACCIDENT. A boarding pass
 * carries a full name and a booking reference; the route that serves one says
 * `private, no-store` and means it, and nothing here changes that for the
 * ordinary case. This cache is written ONLY when a traveller has explicitly
 * asked for their documents to be available without signal — see the
 * wg-offline-keep message below and components/OfflineDocuments.tsx for the
 * words they agree to.
 *
 * It is its own cache so it can be emptied on its own: turning the offer off,
 * or signing out, deletes exactly this and nothing else.
 */
const OFFLINE_DOCS = "wg-offline-docs-v1";
const ATTACHMENTS = "/api/account/attachments";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    // Deleting every other cache clears any stale app code a browser is holding.
    // Everything EXCEPT the current cache and the documents a traveller asked
    // to keep. Sweeping that one away on a routine release would empty their
    // passes the morning of a flight, which is the one moment this exists for.
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== OFFLINE_DOCS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Network-first: use the network when we can, fall back to the cache offline.
//
// A NAVIGATION MISS GOES TO /offline, NOT THE HOMEPAGE. It used to fall back
// to "/" for any page that wasn't already cached — silently swapping the
// trip somebody was trying to reopen for the marketing homepage, with
// nothing said about why. A traveler standing at a gate with no signal needs
// to know the connection is the problem, not wonder if the app lost their
// trip.
function networkFirst(req) {
  return fetch(req)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() => caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("/offline") : undefined)));
}

/**
 * Put the trip's documents in the offline cache, on request.
 *
 * Fetched with credentials, because the route answers only to the account that
 * uploaded the file — an unauthenticated fetch would cache a 401 and hand it
 * back at the airport as though it were the pass. Only a real 200 is stored.
 */
async function keepDocuments(urls) {
  const cache = await caches.open(OFFLINE_DOCS);
  let kept = 0;
  for (const url of urls || []) {
    try {
      const response = await fetch(url, { credentials: "include", cache: "no-store" });
      if (response && response.ok) {
        await cache.put(url, response.clone());
        kept += 1;
      }
    } catch {
      // One unreachable file must not abandon the rest.
    }
  }
  return { kept, asked: (urls || []).length };
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || typeof data.type !== "string") return;
  const reply = (payload) => {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage(payload);
  };

  if (data.type === "wg-offline-keep") {
    event.waitUntil(
      keepDocuments(data.urls).then(
        (result) => reply({ ok: true, ...result }),
        () => reply({ ok: false }),
      ),
    );
    return;
  }

  // Turning it off, and signing out. Both must actually empty it: a document
  // left in the cache after somebody signs out on a borrowed laptop is the
  // whole risk this feature carries.
  if (data.type === "wg-offline-forget") {
    event.waitUntil(caches.delete(OFFLINE_DOCS).then(() => reply({ ok: true }), () => reply({ ok: false })));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave partner/API/cross-origin alone

  /**
   * The one API path with an offline answer — and only ever as a fallback.
   *
   * The network is always tried first and its response is never written here;
   * this cache is filled only by wg-offline-keep above. So a traveller who
   * never asked for offline documents gets exactly the behaviour they had
   * before: the request goes out, and if there is no signal it fails.
   */
  if (url.pathname === ATTACHMENTS) {
    event.respondWith(
      fetch(req).catch(async () => {
        const cached = await caches.open(OFFLINE_DOCS).then((c) => c.match(req));
        return (
          cached ||
          new Response("This document was not kept for offline use.", {
            status: 504,
            headers: { "content-type": "text/plain" },
          })
        );
      }),
    );
    return;
  }

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

// A flight delay, a cancellation, a gate change — see lib/push-notify.ts for
// what actually sends this and data/trip-alerts.ts for what earns one.
// Never shown for anything the traveler did not ask to be told about: the
// subscription this arrives on only exists because they turned it on inside
// their own trip's app.
self.addEventListener("push", (event) => {
  let payload = { title: "Your trip", body: "Something changed on your trip." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // A payload that doesn't parse as JSON is not a reason to show nothing.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: payload.url || "/" },
    }),
  );
});

// Focus an already-open tab on the trip rather than always opening a new
// one — a traveler who taps a second delay notification should land back
// where they were, not accumulate tabs.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
