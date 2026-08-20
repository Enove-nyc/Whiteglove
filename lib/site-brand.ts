/**
 * Which of the two front doors a request came through.
 *
 * ONE APP, TWO DOMAINS. whiteglovekoshertravel.com is the kosher travel site;
 * whitegloveitineraries.com is the same planner and app worn as a general
 * itinerary tool. They share every account, every trip and the whole server —
 * the only thing that differs is the face each domain shows.
 *
 * THE KOSHER DOMAIN IS THE DEFAULT, and stays the default for anything that
 * cannot see a host (a build step, a background job). So until the second
 * domain is actually pointed here, every request reads as "kosher" and nothing
 * about the live site changes — which is exactly what makes turning this on a
 * DNS change rather than a deploy.
 *
 * WHY A HEADER TOO, NOT ONLY THE HOST. Railway routes a request to this service
 * by matching the Host against a custom domain it holds, and the plan caps how
 * many of those there can be. So the itineraries domain is fronted by a proxy
 * (Cloudflare) that rewrites the Host to the Railway service domain to get the
 * request routed at all — by which point the Host no longer says "itineraries".
 * The proxy therefore sets an explicit brand header, and that header, when
 * present and recognised, wins. It only ever names a brand; the accounts, the
 * trips and the data are identical either way, so nothing here decides access.
 */

import { headers } from "next/headers";

export type SiteBrand = "kosher" | "itineraries";

/** The host fragment that marks the itineraries front door. */
const ITINERARIES_HOST = "whitegloveitineraries";

/**
 * The header a front proxy sets to name the brand when it has had to rewrite
 * the Host to route the request. Kept in one place so the code and the proxy
 * rule agree on the spelling.
 */
export const BRAND_HEADER = "x-wg-brand";

export const BRAND_ORIGIN: Record<SiteBrand, string> = {
  kosher: "https://www.whiteglovekoshertravel.com",
  itineraries: "https://www.whitegloveitineraries.com",
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

/** A brand named outright by the proxy header, or null when it says nothing we know. */
function brandFromHeader(value?: string | null): SiteBrand | null {
  const v = value?.trim().toLowerCase();
  return v === "itineraries" || v === "kosher" ? v : null;
}

type HeaderBag = { get(name: string): string | null };

/**
 * The brand for a request, from its headers: the explicit proxy header first,
 * then the Host. The header is only consulted when it names a brand we know, so
 * an absent or garbled one falls straight through to the Host as before.
 */
export function brandFromRequestHeaders(h: HeaderBag): SiteBrand {
  return brandFromHeader(h.get(BRAND_HEADER)) ?? brandForHost(h.get("host"));
}

/** The brand of the request being served, from its headers. */
export async function currentBrand(): Promise<SiteBrand> {
  try {
    return brandFromRequestHeaders(await headers());
  } catch {
    return "kosher";
  }
}
