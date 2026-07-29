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
  /** Who is buried there, shortest recognisable form first. */
  burials?: string[];
};

function firstPhone(c: (typeof cemeteries)[number]): string | undefined {
  return c.accessContacts?.find((x) => x.phone)?.phone;
}

/**
 * How a tzaddik is named on an itinerary line: the title he is known by when
 * there is one, because that is what a traveler recognises, and his name
 * otherwise.
 */
function burialLabel(b: (typeof cemeteries)[number]["burials"][number]): string {
  return (b.knownAs || b.name).trim();
}

export function burialsOf(slug: string): string[] {
  const c = cemeteries.find((x) => x.slug === slug);
  return c ? c.burials.map(burialLabel).filter(Boolean) : [];
}

/**
 * Who is buried at each of these batei hachaim.
 *
 * Read live rather than copied onto the stop when it was added, so an itinerary
 * saved last month shows a kever we have since added to that beis hachaim —
 * the Mochiach of Polonne, for instance, who shares an ohel with the Toldos.
 */
export function burialsForSlugs(slugs: string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const slug of new Set(slugs.filter(Boolean))) {
    const cemetery = cemeteries.find((x) => x.slug === slug);
    // The itinerary and its printed version show tzaddikim in Yiddish only.
    // Every burial record carries that spelling; fall back only for legacy data.
    const names = cemetery?.burials.map((burial) => burial.yiddishName.trim() || burial.name.trim()).filter(Boolean) ?? [];
    if (names.length) out[slug] = names;
  }
  return out;
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
    burials: c.burials.map(burialLabel).filter(Boolean),
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
