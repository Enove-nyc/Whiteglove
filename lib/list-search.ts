/**
 * The matcher and the relevance order every long public list on this site
 * shares — extracted from components/ListToolbar.tsx so the SERVER can use
 * them too.
 *
 * The toolbar is a client component, so anything importing these from there
 * dragged a React component into a route handler. The kosher food search runs
 * on the server now (app/api/kosher/search), and it has to match a listing
 * exactly the way the browser used to, or the answer changes depending on
 * where the search happened. One matcher, one order, both sides.
 *
 * ListToolbar re-exports both, so the four other directories that import them
 * from there are untouched.
 */

import { fuzzyMatch, normalize } from "@/lib/place-search";

/**
 * Does this entry match what was typed?
 *
 * THIS USED TO BE ITS OWN MATCHER — accent-folded substring, every word had to
 * appear — while the planner and /stops used the spelling-tolerant one in
 * lib/place-search. Two matchers meant the same query gave two answers:
 * "Colosseom" found the Colosseum in the planner and nothing at all on the
 * page that lists it, and "Lezajsk" found Lizhensk on /stops and nothing on
 * /cemeteries. The page a visitor actually browses was the one that could not
 * spell.
 *
 * So this now delegates. Everything the site searches goes through one matcher,
 * and a fix to it fixes every page at once.
 */
export function listMatches(haystack: string, needle: string): boolean {
  return fuzzyMatch(needle, haystack);
}

/**
 * How close a hit is to what was typed, lower being closer. Sort by this only
 * while there IS a query — with an empty box the page's own order is the right
 * one, and a relevance sort would scramble it for nothing.
 *
 * The city is compared whole and BEFORE the name, for the reason recorded in
 * lib/attraction-search.ts: substring-scoring the two together ranked the
 * Promenade des Anglais as a strong hit for "Rome", because "P-rome-nade"
 * contains it, and a search for Rome opened in Nice.
 */
export function listRank(query: string, city: string, name: string): number {
  const nq = normalize(query);
  if (!nq) return 0;
  if (normalize(city) === nq) return 0;
  if (normalize(city).startsWith(nq)) return 1;
  if (normalize(name).includes(nq)) return 2;
  return 3;
}
