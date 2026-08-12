/**
 * Admin chrome search — screens, published listings, and review candidates.
 *
 * Not the public site search. AI is not involved.
 */

import { canOpen, type AdminArea } from "@/lib/admin-permissions";
import { getAdminSearchIndex, toAdminHit, type AdminSearchDocument } from "@/lib/admin-search-index";
import type { AdminHit, AdminSearchResponse } from "@/lib/admin-search-types";
import { ADMIN_HIT_SECTIONS } from "@/lib/admin-search-types";
import { compact, matchField, normalize, queryTokens } from "@/lib/site-search-match";

export type { AdminHit, AdminSearchResponse };

function isPlausible(qTokens: string[], doc: AdminSearchDocument): boolean {
  if (qTokens.length === 0) return false;
  const joined = qTokens.join("");
  if (joined.length >= 3 && doc.normCompact.some((c) => c === joined || c.startsWith(joined))) return true;
  return qTokens.every((qt) => {
    if (qt.length < 2) return doc.normTokens.some((t) => t.startsWith(qt));
    return doc.normTokens.some((t) => t.startsWith(qt.slice(0, 2)) || t.includes(qt));
  });
}

function scoreAdminDoc(query: string, doc: AdminSearchDocument): { rank: number; fuzzy: boolean } | null {
  const nq = normalize(query);
  if (!nq) return null;
  const tokens = queryTokens(query);
  if (!isPlausible(tokens, doc)) return null;

  const cq = compact(nq);
  let best = 99;
  let fuzzy = false;
  for (const field of [doc.title, ...doc.names]) {
    const hit = matchField(query, field, { allowFuzzy: nq.length >= 3, minPrefix: 1 });
    if (hit.ok && hit.rank < best) {
      best = hit.rank;
      fuzzy = hit.fuzzy;
    }
  }
  if (best > 3) {
    for (const kw of doc.keywords) {
      const hit = matchField(query, kw, { allowFuzzy: false, minPrefix: 2 });
      if (hit.ok) {
        const keywordRank = Math.max(hit.rank, 3) + 0.5;
        if (keywordRank < best) {
          best = keywordRank;
          fuzzy = hit.fuzzy;
        }
      }
    }
  }
  if (best >= 99 && cq.length >= 3 && doc.normCompact.some((c) => c === cq || c.startsWith(cq))) {
    best = 2;
  }
  if (best >= 99) return null;
  return { rank: best, fuzzy };
}

const SECTION_RANK: Record<AdminHit["section"], number> = {
  Screens: 0,
  Listings: 1,
  Candidates: 2,
};

function diversify(hits: Array<{ hit: AdminHit; rank: number; sectionRank: number }>, limit: number): AdminHit[] {
  const results: AdminHit[] = [];
  const seen = new Set<string>();
  for (const row of hits) {
    if ((row.hit.matchRank ?? 99) > 1) continue;
    const key = `${row.hit.section}:${row.hit.href}:${normalize(row.hit.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(row.hit);
    if (results.length >= limit) return results;
  }
  const bySection = new Map<string, AdminHit[]>();
  for (const row of hits) {
    const key = `${row.hit.section}:${row.hit.href}:${normalize(row.hit.title)}`;
    if (seen.has(key)) continue;
    const list = bySection.get(row.hit.section) ?? [];
    list.push(row.hit);
    bySection.set(row.hit.section, list);
  }
  for (const section of ADMIN_HIT_SECTIONS) {
    for (const hit of (bySection.get(section) ?? []).slice(0, 6)) {
      const key = `${hit.section}:${hit.href}:${normalize(hit.title)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push(hit);
      if (results.length >= limit) return results;
    }
  }
  for (const row of hits) {
    const key = `${row.hit.section}:${row.hit.href}:${normalize(row.hit.title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(row.hit);
    if (results.length >= limit) break;
  }
  return results;
}

export async function searchAdmin(
  query: string,
  opts: { areas?: AdminArea[] | null; limit?: number } = {},
): Promise<AdminSearchResponse> {
  const q = query.trim();
  const limit = opts.limit ?? 24;
  const areas = opts.areas ?? null;
  if (!q) {
    return { query: "", results: [] };
  }

  const index = await getAdminSearchIndex();
  const scored: Array<{ hit: AdminHit; rank: number; sectionRank: number }> = [];
  for (const doc of index) {
    if (!canOpen(areas, doc.href.split("?")[0] || doc.href)) continue;
    const score = scoreAdminDoc(q, doc);
    if (!score) continue;
    scored.push({
      hit: toAdminHit(doc, score.rank),
      rank: score.rank,
      sectionRank: SECTION_RANK[doc.section],
    });
  }
  scored.sort((a, b) => a.rank - b.rank || a.sectionRank - b.sectionRank || a.hit.title.localeCompare(b.hit.title));
  return { query: q, results: diversify(scored, limit) };
}
