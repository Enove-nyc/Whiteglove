/**
 * Reading, once per hour rather than once per page, whether the booking search
 * is open to the public.
 *
 * CACHED FOR THE SAME REASON lib/site-words-store.ts IS. The answer is needed
 * in the footer, which is on every page on this site, and hundreds of those
 * pages are prerendered. An uncached store read there would turn the whole site
 * dynamic in order to decide the target of one link, which is a far worse trade
 * than the link being a few minutes stale.
 *
 * The tag is cleared the moment the owner changes which sections are locked
 * (lib/site-analytics.ts, setLockedPaths), so the ordinary path is immediate and
 * the hour is only the backstop for a change made somewhere this process cannot
 * see.
 *
 * With no store configured nothing is locked, which is the same answer the
 * middleware gives, and the link goes to the search exactly as it always did.
 */

import { unstable_cache } from "next/cache";
import { bookingLink, type BookingLink } from "@/lib/booking-access";
import { getLockedPaths } from "@/lib/site-analytics";

export const BOOKING_ACCESS_TAG = "booking-access";

const cached = unstable_cache(async (): Promise<BookingLink> => bookingLink(await getLockedPaths()), ["booking-access"], {
  tags: [BOOKING_ACCESS_TAG],
  revalidate: 3600,
});

export async function readBookingLink(): Promise<BookingLink> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return bookingLink([]);
  return cached();
}
