/**
 * Which front door a request came through — the pure, header-free half.
 *
 * THIS FILE IMPORTS NOTHING. It holds the brand facts and the host test that a
 * client component (Navbar, Footer), the edge middleware, and the server all
 * need. lib/site-brand.ts adds the request-time reads (headers, the proxy
 * brand header) on top, and re-exports everything here — so anything wanting
 * the header-based helpers still imports "@/lib/site-brand" as before, and only
 * the two callers that may NOT pull in next/headers (a "use client" component,
 * and middleware) import this core directly.
 */

export type SiteBrand = "kosher" | "itineraries";

/** The host fragment that marks the itineraries front door. */
export const ITINERARIES_HOST = "whitegloveitineraries";

export const BRAND_ORIGIN: Record<SiteBrand, string> = {
  kosher: "https://www.whiteglovekoshertravel.com",
  itineraries: "https://www.whitegloveitineraries.com",
};

/**
 * Every real hostname a brand is actually reached on — the bare domain and
 * its "www." form, both pointed at the same app. Compile-time constants, not
 * read from any request, so lib/secure-access.ts can compare an untamperable
 * Origin header against them without trusting anything a proxy forwarded.
 */
export const BRAND_HOSTS: Record<SiteBrand, readonly string[]> = {
  kosher: ["www.whiteglovekoshertravel.com", "whiteglovekoshertravel.com"],
  itineraries: ["www.whitegloveitineraries.com", "whitegloveitineraries.com"],
};

export const BRAND_NAME: Record<SiteBrand, string> = {
  kosher: "White Glove Kosher Travel",
  itineraries: "White Glove Itineraries",
};

/** The brand a host belongs to. Anything unrecognised is the kosher default. */
export function brandForHost(host?: string | null): SiteBrand {
  return host && host.toLowerCase().includes(ITINERARIES_HOST) ? "itineraries" : "kosher";
}

export function isItinerariesHost(host?: string | null): boolean {
  return brandForHost(host) === "itineraries";
}

/**
 * The header a front proxy sets to name the brand when it has had to rewrite the
 * Host to route the request. Kept here so the code, the middleware and the proxy
 * rule agree on the spelling.
 */
export const BRAND_HEADER = "x-wg-brand";

/** A brand named outright by the proxy header, or null when it says nothing we know. */
function brandFromHeader(value?: string | null): SiteBrand | null {
  const v = value?.trim().toLowerCase();
  return v === "itineraries" || v === "kosher" ? v : null;
}

type HeaderBag = { get(name: string): string | null };

/**
 * The brand for a request, from its headers: the explicit proxy header first,
 * then the Host. The header is only consulted when it names a brand we know, so
 * an absent or garbled one falls straight through to the Host as before. Header
 * bag only (no next/headers), so the edge middleware can call it too.
 */
export function brandFromRequestHeaders(h: HeaderBag): SiteBrand {
  return brandFromHeader(h.get(BRAND_HEADER)) ?? brandForHost(h.get("host"));
}
