// Search the site's own attractions and places to stay — for the /stops
// directory search and for the itinerary planner's pickers.
//
// Everything reads through lib/attractions-view.ts, so an entry the owner adds
// in the admin is searchable the moment it is saved, exactly like one that
// ships in data/attractions.ts. Spelling tolerance comes from the same
// fuzzyMatch the kever search uses, so "Yungfrau" and "Wiedicon" still land.

import { getAreaList, getAttractionList, getStayList, type AttractionItem, type KosherAreaItem, type KosherStayItem } from "@/lib/attractions-view";
import { kosherEateries, type KosherEatery } from "@/data/kosher-eateries";
import { extraSpellings, fuzzyMatch, normalize } from "@/lib/place-search";

/** What the planner needs to drop an attraction onto a day. */
export type AttractionResult = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: string;
  summary: string;
  address?: string;
  coordinates?: string;
  website?: string;
  notes?: string;
  href: string;
};

/** What the planner needs to put a place to stay on an itinerary. */
export type StayResult = {
  slug: string;
  name: string;
  city: string;
  country: string;
  kind: string;
  summary: string;
  /** The shul or quarter this is measured from — never a guessed hotel pin. */
  anchorName: string;
  anchorCoords: string;
  kosherClaim: string;
  season?: string;
  website?: string;
  href: string;
};

function attractionHaystack(a: AttractionItem): string {
  return [a.name, a.city, a.country, a.kind, a.summary, (a.notes ?? []).join(" "), extraSpellings([a.slug, a.city])].join(" ");
}

function stayHaystack(s: KosherStayItem): string {
  return [s.name, s.city, s.country, s.kind, s.summary, s.anchor.name, s.season ?? "", extraSpellings([s.slug, s.city])].join(" ");
}

function areaHaystack(a: KosherAreaItem): string {
  return [a.name, a.city, a.country, a.note, extraSpellings([a.slug, a.city])].join(" ");
}

function toAttractionResult(a: AttractionItem): AttractionResult {
  return {
    slug: a.slug,
    name: a.name,
    city: a.city,
    country: a.country,
    kind: a.kind,
    summary: a.summary,
    address: a.address,
    coordinates: a.coordinates,
    website: a.website,
    notes: a.notes?.[0],
    // The directory is one page with an anchor per entry rather than a page
    // each — there is not enough on any single attraction to fill one.
    href: `/attractions#${a.slug}`,
  };
}

function toStayResult(s: KosherStayItem): StayResult {
  return {
    slug: s.slug,
    name: s.name,
    city: s.city,
    country: s.country,
    kind: s.kind,
    summary: s.summary,
    anchorName: s.anchor.name,
    anchorCoords: s.anchor.coordinates,
    kosherClaim: s.kosherClaim,
    season: s.season,
    website: s.website,
    href: `/kosher-stays#${s.slug}`,
  };
}

/**
 * How close a hit is to what was actually typed, lower being closer.
 *
 * The city is checked as a whole word, not as a substring, and it is checked
 * before the name. Substring-scoring the two together ranked the Promenade des
 * Anglais as a strong hit for "Rome" — because "P-rome-nade" contains it — and
 * a search for Rome opened in Nice. The loose matcher still finds those; this
 * only decides what comes first.
 */
function rank(nq: string, city: string, name: string): number {
  if (normalize(city) === nq) return 0;
  if (normalize(name).includes(nq)) return 1;
  return 2;
}

export async function searchAttractions(query: string, limit = 12): Promise<AttractionResult[]> {
  const q = query.trim();
  const list = await getAttractionList();
  if (!q) {
    return [...list].sort((a, b) => a.city.localeCompare(b.city)).slice(0, limit).map(toAttractionResult);
  }
  const nq = normalize(q);
  return list
    .map((a) => (fuzzyMatch(q, attractionHaystack(a)) ? { a, score: rank(nq, a.city, a.name) } : null))
    .filter((x): x is { a: AttractionItem; score: number } => x !== null)
    .sort((x, y) => x.score - y.score || x.a.city.localeCompare(y.a.city))
    .slice(0, limit)
    .map((x) => toAttractionResult(x.a));
}

export async function searchStays(query: string, limit = 12): Promise<StayResult[]> {
  const q = query.trim();
  const list = await getStayList();
  if (!q) {
    return [...list].sort((a, b) => a.city.localeCompare(b.city)).slice(0, limit).map(toStayResult);
  }
  const nq = normalize(q);
  return list
    .map((s) => (fuzzyMatch(q, stayHaystack(s)) ? { s, score: rank(nq, s.city, s.name) } : null))
    .filter((x): x is { s: KosherStayItem; score: number } => x !== null)
    .sort((x, y) => x.score - y.score || x.s.city.localeCompare(y.s.city))
    .slice(0, limit)
    .map((x) => toStayResult(x.s));
}

export async function searchAreas(query: string, limit = 12): Promise<KosherAreaItem[]> {
  const q = query.trim();
  const list = await getAreaList();
  if (!q) return list.slice(0, limit);
  return list.filter((a) => fuzzyMatch(q, areaHaystack(a))).slice(0, limit);
}

/**
 * Somewhere to eat.
 *
 * Reads the data file directly rather than through a view: eateries are not yet
 * owner-editable, so there is no database half to merge. When they become
 * editable this moves behind lib/attractions-view.ts like the rest, and the
 * signature is already async so that change costs nothing at the call sites.
 */
export async function searchEateries(query: string, limit = 12): Promise<KosherEatery[]> {
  const q = query.trim();
  if (!q) return kosherEateries.slice(0, limit);
  const nq = normalize(q);
  return kosherEateries
    .map((e) => {
      const hay = [e.name, e.city, e.country, e.kind, e.diet, e.summary, extraSpellings([e.slug, e.city])].join(" ");
      return fuzzyMatch(q, hay) ? { e, score: rank(nq, e.city, e.name) } : null;
    })
    .filter((x): x is { e: KosherEatery; score: number } => x !== null)
    .sort((a, b) => a.score - b.score || a.e.city.localeCompare(b.e.city))
    .slice(0, limit)
    .map((x) => x.e);
}
