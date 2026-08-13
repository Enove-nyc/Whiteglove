/**
 * What may be rendered as a PRICED flight row on /book.
 *
 * The server refuses to build a priced row on anything else (liveRowFromFare
 * in lib/partner-flights.ts). The browser checks the same list again before it
 * paints a fare, because a price is the one thing on this page a traveler acts
 * on: a dollar amount beside a link that is not the offer it was quoted from
 * costs them money rather than a click. Belt and braces, one list.
 *
 * Two addresses qualify and no others — our own redirect to the Travelpayouts
 * offer, which is where the marker is attached server-side, and the fare's own
 * page on Aviasales. A Kayak compare row is priceless by design and must never
 * pass through here.
 *
 * IT IS A FILE OF ITS OWN FOR TWO REASONS. Importing lib/partner-flights.ts
 * into the browser would drag the Travelpayouts search and node:crypto into
 * the page bundle. And components/BookPartners.tsx may not name a partner
 * network in its own code — see tests/affiliate-links.test.ts, which reads
 * that component looking for exactly the hand-written partner details that
 * used to leak into the page source.
 */

const OFFER_PATH = "/api/partners/flights/offer?";
const FARE_HOST = "aviasales.com";
const FARE_NETWORK = "travelpayouts";

/**
 * An https address on the fare host. The one place that host is written down —
 * the /go builder checks the search link it hands out against this too, so the
 * results page a button opens and the offer a price opens are held to the same
 * rule rather than to two copies of it.
 */
export function isAviasalesHref(url: unknown): url is string {
  if (typeof url !== "string" || !url.startsWith("https://")) return false;
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase() === FARE_HOST;
  } catch {
    return false;
  }
}

export function isPricedFlightHref(url: unknown): url is string {
  if (typeof url !== "string" || url.length === 0) return false;
  return url.startsWith(OFFER_PATH) || isAviasalesHref(url);
}

/** A row the page may show a price on: the right network, a number, a real offer. */
export function isPricedFlightRow(row: { network?: unknown; price?: unknown; bookHref?: unknown }): boolean {
  return row.network === FARE_NETWORK && typeof row.price === "number" && isPricedFlightHref(row.bookHref);
}
