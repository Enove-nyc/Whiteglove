/**
 * One search across everything the public site holds.
 *
 * WHY THIS EXISTS. The navbar search bar sits on every page. It used to know
 * about heritage towns and batei hachaim only — and it imported the cemetery
 * database into the browser to do it. Vacation destinations, hotels, food and
 * guides were invisible in the box that every visitor types into.
 *
 * Architecture:
 *   - lib/site-search-index.ts  builds a server-side index (cached in memory)
 *   - lib/site-search-match.ts  Damerau–Levenshtein + accent/punct folding
 *   - lib/site-search-rank.ts   vacation-first weighted ranking (documented)
 *   - this file                 public API for the bar, /api/search and /search
 *
 * Empty focus returns every published vacation destination in editorial order.
 * Typed queries search the full index. Drafts, admin and private pages stay out.
 */

import { vacationDestinations } from "@/data/vacation-destinations";
import { getSearchIndex } from "@/lib/site-search-index";
import { normalize, queryTokens } from "@/lib/site-search-match";
import {
  groupHits,
  hasHeritageIntent,
  interpretedQuery,
  isUnambiguousExact,
  scoreDocument,
  sortScored,
  type ScoredHit,
} from "@/lib/site-search-rank";
import type { SearchResponse, SiteHit, SiteHitKind, SiteHitSection } from "@/lib/site-search-types";
import { sectionForKind, SITE_HIT_SECTIONS } from "@/lib/site-search-types";
import { destinationHref as vacationHref } from "@/lib/vacation-ideas";

export type { SiteHit, SiteHitKind, SiteHitSection, SearchResponse };
export { groupHits, hasHeritageIntent, isUnambiguousExact, sectionForKind };
export { invalidateSiteSearchIndex } from "@/lib/site-search-index";

/** Vacation destinations for the empty-focus dropdown, editorial order. */
export function vacationEmptySuggestions(): SiteHit[] {
  return vacationDestinations.map((d) => ({
    id: `vacation-${d.slug}`,
    kind: "Vacation destination" as const,
    section: "Vacation" as const,
    title: d.name,
    subtitle: d.region ? `${d.region} · ${d.country}` : d.country,
    href: vacationHref(d),
    matchRank: 0,
    fuzzy: false,
  }));
}

/**
 * Full search response — empty mode or typed results.
 *
 * `limit` caps typed results (dropdown uses ~8–12). Pass a large limit for the
 * /search page. Empty queries ignore limit and return every vacation destination.
 */
export async function searchSite(query: string, limit = 10): Promise<SearchResponse> {
  const q = query.trim();
  if (!q) {
    return {
      results: vacationEmptySuggestions(),
      query: "",
      heritageIntent: false,
      mode: "empty",
    };
  }

  const heritageIntent = hasHeritageIntent(q);
  const index = await getSearchIndex();
  const scored: ScoredHit[] = [];
  const qTokens = queryTokens(q);

  for (const doc of index) {
    // Cheap gate before Damerau work: every meaningful query token must share a
    // 2-letter prefix (or be a substring) with some indexed token, or the compact
    // name must be within a plausible length of the query. Skips most tzaddikim.
    if (!isPlausibleCandidate(qTokens, doc.normTokens, doc.normCompact)) continue;
    const hit = scoreDocument(q, doc, heritageIntent);
    if (hit) scored.push(hit);
  }

  const sorted = sortScored(scored);
  const results = diversifyHits(sorted, limit);

  return {
    results,
    query: q,
    interpretedAs: interpretedQuery(sorted),
    heritageIntent,
    mode: "search",
  };
}

/**
 * Prefer a useful mix of sections in the dropdown (and still honour limit).
 *
 * Without this, twelve Rome hotels can crowd out food, attractions and heritage
 * that a broad query should surface under their own headings.
 */
function diversifyHits(sorted: ScoredHit[], limit: number): SiteHit[] {
  const seen = new Set<string>();
  const bySection = new Map<SiteHitSection, SiteHit[]>();
  for (const row of sorted) {
    const key = `${row.hit.kind}:${normalize(row.hit.title)}:${row.hit.href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = bySection.get(row.hit.section) ?? [];
    list.push(row.hit);
    bySection.set(row.hit.section, list);
  }

  const results: SiteHit[] = [];
  const order = SITE_HIT_SECTIONS.filter((section) => (bySection.get(section)?.length ?? 0) > 0);
  // First pass: up to two from each section so categories appear.
  const perSection = Math.max(2, Math.ceil(limit / Math.max(order.length, 1)));
  for (const section of order) {
    const list = bySection.get(section) ?? [];
    for (const hit of list.slice(0, perSection)) {
      if (results.length >= limit) return results;
      if (!results.some((r) => r.id === hit.id)) results.push(hit);
    }
  }
  // Fill remaining slots in overall rank order.
  for (const row of sorted) {
    if (results.length >= limit) break;
    if (results.some((r) => r.id === row.hit.id)) continue;
    results.push(row.hit);
  }
  return results;
}

/**
 * Everything matching, best first — the shape older callers expect.
 *
 * Prefer searchSite() when you need interpretedAs / heritageIntent / empty mode.
 */
export async function searchEverything(query: string, limit = 8): Promise<SiteHit[]> {
  const response = await searchSite(query, limit);
  // Preserve the old contract: empty query returns nothing (the bar used to
  // supply its own defaults). New callers that want the vacation empty state
  // should use searchSite("").
  if (!query.trim()) return [];
  return response.results;
}

/**
 * Fast reject for documents that cannot possibly match, before edit-distance work.
 */
function isPlausibleCandidate(qTokens: string[], docTokens: string[], docCompact: string[]): boolean {
  if (qTokens.length === 0) return false;
  if (qTokens.length === 1 && qTokens[0].length === 1) {
    const ch = qTokens[0];
    return docTokens.some((t) => t.startsWith(ch));
  }
  return qTokens.every((qt) => {
    if (qt.length < 2) return docTokens.some((t) => t.startsWith(qt));
    const prefix = qt.slice(0, 2);
    if (docTokens.some((t) => t.startsWith(prefix) || t.includes(qt) || (qt.includes(t) && t.length >= 4))) {
      return true;
    }
    // Compact fuzzy: “dolomits” vs “thedolomites” / “dolomites”.
    if (qt.length >= 4) {
      const cq = qt.replace(/[\s-]+/g, "");
      return docCompact.some((c) => Math.abs(c.length - cq.length) <= 3 && (c.startsWith(cq.slice(0, 3)) || cq.startsWith(c.slice(0, 3))));
    }
    return false;
  });
}
