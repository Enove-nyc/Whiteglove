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
 */

import { headers } from "next/headers";

export type SiteBrand = "kosher" | "itineraries";

/** The host fragment that marks the itineraries front door. */
const ITINERARIES_HOST = "whitegloveitineraries";

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

/** The brand of the request being served, read from its Host header. */
export async function currentBrand(): Promise<SiteBrand> {
  try {
    return brandForHost((await headers()).get("host"));
  } catch {
    return "kosher";
  }
}
