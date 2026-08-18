/**
 * Published eruv listings for the public site.
 *
 * A flat, source-backed list (data/notable-eruvin.ts) — the parallel to the
 * shuls and mikvaos, but the most time-sensitive of the three. An eruv's
 * status changes weekly, so a listing never asserts the eruv is up: it names
 * the community's eruv and links its own status page, which is republished
 * each Erev Shabbos. No coordinate is stored, so none of these appears as a
 * pin on the map — an eruv is an area on the community's map, not a point on
 * ours.
 */

import { notableEruvin, WORLDWIDE_ERUV_DIRECTORY } from "@/data/notable-eruvin";

export { WORLDWIDE_ERUV_DIRECTORY };

export type EruvListing = {
  id: string;
  name: string;
  city: string;
  country: string;
  covers: string | null;
  statusUrl: string;
};

function byCountryCityName(a: EruvListing, b: EruvListing): number {
  return a.country.localeCompare(b.country) || a.city.localeCompare(b.city) || a.name.localeCompare(b.name);
}

/** Every community eruv the site holds, sorted by country and city. */
export function listEruvin(): EruvListing[] {
  return notableEruvin
    .filter((eruv) => eruv.statusUrl.startsWith("http"))
    .map((eruv) => ({
      id: `eruv-${eruv.slug}`,
      name: eruv.name,
      city: eruv.city,
      country: eruv.country,
      covers: eruv.covers ?? null,
      statusUrl: eruv.statusUrl,
    }))
    .sort(byCountryCityName);
}
