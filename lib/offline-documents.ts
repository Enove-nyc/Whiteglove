/**
 * Emptying the offline document cache.
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
    if ("caches" in window) await caches.delete("wg-offline-docs-v1");
  } catch {
    // Signing out must succeed regardless.
  }
}
