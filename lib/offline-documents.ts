/**
 * Emptying everything the ending session left on this device.
 *
 * ONE FUNCTION, BECAUSE THIS IS THE FAILURE THAT MATTERS. A traveller can save
 * their boarding passes onto a device so they open at a gate with no signal
 * (components/OfflineDocuments.tsx). Everything about that is fine while it is
 * their phone and they are signed in. A pass left in the cache after somebody
 * signs out — on a borrowed laptop, a hotel business centre, a shared family
 * iPad — is the one way this feature hurts somebody, and it is not a thing to
 * leave anybody to remember.
 *
 * So every sign-out calls this, and tests/offline-documents.test.ts fails if a
 * new one is ever added that does not.
 *
 * IT IS NOT ONLY THE DOCUMENTS. Every successful navigation is cached by the
 * service worker, which is what lets a trip open at a gate with no signal —
 * and also meant a rendered itinerary, carrying its flight numbers, hotel and
 * client's name, stayed on the device after somebody signed out. That was true
 * long before any pass was ever cached on purpose: the page LISTING the passes
 * was already there, put there by nothing more deliberate than visiting it. The
 * worker sweeps those too, by path — see PRIVATE_PREFIXES in public/sw.js.
 *
 * Best effort by design: a browser with no service worker, or one that refuses
 * the cache API, must not turn signing out into an error. There is nothing to
 * clear in that case anyway, because there was nothing to save it with.
 */
export async function forgetOfflineDocuments(): Promise<void> {
  try {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    registration?.active?.postMessage({ type: "wg-offline-forget" });
    // Deleted here as well as asked of the worker. The message is the tidy
    // path; this is the one that still works when the worker is asleep,
    // unregistered, or updating — and an uncleared pass is not something to
    // leave to whether a worker happened to be listening.
    if (!("caches" in window)) return;
    await caches.delete("wg-offline-docs-v1");
    await sweepPrivatePages();
  } catch {
    // Signing out must succeed regardless.
  }
}

/**
 * The prefixes the worker sweeps, kept here as well.
 *
 * Two copies of one list is normally a mistake. Here it is the point: the
 * worker cannot be relied on to be awake at the moment somebody signs out, and
 * this is a page that is definitely running. tests/offline-documents.test.ts
 * compares the two lists and fails if they ever drift, so the duplication
 * cannot rot into a page that one of them clears and the other does not.
 */
const PRIVATE_PREFIXES = [
  "/command-center",
  "/itinerary",
  "/my-route",
  "/account",
  "/app",
  "/library",
  "/forms",
  "/form/",
  "/pipeline",
  "/payments",
  "/pay/",
  "/proposal",
  "/i/",
  "/f/",
  "/p/",
  "/t/",
];

function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) =>
    prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Delete every cached page belonging to the session that has just ended. */
async function sweepPrivatePages(): Promise<void> {
  const cache = await caches.open("wg-cache-v2");
  const requests = await cache.keys();
  await Promise.all(
    requests.filter((request) => isPrivatePath(new URL(request.url).pathname)).map((request) => cache.delete(request)),
  );
}
