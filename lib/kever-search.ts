// Search the site's own kever/cemetery listings for the itinerary planner's
// "add a kever from our list" picker. Matches on name, city, Yiddish names, and
// the tzaddikim buried there, with spelling tolerance — so the traveler picks a
// place we already have full, verified details for instead of retyping them.

import { cemeteries } from "@/data/cemeteries";
import { extraSpellings, fuzzyMatch, normalize } from "@/lib/place-search";

export type KeverResult = {
  slug: string;
  name: string;
  yiddishName?: string;
  city: string;
  country: string;
  address: string;
  coordinates?: string;
  href: string;
  phone?: string;
  notes?: string;
};

function firstPhone(c: (typeof cemeteries)[number]): string | undefined {
  return c.accessContacts?.find((x) => x.phone)?.phone;
}

export function searchKevarim(query: string, limit = 12): KeverResult[] {
  const q = query.trim();

  const toResult = (c: (typeof cemeteries)[number]): KeverResult => ({
    slug: c.slug,
    name: c.name,
    yiddishName: c.yiddishName,
    city: c.city,
    country: c.country,
    address: c.address,
    coordinates: c.coordinates,
    href: `/cemeteries/${c.slug}`,
    phone: firstPhone(c),
    notes: c.accessNote || c.arrivalNotes?.[0],
  });

  if (!q) {
    // No query yet: show a helpful default (alphabetical by city).
    return [...cemeteries]
      .sort((a, b) => a.city.localeCompare(b.city))
      .slice(0, limit)
      .map(toResult);
  }

  const scored = cemeteries
    .map((c) => {
      // Everything a person might type: place names, city, country, the
      // tzaddikim buried there, plus known alternate spellings for this place.
      const burials = c.burials.map((b) => `${b.name} ${b.yiddishName} ${b.knownAs ?? ""} ${b.seforim ?? ""}`).join(" ");
      const haystack = [c.name, c.yiddishName, c.city, c.yiddishCity, c.country, burials, extraSpellings([c.slug, c.city])].join(" ");
      if (!fuzzyMatch(q, haystack)) return null;
      // Rank: name/city hits above tzaddik-only hits.
      const nq = normalize(q);
      const strong = normalize(`${c.name} ${c.city} ${c.yiddishCity}`).includes(nq);
      return { c, score: strong ? 0 : 1 };
    })
    .filter((x): x is { c: (typeof cemeteries)[number]; score: number } => x !== null)
    .sort((a, b) => a.score - b.score || a.c.city.localeCompare(b.c.city))
    .slice(0, limit);

  return scored.map((x) => toResult(x.c));
}
