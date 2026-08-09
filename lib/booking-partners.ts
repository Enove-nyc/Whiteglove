/**
 * Who runs a search on /book.
 *
 * Two ways a search can go. **Out** to a partner — Kayak for flights and cars,
 * Booking.com for hotels — where the traveller compares and pays on a site
 * they already trust, and the link carries an affiliate key. Or **here**,
 * through Duffel, where the fares are searched and booked on this site and
 * what they book lands on their itinerary by itself.
 *
 * WHY THIS IS A FILE AND NOT A TERNARY. It was a ternary, and it read:
 *
 *     DUFFEL_ACCESS_TOKEN set && no Kayak key  ->  Duffel
 *
 * which means **having a token was the decision**. Somebody adding a token to
 * try a search moved every flight on the site onto it, silently, and nobody
 * chose that. Where the bookings go is a business decision and it should take
 * somebody deciding.
 *
 * So: out to the partner unless explicitly told otherwise. Hotels already
 * worked this way (`DUFFEL_STAYS=1`) for a different reason — a Duffel token
 * does not mean Stays is approved on the account, and defaulting to it
 * replaced a hotel search that worked with one that 403s. Flights now match.
 */

export type FlightsVia = "duffel" | "kayak";
export type HotelsVia = "duffel" | "booking";

/**
 * DUFFEL IS OFF THE PUBLIC SITE.
 *
 * It is a real booking engine — it takes a card, issues a ticket and creates
 * an obligation to the traveler that a referral link does not. Running it on
 * the public site made this an online travel agent in every way that matters
 * legally, alongside a business that is otherwise paid for sending people
 * somewhere else. The owner's decision is to keep it, working, in the admin
 * only, until that is a scope somebody has deliberately taken on.
 *
 * So `publicFlightsVia` and `publicHotelsVia` below are the ones the public
 * pages call, and they cannot return "duffel" — not by configuration, not by
 * accident, not by somebody setting DUFFEL_FLIGHTS=1 in a hurry. The env-driven
 * pair is kept for the admin screen, which still has to be able to say whether
 * the account is connected and what it would do.
 */
export function publicFlightsVia(): "kayak" {
  return "kayak";
}

export function publicHotelsVia(): "booking" {
  return "booking";
}

/** Whether the admin's Duffel tools can run at all. */
export function duffelReady(env: { DUFFEL_ACCESS_TOKEN?: string }): boolean {
  return Boolean(env.DUFFEL_ACCESS_TOKEN?.trim());
}

/** Set to exactly "1" to move that search onto Duffel. Anything else is off. */
const on = (value: string | undefined) => value?.trim() === "1";
const set = (value: string | undefined) => Boolean(value?.trim());

/**
 * Where a flight search goes.
 *
 * Kayak unless BOTH the token is there AND somebody has said DUFFEL_FLIGHTS=1.
 * Either alone is not a decision: a token with no flag is somebody who has an
 * account, and a flag with no token is a search that cannot run.
 */
export function flightsVia(env: {
  DUFFEL_ACCESS_TOKEN?: string;
  DUFFEL_FLIGHTS?: string;
}): FlightsVia {
  return on(env.DUFFEL_FLIGHTS) && set(env.DUFFEL_ACCESS_TOKEN) ? "duffel" : "kayak";
}

/**
 * Where a hotel search goes.
 *
 * The same rule, and it has an extra reason to be careful: Duffel Stays is
 * approved separately from the token, and the search 403s until it is. A
 * hotel search that returns an error is worse than one that opens
 * Booking.com.
 */
export function hotelsVia(env: {
  DUFFEL_ACCESS_TOKEN?: string;
  DUFFEL_STAYS?: string;
}): HotelsVia {
  return on(env.DUFFEL_STAYS) && set(env.DUFFEL_ACCESS_TOKEN) ? "duffel" : "booking";
}

/**
 * What to say in the admin about where the bookings are going.
 *
 * The connections screen should be able to answer "where do flights go" out
 * loud, because the last time nobody could, they moved without anybody
 * noticing.
 */
export function describeFlights(via: FlightsVia): string {
  // The variable is named in BOTH, and that is the point. Naming it only on
  // the Duffel side would mean the person who needs it — the one looking at
  // this while flights go to Kayak, wondering how to change that — is the one
  // it is hidden from.
  return via === "duffel"
    ? "Searched and booked on this site, through Duffel, because DUFFEL_FLIGHTS=1 is set. Remove it to hand flights back to Kayak."
    : "Handed to Kayak, where the traveller compares and pays. This is the default; set DUFFEL_FLIGHTS=1 to search and book them here instead.";
}

export function describeHotels(via: HotelsVia): string {
  return via === "duffel"
    ? "Searched and booked on this site, through Duffel Stays, because DUFFEL_STAYS=1 is set. Remove it to hand hotels back to Booking.com."
    : "Handed to Booking.com, where the traveller compares and pays. This is the default; set DUFFEL_STAYS=1 to search and book them here instead — Stays has to be approved on the Duffel account first.";
}
