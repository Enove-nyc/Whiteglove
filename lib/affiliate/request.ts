/**
 * Reading a booking request off a URL, safely.
 *
 * WHY THE PARTNER URL IS NOT IN THE PAGE. Every commercial link on this site
 * points at /go, and the partner address is built on the server from these
 * parameters against lib/affiliate/partners.ts. Three things follow, and each
 * one is a problem the site has actually had:
 *
 *   • A programme that ends is one setting, not a search of the codebase for
 *     a hostname somebody typed into a component two years ago.
 *   • The click is recorded before the redirect, so it is counted even when a
 *     browser blocks beacons or the visitor leaves immediately.
 *   • There is no open redirect. /go takes a product and a place, never a
 *     destination URL, so nothing a stranger can type into the query string
 *     can make this site forward to their address.
 *
 * Every field is clamped on the way in — this is an outside input even when
 * the site wrote the link itself, because anybody can edit a query string.
 */

import { TRAVEL_PRODUCTS, type AffiliateRequest, type TravelProduct } from "@/lib/affiliate/partners";

/** Free text, capped. Nothing here is ever interpolated into HTML. */
function text(value: string | null, max = 80): string {
  return (value ?? "").trim().slice(0, max);
}

function date(value: string | null): string {
  const v = (value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "";
}

function count(value: string | null, max = 30): number | undefined {
  const n = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : undefined;
}

/** A slug, for reporting only. Letters, digits and hyphens. */
function slug(value: string | null): string {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 60);
}

export function readAffiliateRequest(params: URLSearchParams): AffiliateRequest | null {
  const product = text(params.get("product"), 20) as TravelProduct;
  if (!TRAVEL_PRODUCTS.some((entry) => entry.value === product)) return null;
  return {
    product,
    destination: text(params.get("destination")),
    destinationSlug: slug(params.get("slug")),
    checkIn: date(params.get("in")),
    checkOut: date(params.get("out")),
    adults: count(params.get("adults")),
    children: count(params.get("children")),
    rooms: count(params.get("rooms"), 10),
    from: text(params.get("from"), 40),
    to: text(params.get("to"), 40),
    page: text(params.get("page"), 120),
    placement: slug(params.get("placement")),
    campaignId: slug(params.get("campaign")),
  };
}

/** The /go address for a request. The only way a booking link is written. */
export function goHref(request: AffiliateRequest): string {
  const query = new URLSearchParams({ product: request.product });
  const put = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === 0) return;
    query.set(key, String(value));
  };
  put("destination", request.destination);
  put("slug", request.destinationSlug);
  put("in", request.checkIn);
  put("out", request.checkOut);
  put("adults", request.adults);
  put("children", request.children);
  put("rooms", request.rooms);
  put("from", request.from);
  put("to", request.to);
  put("page", request.page);
  put("placement", request.placement);
  put("campaign", request.campaignId);
  return `/go?${query.toString()}`;
}
