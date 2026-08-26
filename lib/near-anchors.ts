/**
 * The places a visitor can measure FROM.
 *
 * "Near me" used to mean one thing on this site: the name of a hotel, looked
 * up on a metered Google key. That answers the question somebody asks the week
 * they travel and no other — a traveler deciding between two areas, or working
 * out what is around the airport they land at, or what is within walking
 * distance of the shul they are davening at, had nowhere to start.
 *
 * WHAT THE SITE ALREADY KNOWS WHERE. 99 airports carry a position, all 32
 * Jewish quarters do, and 734 of the 767 things to do. That is a searchable
 * list of anchors the site owns outright: it costs nothing, needs no key, and
 * answers "near JFK", "near the Ghetto", "near the Colosseum" instantly and
 * offline. Anything not on it — a city with no quarter listed, a street
 * address, a postcode — falls through to lib/place-lookup.ts, which is
 * OpenStreetMap and also free.
 *
 * AN ANCHOR IS NOT A LISTING. Nothing here is White Glove saying a place is
 * worth going to, and nothing here is stored. An anchor is a point on the map
 * to hold a ruler against, which is why a landmark the site describes and a
 * postcode a visitor typed can sit in the same list without the second one
 * pretending to be checked.
 *
 * SORTED BY WHAT WAS TYPED, NOT BY CATEGORY. "JFK" must return the airport
 * first and not a landmark whose description mentions it; "Rome" should lead
 * with the quarter rather than the 40th attraction in the city. rank() is that
 * ordering and the test file pins the cases that matter.
 */

import { AIRPORTS } from "@/data/airports";
import { attractions } from "@/data/attractions";
import { kosherAreas } from "@/data/kosher-stays";
import { parsePoint } from "@/data/near-me";
import { normalize } from "@/lib/place-search";

export type AnchorKind = "airport" | "quarter" | "landmark" | "place";

export type NearAnchor = {
  /** Stable within its kind, so a list can be keyed on it. */
  id: string;
  /** What the visitor reads and recognises. */
  label: string;
  /** The second line — city and country, or what kind of thing it is. */
  hint: string;
  /** "lat, lng", the format every other coordinate on this site uses. */
  at: string;
  kind: AnchorKind;
};

/** Words that should match but need not be shown — an airport's code, a slug. */
type Indexed = NearAnchor & { haystack: string };

let cache: Indexed[] | null = null;

function index(anchor: NearAnchor, extra = ""): Indexed {
  return { ...anchor, haystack: normalize(`${anchor.label} ${anchor.hint} ${extra}`) };
}

/**
 * Every anchor the site owns, built once.
 *
 * Built lazily rather than at module load: the three data files are large, and
 * a request that never searches should not pay to fold 865 strings.
 */
function anchors(): Indexed[] {
  if (cache) return cache;

  const built: Indexed[] = [];

  for (const airport of AIRPORTS) {
    built.push(
      index(
        {
          id: `airport:${airport.code}`,
          label: `${airport.city} — ${airport.code}`,
          hint: `${airport.name}, ${airport.country}`,
          at: `${airport.lat}, ${airport.lng}`,
          kind: "airport",
        },
        `${airport.code} airport ${airport.aliases.join(" ")}`,
      ),
    );
  }

  for (const area of kosherAreas) {
    if (!parsePoint(area.coordinates)) continue;
    built.push(
      index(
        {
          id: `quarter:${area.slug}`,
          label: area.name,
          hint: `${area.city}, ${area.country}`,
          at: area.coordinates,
          kind: "quarter",
        },
        `${area.slug} jewish quarter`,
      ),
    );
  }

  for (const attraction of attractions) {
    if (!attraction.coordinates || !parsePoint(attraction.coordinates)) continue;
    built.push(
      index(
        {
          id: `landmark:${attraction.slug}`,
          label: attraction.name,
          hint: `${attraction.city}, ${attraction.country}`,
          at: attraction.coordinates,
          kind: "landmark",
        },
        attraction.slug,
      ),
    );
  }

  cache = built;
  return built;
}

/** How many of each kind the site knows a position for. For the tests. */
export function anchorCounts(): Record<AnchorKind, number> {
  const counts: Record<AnchorKind, number> = { airport: 0, quarter: 0, landmark: 0, place: 0 };
  for (const anchor of anchors()) counts[anchor.kind] += 1;
  return counts;
}

/**
 * Lower sorts first.
 *
 * The label matters more than the hint, and where in the label the match falls
 * matters more than anything else: somebody typing "rome" wants Rome, not the
 * Great Synagogue of Rome's neighbour whose city happens to be Rome. Within a
 * tie, an airport and a quarter beat a landmark, because a person naming a
 * whole place means the place.
 */
const KIND_ORDER: Record<AnchorKind, number> = { airport: 0, quarter: 1, landmark: 2, place: 3 };

/** True when the match at `at` is the whole word rather than the start of a longer one. */
function wholeWord(haystack: string, at: number, length: number): boolean {
  const before = at === 0 || haystack[at - 1] === " ";
  const after = at + length >= haystack.length || haystack[at + length] === " ";
  return before && after;
}

function rank(anchor: Indexed, q: string): number | null {
  const label = normalize(anchor.label);
  const hint = normalize(anchor.hint);
  const inHaystack = anchor.haystack.indexOf(q);
  if (inHaystack < 0) return null;

  const inLabel = label.indexOf(q);
  const inHint = hint.indexOf(q);

  // A whole word beats a longer word that merely begins the same way: somebody
  // typing "rome" means Rome, and Römerberg in Frankfurt is not a near miss,
  // it is a different city. That is the case this ordering exists for.
  let base: number;
  if (label === q) base = 0;
  else if (inLabel >= 0 && wholeWord(label, inLabel, q.length)) base = inLabel === 0 ? 5 : 8;
  else if (inHint >= 0 && wholeWord(hint, inHint, q.length)) base = 12;
  else if (inLabel === 0) base = 20;
  else if (inLabel > 0 && label[inLabel - 1] === " ") base = 25;
  else if (inLabel > 0) base = 30;
  else if (inHint >= 0) base = 35;
  else base = 45;

  // Kind separates a tie, and the shorter of two equally good labels breaks
  // what is left — "Vienna — VIE" before "Vienna Woods and the Kahlenberg".
  // The length term is deliberately the weakest of the three: it must not
  // outweigh kind, or a short landmark would come before the quarter.
  return base + KIND_ORDER[anchor.kind] + Math.min(0.9, anchor.label.length / 100);
}

/**
 * The site's own anchors matching what was typed, best first.
 *
 * Returns nothing under two characters rather than the first eight of 865: a
 * single letter is not a search, and a list that appears before anybody has
 * said anything is noise under the cursor.
 */
export function searchSiteAnchors(query: string, limit = 6): NearAnchor[] {
  const q = normalize(query);
  if (q.length < 2) return [];

  const scored: Array<{ anchor: Indexed; score: number }> = [];
  for (const anchor of anchors()) {
    const score = rank(anchor, q);
    if (score !== null) scored.push({ anchor, score });
  }

  scored.sort((a, b) => a.score - b.score || a.anchor.label.localeCompare(b.anchor.label));

  const out: NearAnchor[] = [];
  const seen = new Set<string>();
  for (const { anchor } of scored) {
    // Two anchors within a few metres of each other are one answer to a
    // person holding a ruler — the quarter and the shul at its centre.
    const key = `${normalize(anchor.label)}|${anchor.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const { haystack: _haystack, ...rest } = anchor;
    out.push(rest);
    if (out.length >= limit) break;
  }
  return out;
}
