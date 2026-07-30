// One search across everything the site holds.
//
// WHY THIS EXISTS. The search bar in the navbar sits on every page and knew
// about two things: destinations and batei hachaim. Type "Colosseum", "Kosher
// Tirol" or "Merano" into it and the dropdown said "No match yet" — while
// /stops, one Enter away, found all three. The site had the answer and the bar
// could not see it.
//
// It knew about two things because it was built when there were only two. Since
// then the site has grown attractions, places to stay, quarters and places to
// eat, and each was added to the pages and to /stops without anybody going back
// to the bar.
//
// So the search moved here, behind one function, and the bar asks the server
// rather than carrying the data. That fixes a second thing at the same time:
// the bar is a client component and it was importing the whole cemetery
// database into the browser to search it. Every visitor downloaded every kever
// on the site to type into a box.

import { cemeteries } from "@/data/cemeteries";
import { destinationHaystack, destinationHref, destinations } from "@/data/destinations";
import { searchAreas, searchAttractions, searchEateries, searchStays } from "@/lib/attraction-search";
import { extraSpellings, fuzzyMatch, normalize } from "@/lib/place-search";

/**
 * What kind of thing a hit is, in the words a traveler would use.
 *
 * Shown on the result row. The bar already had a slot for this — it said
 * "Guide", "Location" or "Beis hachaim" — so the new kinds go where the old
 * ones went and nothing about the look changes.
 */
export type SiteHitKind = "Guide" | "Beis hachaim" | "Thing to do" | "Somewhere to stay" | "Somewhere to eat" | "Area" | "Location";

export type SiteHit = {
  id: string;
  kind: SiteHitKind;
  title: string;
  /** The Yiddish name where there is one — the bar shows it above the Latin. */
  yiddish?: string;
  subtitle: string;
  href: string;
};

/**
 * The order the kinds come back in.
 *
 * A kever outranks a museum on this site and that is deliberate: somebody
 * typing "Lizhensk" wants the beis hachaim, not a restaurant in the town. The
 * rest follow the order of a trip — where to go, what to do, where to sleep,
 * where to eat.
 */
const KIND_ORDER: SiteHitKind[] = ["Guide", "Beis hachaim", "Thing to do", "Somewhere to stay", "Somewhere to eat", "Area", "Location"];

/**
 * How close a hit is to what was typed, lower being closer.
 *
 * Same rule as everywhere else on the site: the city is compared whole and
 * before the name, because substring-scoring the two together once ranked the
 * Promenade des Anglais as a strong hit for "Rome".
 */
function rank(query: string, city: string, name: string): number {
  const nq = normalize(query);
  if (!nq) return 0;
  if (normalize(city) === nq) return 0;
  if (normalize(city).startsWith(nq)) return 1;
  if (normalize(name).includes(nq)) return 2;
  return 3;
}

/**
 * Everything matching, best first, across all seven kinds.
 *
 * `limit` is applied at the end rather than per kind, so a query that only
 * matches attractions returns a full list of attractions instead of two.
 */
export async function searchEverything(query: string, limit = 8): Promise<SiteHit[]> {
  const q = query.trim();
  if (!q) return [];

  const [attractions, stays, areas, eateries] = await Promise.all([
    searchAttractions(q, 30),
    searchStays(q, 30),
    searchAreas(q, 20),
    searchEateries(q, 20),
  ]);

  const hits: Array<{ hit: SiteHit; score: number }> = [];
  const push = (hit: SiteHit, city: string, name: string) => hits.push({ hit, score: rank(q, city, name) });

  for (const d of destinations) {
    if (!fuzzyMatch(q, `${destinationHaystack(d)} ${extraSpellings([d.slug, d.city])}`)) continue;
    push(
      {
        id: `destination-${d.slug}`,
        kind: d.guide ? "Guide" : "Location",
        title: d.city,
        yiddish: d.yiddishCity,
        subtitle: d.guide?.tzaddik ? `${d.guide.tzaddik} · ${d.country}` : d.country,
        href: destinationHref(d),
      },
      d.city,
      d.city,
    );
  }

  for (const c of cemeteries) {
    const hay = `${c.city} ${c.yiddishCity} ${c.name} ${c.yiddishName} ${c.country} ${extraSpellings([c.slug, c.city])}`;
    if (!fuzzyMatch(q, hay)) continue;
    push(
      {
        id: `cemetery-${c.slug}`,
        kind: "Beis hachaim",
        title: c.name,
        yiddish: c.yiddishName || c.yiddishCity,
        subtitle: `${c.city} · ${c.country}`,
        href: `/cemeteries/${c.slug}`,
      },
      c.city,
      c.name,
    );
  }

  for (const a of attractions) {
    push(
      { id: `attraction-${a.slug}`, kind: "Thing to do", title: a.name, subtitle: `${a.city} · ${a.country} · ${a.kind}`, href: a.href },
      a.city,
      a.name,
    );
  }

  for (const s of stays) {
    push(
      { id: `stay-${s.slug}`, kind: "Somewhere to stay", title: s.name, subtitle: `${s.city} · ${s.country} · ${s.kind}`, href: s.href },
      s.city,
      s.name,
    );
  }

  for (const e of eateries) {
    push(
      { id: `eatery-${e.slug}`, kind: "Somewhere to eat", title: e.name, subtitle: `${e.city} · ${e.country} · ${e.kind}`, href: `/kosher#${e.slug}` },
      e.city,
      e.name,
    );
  }

  for (const a of areas) {
    push(
      { id: `area-${a.slug}`, kind: "Area", title: a.name, subtitle: `${a.city} · ${a.country}`, href: `/kosher-stays#${a.slug}` },
      a.city,
      a.name,
    );
  }

  // A city with a guide and a beis hachaim of the same name produced the same
  // row twice, which is how the bar behaved before and was always wrong.
  const seen = new Set<string>();
  return hits
    .sort(
      (x, y) =>
        x.score - y.score ||
        KIND_ORDER.indexOf(x.hit.kind) - KIND_ORDER.indexOf(y.hit.kind) ||
        x.hit.title.localeCompare(y.hit.title),
    )
    .filter(({ hit }) => {
      const key = `${hit.kind}:${normalize(hit.title)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ hit }) => hit);
}
