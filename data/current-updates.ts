/**
 * What is true about a place THIS MONTH, and stops being true on a date.
 *
 * NOT A BLOG, and the shape is what keeps it from becoming one. A restaurant
 * that moved, a minyan running only over Sukkos, an airport counter open for a
 * season — these are the facts that make a directory wrong between one visit
 * and the next, and the reason a traveler rings ahead instead of trusting the
 * page. Each one is a title, a line, what it is about, and the two dates
 * between which it is worth saying.
 *
 * EVERY UPDATE EXPIRES, and that is not optional. The failure this exists to
 * prevent is a "temporary" notice from two Pesachs ago still sitting on a
 * destination page, which is worse than never having said anything: it teaches
 * a reader that the dated information here is not dated at all. So `endsOn` is
 * required, an update stops being shown the moment it passes, and nothing has
 * to be remembered or tidied for that to happen.
 *
 * NOTHING IS DELETED WHEN IT LAPSES. An expired update is still the record of
 * what was true, and the owner may want to bring the same one back next Sukkos.
 * It simply stops being current, which is a question about today's date rather
 * than a state anybody sets.
 *
 * A data file, like the airports and the planner figures: lib/ may read data/
 * and data/ never reads lib/. Everything here is pure, so the rules that decide
 * what a visitor sees can be tested without a store.
 */

/** What an update is about — chosen so a reader knows why they are seeing it. */
export type UpdateKind =
  | "new"
  | "moved"
  | "closed"
  | "temporary-minyan"
  | "seasonal"
  | "travel"
  | "other";

export const UPDATE_KIND_LABEL: Record<UpdateKind, string> = {
  new: "New",
  moved: "Moved",
  closed: "Closed",
  "temporary-minyan": "Temporary minyan",
  seasonal: "Seasonal",
  travel: "Getting there",
  other: "Update",
};

export type CurrentUpdate = {
  id: string;
  kind: UpdateKind;
  /** One line. A headline, not a paragraph. */
  title: string;
  /** A sentence or two at most — the compact rule is enforced in the editor. */
  detail: string;
  /**
   * The destination slug this belongs to, or "" for one that is not about a
   * particular place. An update attached to nothing shows nowhere, which is
   * deliberate: there is no site-wide noticeboard to drift into.
   */
  destinationSlug: string;
  /** YYYY-MM-DD. Before this it is written but not yet shown. */
  startsOn: string;
  /** YYYY-MM-DD. REQUIRED — see the note above. */
  endsOn: string;
  /**
   * Where the owner knows this from. INTERNAL ONLY — never rendered publicly,
   * for the same reason listings carry no source line: a source shown beside a
   * claim reads as an endorsement of whatever it points at. See AGENTS.md.
   */
  source: string;
  /** Nothing reaches a visitor until the owner says so. */
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CurrentUpdateDraft = Omit<CurrentUpdate, "id" | "createdAt" | "updatedAt"> & { id?: string };

/** The longest a detail line may be before it stops being an update. */
export const MAX_DETAIL_CHARS = 240;

export function emptyUpdate(): CurrentUpdateDraft {
  return {
    kind: "other",
    title: "",
    detail: "",
    destinationSlug: "",
    startsOn: "",
    endsOn: "",
    source: "",
    published: false,
  };
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What is stopping this from being published, in the owner's words, or null.
 *
 * Returns the FIRST problem rather than a list, because the editor shows one
 * line under one Save button and a list there is a wall to read rather than a
 * thing to fix.
 */
export function updateProblem(update: CurrentUpdateDraft): string | null {
  if (!update.title.trim()) return "Give it a title — one line saying what changed.";
  if (!update.detail.trim()) return "Say what a traveler needs to know.";
  if (update.detail.trim().length > MAX_DETAIL_CHARS) {
    return `Keep it to ${MAX_DETAIL_CHARS} characters — this is a notice, not an article.`;
  }
  if (!DATE.test(update.startsOn)) return "Set the date it starts being true.";
  if (!DATE.test(update.endsOn)) return "Set the date it stops being true. Every update needs one.";
  if (update.endsOn < update.startsOn) return "It cannot stop before it starts.";
  return null;
}

/** True while today falls inside the window. Dates are compared as strings, which sorts correctly for YYYY-MM-DD. */
export function isCurrent(update: CurrentUpdate, today: string): boolean {
  return update.startsOn <= today && today <= update.endsOn;
}

/** True once it has lapsed — shown to the owner, never to a visitor. */
export function hasExpired(update: CurrentUpdate, today: string): boolean {
  return update.endsOn < today;
}

/**
 * Everything a visitor should see for one destination, right now.
 *
 * Three gates, and all three are needed: published by the owner, inside its
 * own window, and about this place. An update whose window has passed drops
 * out here with nobody having to tidy it.
 */
export function currentUpdatesFor(
  updates: readonly CurrentUpdate[],
  destinationSlug: string,
  today: string,
): CurrentUpdate[] {
  return updates
    .filter((u) => u.published && u.destinationSlug === destinationSlug && isCurrent(u, today))
    .sort(byEndingSoonest);
}

/**
 * Soonest to lapse first.
 *
 * The one ending on Thursday matters more to somebody reading on Tuesday than
 * the one running all season, and ties fall back to the newest so a fresh
 * notice is not buried under an old one that ends the same day.
 */
export function byEndingSoonest(a: CurrentUpdate, b: CurrentUpdate): number {
  if (a.endsOn !== b.endsOn) return a.endsOn.localeCompare(b.endsOn);
  return b.createdAt.localeCompare(a.createdAt);
}

/** For the owner's list: current first, then not yet started, then expired. */
export function sortForAdmin(updates: readonly CurrentUpdate[], today: string): CurrentUpdate[] {
  const rank = (u: CurrentUpdate) => (isCurrent(u, today) ? 0 : hasExpired(u, today) ? 2 : 1);
  return [...updates].sort((a, b) => rank(a) - rank(b) || byEndingSoonest(a, b));
}
