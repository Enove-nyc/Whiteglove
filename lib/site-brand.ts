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
import { type SiteBrand, brandFromRequestHeaders } from "@/lib/site-brand-core";

// The header-free brand facts and the header-bag resolver live in
// lib/site-brand-core.ts (so a client component and the edge middleware can
// import them without pulling in next/headers). Re-exported here, so
// "@/lib/site-brand" stays the one door for everything server-side.
export type { SiteBrand };
export { brandFromRequestHeaders };
export {
  BRAND_HEADER,
  BRAND_NAME,
  BRAND_ORIGIN,
  ITINERARIES_HOST,
  brandForHost,
  isItinerariesHost,
} from "@/lib/site-brand-core";

/** The brand of the request being served, from its headers. */
export async function currentBrand(): Promise<SiteBrand> {
  try {
    return brandFromRequestHeaders(await headers());
  } catch {
    return "kosher";
  }
}
