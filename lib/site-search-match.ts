/**
 * Typo-tolerant matching for global search.
 *
 * Uses Damerau–Levenshtein (insert / delete / substitute / adjacent transpose)
 * plus accent/punctuation folding from lib/place-search. Short queries stay
 * conservative so one or two letters do not flood the dropdown with noise.
 */

import { normalize } from "@/lib/place-search";

export { normalize };

/** Damerau–Levenshtein edit distance for short tokens. */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const aLen = a.length;
  const bLen = b.length;
  const maxDist = Math.max(aLen, bLen);
  // Two-row DP is enough for Levenshtein; transposition needs the prior-prior cell.
  const prevPrev = new Array<number>(bLen + 1);
  const prev = new Array<number>(bLen + 1);
  const curr = new Array<number>(bLen + 1);
  for (let j = 0; j <= bLen; j += 1) prev[j] = j;

  for (let i = 1; i <= aLen; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= bLen; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let best = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        best = Math.min(best, prevPrev[j - 2] + 1);
      }
      curr[j] = best;
    }
    for (let j = 0; j <= bLen; j += 1) {
      prevPrev[j] = prev[j];
      prev[j] = curr[j];
    }
  }
  return prev[bLen] > maxDist ? maxDist : prev[bLen];
}

/**
 * How many edits a query token of this length may spend.
 *
 * DELIBERATELY MEAN, because the cost of generosity is a confident wrong
 * answer. The budget used to be two edits from four letters up, and the
 * hechsherim page indexes every certifier name it knows — Chai, Ches, CHLP,
 * Tikva, Heights. Two edits on a five-letter word is forty per cent of the
 * word, so "cheap" reached "chai" and "flights" reached "heights"; a visitor
 * searching "cheap flights" was shown a page about kashrus symbols, and one
 * searching "mikvah london" got the same, because "mikvah" reached "tikva".
 * With nothing else matching, that wrong page WON.
 *
 * One edit is what a typo is up to six letters: a slip, a doubled letter, a
 * transposition — krakov for krakow. From seven letters two edits is a
 * reasonable share of the word rather than half of it, and that is where
 * TRANSLITERATION lives, which is not a typo at all: בארדיאב sounds out to
 * "bardiab" and the town is indexed as "bardiov", two edits apart with neither
 * spelling wrong. Cutting that off broke the Yiddish bridge, which is the
 * thing the generosity was for.
 *
 * The wrong answers died at the SHORT end, which is where they were: "cheap"
 * and "mikvah" can no longer reach "chai" and "tikva". A multi-word query
 * needs every word to match one document, so killing the short-word reaches is
 * enough — "cheap flights" no longer has a first word that matches anything on
 * the hechsherim page, and the page drops out whole.
 */
export function maxEditsFor(token: string): number {
  const n = token.length;
  if (n <= 3) return 0;
  if (n <= 6) return 1;
  if (n <= 9) return 2;
  return 3;
}

/**
 * Strip hyphens/spaces so "south-tyrol" ~ "south tyrol" and "krakow" ~ "kra kow"
 * still share a comparable form. Accents already folded by normalize().
 */
export function compact(value: string): string {
  return normalize(value).replace(/[\s-]+/g, "");
}

export type FieldMatch =
  | { ok: true; rank: number; fuzzy: boolean; matched: string }
  | { ok: false };

/**
 * Score how well `query` hits a single field value.
 *
 * Ranks (lower better):
 *   0 exact whole field
 *   1 exact token / strong alias token
 *   2 prefix of field or token
 *   3 field contains query (substring)
 *   4 fuzzy token within edit budget
 *   5 compact (hyphen/space-insensitive) fuzzy
 */
export function matchField(
  query: string,
  field: string,
  opts: { allowFuzzy?: boolean; minPrefix?: number } = {},
): FieldMatch {
  const allowFuzzy = opts.allowFuzzy ?? true;
  const minPrefix = opts.minPrefix ?? 1;
  const q = normalize(query);
  const f = normalize(field);
  if (!q || !f) return { ok: false };

  if (f === q) return { ok: true, rank: 0, fuzzy: false, matched: field };

  // "e-sim" / "e sim" / "esim" are the same name once hyphens and spaces go.
  const cq = compact(q);
  const cf = compact(f);
  if (cq.length >= 3 && cf === cq) return { ok: true, rank: 1, fuzzy: false, matched: field };

  if (f.startsWith(q) && q.length >= minPrefix) return { ok: true, rank: 2, fuzzy: false, matched: field };
  if (cq.length >= 3 && cf.startsWith(cq)) return { ok: true, rank: 2, fuzzy: false, matched: field };

  const fTokens = f.split(" ").filter(Boolean);
  for (const token of fTokens) {
    if (token === q) return { ok: true, rank: 1, fuzzy: false, matched: field };
    if (token.startsWith(q) && q.length >= minPrefix) return { ok: true, rank: 2, fuzzy: false, matched: field };
  }

  // INSIDE A LONGER WORD IS NOT A MATCH — for a single word.
  //
  // "Rome" is a substring of "promenade", so searching Rome returned seaside
  // promenades ranked as solidly as the city, and did it for every short
  // place name on the site: Bath inside "bathroom", Ur inside "Zurich". A
  // one-word query has to land on a word — the whole field, a whole token, or
  // the start of one, all of which are ranked above this line.
  //
  // A MULTI-WORD QUERY IS DIFFERENT: "sally mayer" inside "Around Via Sally
  // Mayer and the Via Guastalla synagogue" is the visitor quoting a phrase
  // out of the middle of a name, which is exactly what they meant. Those keep
  // working, one rank below a name match.
  const isPhrase = q.includes(" ");
  if (isPhrase && f.includes(q) && q.length >= 3) return { ok: true, rank: 3, fuzzy: false, matched: field };

  if (!allowFuzzy) return { ok: false };

  const qTokens = q.split(" ").filter(Boolean);
  // Single-token fuzzy against field tokens / whole field.
  if (qTokens.length === 1) {
    const qt = qTokens[0];
    const budget = maxEditsFor(qt);
    if (budget > 0) {
      if (damerauLevenshtein(qt, f) <= budget) {
        return { ok: true, rank: 4, fuzzy: true, matched: field };
      }
      for (const token of fTokens) {
        if (Math.abs(token.length - qt.length) > budget) continue;
        if (damerauLevenshtein(qt, token) <= budget) {
          return { ok: true, rank: 4, fuzzy: true, matched: field };
        }
      }
      const cq = compact(qt);
      const cf = compact(f);
      if (cq.length >= 4 && damerauLevenshtein(cq, cf) <= budget) {
        return { ok: true, rank: 5, fuzzy: true, matched: field };
      }
      for (const token of fTokens) {
        const ct = compact(token);
        if (cq.length >= 4 && damerauLevenshtein(cq, ct) <= maxEditsFor(cq)) {
          return { ok: true, rank: 5, fuzzy: true, matched: field };
        }
      }
    }
  } else {
    // Multi-token: every query token must land on some field token (prefix or fuzzy).
    const allHit = qTokens.every((qt) => {
      if (f.includes(qt) && qt.length >= 2) return true;
      return fTokens.some((ht) => {
        if (ht.startsWith(qt)) return true;
        if (ht.includes(qt) && qt.length >= 3) return true;
        if (qt.length < 3) return false;
        return damerauLevenshtein(qt, ht) <= maxEditsFor(qt);
      });
    });
    if (allHit) return { ok: true, rank: 4, fuzzy: true, matched: field };
  }

  return { ok: false };
}

/** Whether this query length should allow fuzzy edits at all. */
export function fuzzyAllowedForQuery(query: string): boolean {
  const q = normalize(query);
  if (q.length <= 2) return false;
  // Two short tokens ("shabos paris") still need fuzzy on the first word.
  return q.replace(/\s+/g, "").length >= 3;
}

/**
 * Words that describe a search without naming a place.
 *
 * “things to do in Rome” must not require every document to contain “to” /
 * “in” / “do”. Keep them for display, drop them from match gates.
 */
const STOP_TOKENS = new Set([
  "a",
  "an",
  "the",
  "to",
  "in",
  "on",
  "at",
  "of",
  "for",
  "and",
  "or",
  "near",
  "with",
  "from",
  "by",
  "do",
  "me",
  "my",
  "our",
  "find",
  "show",
  "list",
  "all",
  "any",
  "some",
]);

/** Meaningful tokens for matching — drops glue words, keeps Hebrew and names. */
export function queryTokens(query: string): string[] {
  const tokens = normalize(query)
    .split(" ")
    .filter(Boolean)
    .filter((t) => !STOP_TOKENS.has(t));
  // If the query was only stopwords, keep the raw tokens so we still search.
  if (tokens.length === 0) {
    return normalize(query).split(" ").filter(Boolean);
  }
  return tokens;
}

/** Conservative gate for 1-character queries: prefix of a name only. */
export function isUsefulQuery(query: string): { useful: boolean; oneCharPrefix: boolean } {
  const q = normalize(query.trim());
  if (!q) return { useful: false, oneCharPrefix: false };
  if (q.length === 1) return { useful: true, oneCharPrefix: true };
  return { useful: true, oneCharPrefix: false };
}
