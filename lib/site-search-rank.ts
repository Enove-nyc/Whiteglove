/**
 * Vacation-first ranking for global search.
 *
 * =============================================================================
 * RANKING MODEL (read this before changing scores)
 * =============================================================================
 *
 * Ordinary travel queries (Rome, beach, family mountains, kosher hotel):
 *   1. Exact vacation-destination name
 *   2. Vacation prefix / strong alias
 *   3. Vacation matching holiday type / country / season / feature keywords
 *   4. Hotels and recommended neighborhoods
 *   5. Things to do
 *   6. Kosher food and religious-practical site pages
 *   7. Relevant site guides and services
 *   8. Heritage content (towns, batei hachaim, tzaddikim)
 *
 * Heritage ranks highly ONLY with heritage intent:
 *   - Query tokens like kever / cemetery / beis hachaim / rebbe / tzaddik
 *   - Exact heritage-town, cemetery, or tzaddik name
 *   - A heritage town with no competing vacation destination
 *
 * For a city that is both vacation and heritage (Rome, Kraków):
 *   Vacation → Stay → Things to do → Kosher/practical → “Heritage in [city]”
 *
 * Match quality and type priority are combined into one sort key. Body-text
 * hits are scored weaker than name / alias / keyword hits so a long overview
 * cannot bury an exact destination.
 */

import { normalize } from "@/lib/place-search";
import { fuzzyAllowedForQuery, matchField, queryTokens } from "@/lib/site-search-match";
import type { SearchDocument, SiteHit, SiteHitKind, SiteHitSection } from "@/lib/site-search-types";
import { SITE_HIT_SECTIONS } from "@/lib/site-search-types";

/** Words that mean the visitor is looking for heritage, not a holiday. */
const HERITAGE_INTENT = [
  "kever",
  "kevarim",
  "cemetery",
  "cemeteries",
  "beis hachaim",
  "beit hachaim",
  "beis hachayim",
  "batei hachaim",
  "beis hakvaros",
  "rebbe",
  "rebbes",
  "tzaddik",
  "tzadik",
  "tzaddikim",
  "tzadikim",
  "yahrzeit",
  "ohel",
  "grave",
  "graves",
  "burial",
  "burials",
  "nesios",
  "kivrei",
  "kivrei tzaddikim",
];

/** Category cues that should prefer a content kind without needing a place name. */
const CATEGORY_INTENT: Array<{ phrases: string[]; kinds: SiteHitKind[] }> = [
  {
    phrases: ["where to stay", "places to stay", "hotel", "hotels", "kosher hotel", "kosher hotels", "lodging", "accommodation"],
    kinds: ["Hotel or stay", "Neighborhood", "Site page"],
  },
  {
    phrases: ["kosher food", "restaurant", "restaurants", "bakery", "bakeries", "grocery", "groceries", "eatery", "eateries"],
    kinds: ["Kosher food", "Site page"],
  },
  {
    phrases: ["thing to do", "things to do", "attraction", "attractions", "activity", "activities", "sightseeing", "museum", "museums"],
    kinds: ["Thing to do", "Site page"],
  },
  {
    phrases: ["mikvah", "mikvaos", "mikveh", "mikve", "tvilah"],
    kinds: ["Practical travel", "Travel guide", "Site page"],
  },
  {
    phrases: ["destination", "destinations", "vacation", "holiday", "getaway", "getaways"],
    kinds: ["Vacation destination", "Site page"],
  },
];

/** Type priority for ordinary (vacation-first) travel. Lower wins. */
const VACATION_KIND_PRIORITY: Record<SiteHitKind, number> = {
  "Vacation destination": 0,
  "Hotel or stay": 1,
  Neighborhood: 2,
  "Thing to do": 3,
  "Kosher food": 4,
  "Practical travel": 4,
  "Travel guide": 5,
  Service: 5,
  "Site page": 6,
  "Heritage town": 8,
  "Beis hachaim": 9,
  "Kever or tzaddik": 9,
};

/** Type priority when the query itself is about heritage. */
const HERITAGE_KIND_PRIORITY: Record<SiteHitKind, number> = {
  "Kever or tzaddik": 0,
  "Beis hachaim": 0,
  "Heritage town": 1,
  "Vacation destination": 4,
  "Hotel or stay": 5,
  Neighborhood: 5,
  "Thing to do": 6,
  "Kosher food": 6,
  "Practical travel": 6,
  "Travel guide": 7,
  Service: 7,
  "Site page": 7,
};

export type ScoredHit = {
  hit: SiteHit;
  /** Primary sort: match quality (0 = exact title). */
  matchRank: number;
  /** Secondary: type priority under the active intent. */
  kindRank: number;
  /** Tertiary: editorial weight inside the kind. */
  rankWeight: number;
  fuzzy: boolean;
  matchedLabel: string;
};

export function hasHeritageIntent(query: string): boolean {
  const q = normalize(query);
  if (!q) return false;
  if (HERITAGE_INTENT.some((phrase) => q === phrase || q.includes(phrase))) return true;
  // Single known heritage cue tokens.
  const tokens = q.split(" ").filter(Boolean);
  return tokens.some((t) =>
    ["kever", "kevarim", "cemetery", "rebbe", "tzaddik", "tzadik", "yahrzeit", "ohel", "nesios"].includes(t),
  );
}

/** Preferred kinds when the query is a category phrase (hotels, food, …). */
export function categoryIntentKinds(query: string): SiteHitKind[] | null {
  const q = normalize(query);
  if (!q) return null;
  for (const rule of CATEGORY_INTENT) {
    if (rule.phrases.some((phrase) => q === phrase || q.includes(phrase))) {
      return rule.kinds;
    }
  }
  return null;
}

/**
 * Score one document against the query.
 *
 * Returns null when it should not appear at all.
 */
export function scoreDocument(query: string, doc: SearchDocument, heritageIntent: boolean): ScoredHit | null {
  const q = query.trim();
  const nq = normalize(q);
  if (!nq) return null;

  const allowFuzzy = fuzzyAllowedForQuery(q);
  const oneChar = nq.length === 1;
  const twoChar = nq.length === 2;
  const tokens = queryTokens(q);
  const categoryKinds = categoryIntentKinds(q);

  // 1-char: only vacation (and non-heritage site) name prefixes — no noise.
  if (oneChar) {
    if (doc.heritage) return null;
    const titleHit = matchField(q, doc.title, { allowFuzzy: false, minPrefix: 1 });
    if (!titleHit.ok || titleHit.rank > 2) return null;
    return toScored(doc, titleHit.rank, titleHit.rank, heritageIntent, false, doc.title, categoryKinds);
  }

  const nameFields = [doc.title, ...doc.names];
  let bestRank = 99;
  let bestLabel = doc.title;
  let fuzzy = false;

  // Multi-token queries require every meaningful token to land on names/keywords.
  // Otherwise “kosher hotle” would match every doc that merely says “kosher”.
  if (tokens.length > 1) {
    const hay = normalize([...doc.names, doc.title, ...doc.keywords, doc.city ?? "", doc.country ?? ""].join(" "));
    const tokenHay = hay.split(" ").filter(Boolean);
    let anyFuzzy = false;
    const all = tokens.every((qt) => {
      if (hay.includes(qt) && qt.length >= 2) return true;
      return tokenHay.some((ht) => {
        if (ht.startsWith(qt) && qt.length >= 2) return true;
        if (!allowFuzzy || qt.length < 3) return false;
        const hit = matchField(qt, ht, { allowFuzzy: true });
        if (hit.ok) {
          anyFuzzy = anyFuzzy || hit.fuzzy;
          return true;
        }
        return false;
      });
    });
    if (!all) return null;
    // Prefer docs whose title/name covers the query tightly.
    for (const field of nameFields) {
      const hit = matchField(q, field, { allowFuzzy, minPrefix: 2 });
      if (hit.ok && hit.rank < bestRank) {
        bestRank = hit.rank;
        bestLabel = hit.matched;
        fuzzy = hit.fuzzy;
      }
    }
    if (bestRank >= 99) {
      bestRank = 3.5;
      bestLabel = doc.title;
      fuzzy = anyFuzzy || tokens.some((qt) => !hay.includes(qt));
    }
  } else {
    // Single-token: 2-char prefixes/aliases only; longer may fuzzy.
    for (const field of nameFields) {
      const hit = matchField(q, field, { allowFuzzy: !twoChar && allowFuzzy, minPrefix: twoChar ? 2 : 1 });
      if (hit.ok && hit.rank < bestRank) {
        bestRank = hit.rank;
        bestLabel = hit.matched;
        fuzzy = hit.fuzzy;
      }
    }

    // Keywords / concepts — weaker than names, stronger than body.
    if (bestRank > 3) {
      for (const kw of doc.keywords) {
        const hit = matchField(q, kw, { allowFuzzy: allowFuzzy && !twoChar, minPrefix: 2 });
        if (hit.ok) {
          const keywordRank = Math.max(hit.rank, 3) + 0.5;
          if (keywordRank < bestRank) {
            bestRank = keywordRank;
            bestLabel = hit.matched;
            fuzzy = hit.fuzzy;
          }
        }
      }
    }

    // Body text last — and never for short queries.
    if (bestRank > 6 && !twoChar && doc.body) {
      const hit = matchField(q, doc.body, { allowFuzzy: false, minPrefix: 4 });
      if (hit.ok && nq.length >= 4) {
        bestRank = 7;
        bestLabel = doc.title;
        fuzzy = false;
      }
    }
  }

  if (bestRank >= 99) return null;

  // Without heritage intent, push heritage below vacation/stay/food for the
  // same city: exact “Rome” heritage must not outrank hotels in Rome.
  // Heritage-only towns (Lizhensk) still win because nothing vacation-side matches.
  const adjusted = !heritageIntent && doc.heritage ? bestRank + 3 : bestRank;

  return toScored(doc, adjusted, bestRank, heritageIntent, fuzzy, bestLabel, categoryKinds);
}

function toScored(
  doc: SearchDocument,
  matchRank: number,
  rawMatchRank: number,
  heritageIntent: boolean,
  fuzzy: boolean,
  matchedLabel: string,
  categoryKinds: SiteHitKind[] | null = null,
): ScoredHit {
  const kindTable = heritageIntent ? HERITAGE_KIND_PRIORITY : VACATION_KIND_PRIORITY;
  let kindRank = kindTable[doc.kind];
  // Category phrases (“where to stay”, “kosher food”) lift matching kinds.
  if (categoryKinds?.includes(doc.kind)) {
    kindRank = Math.max(0, kindRank - 3);
  } else if (categoryKinds && categoryKinds.length > 0 && !categoryKinds.includes(doc.kind)) {
    kindRank += 2;
  }
  return {
    hit: {
      id: doc.id,
      kind: doc.kind,
      section: doc.section,
      title: doc.title,
      yiddish: doc.yiddish,
      subtitle: doc.subtitle,
      href: doc.href,
      // Surface the raw quality (before heritage demotion) for Enter / UI.
      matchRank: rawMatchRank,
      fuzzy,
    },
    matchRank,
    kindRank,
    rankWeight: doc.rankWeight,
    fuzzy,
    matchedLabel,
  };
}

/**
 * Sort scored hits: match quality, then kind under active intent, then editorial weight.
 *
 * When a vacation destination and heritage content share a city and the query
 * is that city name, vacation already wins via kindRank; stays / attractions
 * follow before heritage.
 */
export function sortScored(hits: ScoredHit[]): ScoredHit[] {
  return [...hits].sort(
    (a, b) =>
      a.matchRank - b.matchRank ||
      a.kindRank - b.kindRank ||
      a.rankWeight - b.rankWeight ||
      a.hit.title.localeCompare(b.hit.title),
  );
}

/** Group hits into labeled sections, vacation-first (or heritage-first when intent). */
export function groupHits(hits: SiteHit[], heritageIntent: boolean): Array<{ section: SiteHitSection; hits: SiteHit[] }> {
  const order = heritageIntent
    ? (["Heritage", "Vacation", "Stay", "Things to do", "Kosher travel", "Guides and services"] as SiteHitSection[])
    : [...SITE_HIT_SECTIONS];

  return order
    .map((section) => ({ section, hits: hits.filter((h) => h.section === section) }))
    .filter((group) => group.hits.length > 0);
}

/**
 * True when Enter may open the first result directly: one hit, and it is an
 * unambiguous exact or near-exact name match (not a loose keyword pile).
 */
export function isUnambiguousExact(hits: SiteHit[]): boolean {
  if (hits.length !== 1) return false;
  const rank = hits[0].matchRank;
  return rank !== undefined && rank <= 1;
}

/** Best label to show as “Showing results for …” when fuzzy matching fired. */
export function interpretedQuery(scored: ScoredHit[]): string | undefined {
  const top = scored[0];
  if (!top?.fuzzy) return undefined;
  return top.matchedLabel;
}
