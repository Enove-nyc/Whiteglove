/**
 * One device's door for a push notification — what the browser's Push API
 * hands back from `registration.pushManager.subscribe()`. Kept on the trip
 * it belongs to (lib/account-store.ts), not the account: a client has no
 * account at all, only the per-trip link they were sent.
 */
export type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  addedAt: string; // ISO timestamp
};
