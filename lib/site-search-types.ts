/**
 * Shared shapes for global site search.
 *
 * Ranking rules live in lib/site-search-rank.ts. The index builder is
 * lib/site-search-index.ts. This file only names the things a result can be.
 */

/** What kind of thing a hit is — shown on every result row. */
export type SiteHitKind =
  | "Vacation destination"
  | "Hotel or stay"
  | "Thing to do"
  | "Kosher food"
  | "Practical travel"
  | "Neighborhood"
  | "Travel guide"
  | "Service"
  | "Heritage town"
  | "Beis hachaim"
  | "Kever or tzaddik"
  | "Site page";

/**
 * Broader groups on the full results page and in the dropdown.
 *
 * Vacation always comes first for ordinary travel. Heritage is last unless
 * the query itself is about kevarim / batei hachaim / tzaddikim.
 */
export type SiteHitSection =
  | "Vacation"
  | "Stay"
  | "Things to do"
  | "Kosher travel"
  | "Guides and services"
  | "Heritage";

export type SiteHit = {
  id: string;
  kind: SiteHitKind;
  section: SiteHitSection;
  title: string;
  /** The Yiddish name where there is one — the bar shows it above the Latin. */
  yiddish?: string;
  subtitle: string;
  href: string;
  /**
   * How tightly this row matched, for tests and for “interpreted as”.
   * Lower is closer. Exact title = 0.
   */
  matchRank?: number;
  /** True when the match needed fuzzy tolerance rather than a direct hit. */
  fuzzy?: boolean;
};

/** One document in the server-side searchable index. */
export type SearchDocument = {
  id: string;
  kind: SiteHitKind;
  section: SiteHitSection;
  title: string;
  yiddish?: string;
  subtitle: string;
  href: string;
  /** Primary names and strong aliases (city spellings, transliterations). */
  names: string[];
  /** Concept / facet tokens: beach, shabbos, winter sun, kosher hotel, … */
  keywords: string[];
  /** Weaker text (summaries). Must not outrank a strong destination name. */
  body: string;
  city?: string;
  country?: string;
  /** Editorial base weight within its kind (lower = more preferred). */
  rankWeight: number;
  /** Heritage content that should stay quiet unless the query wants it. */
  heritage: boolean;
  /** Vacation destinations and their concept facets. */
  vacation: boolean;
  /**
   * Pre-normalised tokens for fast candidate filtering (built once at index time).
   * Includes title, names, keywords, city, country — not body.
   */
  normTokens: string[];
  /** Compact forms of the strongest names, for hyphen/space-insensitive fuzzy. */
  normCompact: string[];
};

export type SearchResponse = {
  results: SiteHit[];
  query: string;
  /** When fuzzy matching corrected or interpreted the query. */
  interpretedAs?: string;
  heritageIntent: boolean;
  /** Empty-focus vacation list vs typed search. */
  mode: "empty" | "search";
};

export const SITE_HIT_KINDS: readonly SiteHitKind[] = [
  "Vacation destination",
  "Hotel or stay",
  "Thing to do",
  "Kosher food",
  "Practical travel",
  "Neighborhood",
  "Travel guide",
  "Service",
  "Heritage town",
  "Beis hachaim",
  "Kever or tzaddik",
  "Site page",
] as const;

export const SITE_HIT_SECTIONS: readonly SiteHitSection[] = [
  "Vacation",
  "Stay",
  "Things to do",
  "Kosher travel",
  "Guides and services",
  "Heritage",
] as const;

export function sectionForKind(kind: SiteHitKind): SiteHitSection {
  switch (kind) {
    case "Vacation destination":
      return "Vacation";
    case "Hotel or stay":
    case "Neighborhood":
      return "Stay";
    case "Thing to do":
      return "Things to do";
    case "Kosher food":
    case "Practical travel":
      return "Kosher travel";
    case "Travel guide":
    case "Service":
    case "Site page":
      return "Guides and services";
    case "Heritage town":
    case "Beis hachaim":
    case "Kever or tzaddik":
      return "Heritage";
  }
}
