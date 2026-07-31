/**
 * What people came looking for, set against what the site actually has.
 *
 * The completeness queue already says what is empty: 111 destinations with
 * nothing published, 141 batei hachaim with no checked coordinate. It is
 * honest and it is useless on its own, because it says the same thing about
 * all of them and nobody can fill in three hundred records. Sorted
 * alphabetically, the first afternoon's work goes into towns nobody has ever
 * opened.
 *
 * This is the other half. Two questions the site can already answer and has
 * never been asked:
 *
 *   • Which empty pages do people keep opening? — fill those first.
 *   • What did people search for and find nothing? — those may not exist here
 *     at all, and no completeness queue can list a record that was never
 *     created.
 *
 * NOTHING HERE IS A SCORE. It is a reading order. A page with no visits is not
 * a bad page, it is a page nobody has opened SINCE COUNTING BEGAN, which for a
 * site that has just connected its store is every page. So an unvisited page
 * is never ranked or scolded — it is counted and left alone.
 */

/** One line of the visit log: a path and how many times it was opened. */
export type Visited = { path: string; visits: number };

/** One record the site holds, and whether anything has been entered on it. */
export type Held = {
  /** The public path, exactly as the visit log spells it. */
  path: string;
  title: string;
  kind: "town" | "beis hachaim";
  /** True when there is something on the page beyond its name. */
  filled: boolean;
  /** What is missing, in the words somebody would use. Empty when filled. */
  missing: string;
  /** Where to go and fix it. */
  editHref: string;
};

export type Gap = Held & {
  visits: number;
};

/**
 * Empty records, most-opened first.
 *
 * A record with no recorded visits is left out rather than ranked last: zero
 * visits means nobody has opened it since counting began, which is a different
 * statement from "people looked and there was nothing there". Mixing the two
 * would put a page nobody has heard of above one twenty people have opened,
 * just because both say zero.
 */
export function emptyAndWanted(held: Held[], visited: Visited[]): Gap[] {
  const counts = new Map(visited.map((row) => [row.path, row.visits]));
  return held
    .filter((record) => !record.filled)
    .map((record) => ({ ...record, visits: counts.get(record.path) ?? 0 }))
    .filter((record) => record.visits > 0)
    .sort((a, b) => b.visits - a.visits || a.title.localeCompare(b.title));
}

/** Empty records nobody has opened yet. Counted, never ranked. */
export function emptyAndUnvisited(held: Held[], visited: Visited[]): number {
  const counts = new Map(visited.map((row) => [row.path, row.visits]));
  return held.filter((record) => !record.filled && !counts.get(record.path)).length;
}

/**
 * Records that are filled in and that people open. The work that paid.
 *
 * Here because a screen that only lists failures reads as a rebuke, and
 * because it answers the question the other lists raise — is any of this
 * worth doing? — with the site's own numbers rather than encouragement.
 */
export function filledAndWanted(held: Held[], visited: Visited[]): Gap[] {
  const counts = new Map(visited.map((row) => [row.path, row.visits]));
  return held
    .filter((record) => record.filled)
    .map((record) => ({ ...record, visits: counts.get(record.path) ?? 0 }))
    .filter((record) => record.visits > 0)
    .sort((a, b) => b.visits - a.visits || a.title.localeCompare(b.title));
}

export type MissingThing = {
  term: string;
  times: number;
  /** What it looks like somebody wanted, when the words give it away. */
  guess: "a kever or a person" | "a town" | null;
};

/**
 * What people searched for and were shown nothing.
 *
 * Counted at the moment it happened — the visitor saw an empty dropdown and
 * that is what was recorded. It is not re-derived here by running the search
 * again, because the matching changes and then the report would disagree with
 * what the person was actually shown.
 *
 * The guess is a hint for the owner's eye, not a decision: a term with "rebbe"
 * or "reb" in it is somebody looking for a person. It is null far more often
 * than not, and null is the honest answer.
 */
export function missingThings(searches: Array<{ label: string; count: number }>, limit = 25): MissingThing[] {
  return searches
    .map((row) => ({ term: row.label, times: row.count, guess: guessAt(row.label) }))
    .sort((a, b) => b.times - a.times || a.term.localeCompare(b.term))
    .slice(0, limit);
}

const PERSON_WORDS = /\b(rebbe|reb|rabbi|rav|admor|ba'?al|baal|kever|ohel|tzadik|tzaddik|zt"?l|ztl)\b/i;
const PLACE_WORDS = /\b(kosher|hotel|minyan|mikve|mikveh|shul|beis|bais|cemetery|hachaim|chaim)\b/i;

function guessAt(term: string): MissingThing["guess"] {
  if (PERSON_WORDS.test(term)) return "a kever or a person";
  if (PLACE_WORDS.test(term)) return "a town";
  return null;
}

export type DemandReport = {
  /** False when the private store is not connected — no numbers at all. */
  counting: boolean;
  /** Empty records people keep opening. Do these first. */
  fillFirst: Gap[];
  /** Empty records nobody has opened. Counted, so the list is not mistaken for all of them. */
  emptyUnvisited: number;
  /** Searches that found nothing. */
  missing: MissingThing[];
  /** The pages the work has already paid for. */
  paying: Gap[];
  /** The one sentence at the top. */
  says: string;
};

export function demandReport(input: {
  counting: boolean;
  held: Held[];
  visited: Visited[];
  emptySearches: Array<{ label: string; count: number }>;
}): DemandReport {
  const fillFirst = emptyAndWanted(input.held, input.visited);
  const emptyUnvisited = emptyAndUnvisited(input.held, input.visited);
  const missing = missingThings(input.emptySearches);
  const paying = filledAndWanted(input.held, input.visited);

  const says = !input.counting
    ? "Nothing is being counted yet, so there is nothing to read here. Connect the private store and this fills in on its own."
    : !fillFirst.length && !missing.length
      ? "Nothing yet. Either nobody has been looking, or everything they looked for was there."
      : fillFirst.length
        ? `${fillFirst.length === 1 ? "One page people open" : `${fillFirst.length} pages people open`} still ${fillFirst.length === 1 ? "has" : "have"} nothing on ${fillFirst.length === 1 ? "it" : "them"}. Start at the top.`
        : `${missing.length === 1 ? "One thing was" : `${missing.length} things were`} searched for and not found here.`;

  return { counting: input.counting, fillFirst, emptyUnvisited, missing, paying, says };
}

// ---- Turning what the site holds into the shape above ----------------

/** What a town is missing, in the words somebody would use. */
export function townMissing(facts: { sections: string[]; photos: number; contacts: number }): string {
  const gaps: string[] = [];
  if (!facts.sections.length) gaps.push("nothing published at all");
  if (!facts.photos) gaps.push("no pictures");
  if (!facts.contacts) gaps.push("nobody to call");
  return gaps.join(", ");
}

/** What a beis hachaim is missing. Getting in comes first — it stops the visit. */
export function keverMissing(facts: {
  burials: number;
  burialsWithCoordinates: number;
  contacts: number;
  hasLocation: boolean;
  hasAccessNote: boolean;
}): string {
  // A record with none of it reads better as one sentence than as four
  // complaints. Four clauses do not tell somebody more than "nothing" does;
  // they just take longer to read and make the list look like a scolding.
  if (!facts.contacts && !facts.hasLocation && !facts.hasAccessNote && !facts.burialsWithCoordinates) {
    return "nothing checked on it yet";
  }
  const gaps: string[] = [];
  if (!facts.contacts) gaps.push("nobody on file to let you in");
  if (!facts.hasLocation) gaps.push("no address or coordinate");
  if (facts.burials && !facts.burialsWithCoordinates) gaps.push("no checked grave coordinate");
  if (!facts.burials) gaps.push("nobody recorded as buried there");
  else if (!facts.hasAccessNote) gaps.push("nothing written about getting in");
  return gaps.join(", ");
}
