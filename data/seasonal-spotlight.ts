/**
 * When a season is worth putting in front of somebody, and when it is not.
 *
 * THE PROBLEM THIS SOLVES IS TIMING, NOT CONTENT. The site already knows which
 * destinations answer Pesach, Sukkos and yeshiva week — the themes are derived
 * from what the destination records say in their own words, and a theme with
 * nothing behind it is already not offered (see YOM_TOV_THEMES in
 * data/vacation-destinations.ts). What was missing is that in the ten weeks
 * when half the questions a traveler has are about Pesach, nothing on the site
 * said so, and in July the same category would have been noise.
 *
 * IT CREATES NOTHING. A spotlight points at a category that already exists and
 * already has destinations in it. If the category is empty the spotlight does
 * not appear, which is the same rule the filter row follows: a chip with
 * nothing behind it is a promise the site cannot keep.
 *
 * IT NEVER CLAIMS A PROGRAMME, A PRICE OR AN AVAILABILITY, and it does not
 * count down. "Going away for Pesach?" is a question about the traveler's plans;
 * "Pesach programmes from $4,000, book by March" is a claim about somebody
 * else's business, and this site does not make those. The window decides WHEN a
 * link appears, never WHAT it says.
 *
 * IT TAKES NO PERMANENT SPACE. Outside its window there is no strip, no chip
 * and no nav entry — the surface is gone rather than dimmed, which is the
 * difference between a seasonal prompt and a category that has quietly become
 * part of the furniture.
 *
 * Pure, and a data file: the windows are worked out from the Jewish calendar in
 * lib/seasonal-calendar.ts and stored in lib/seasonal-windows-store.ts, but
 * which of them is showing right now is arithmetic that can be tested without
 * either.
 */

import type { TripTheme } from "@/data/vacation-destinations";

/**
 * The categories a spotlight may point at.
 *
 * The three derived Yom Tov themes and nothing else. A season — summer, winter
 * — is a filter somebody reaches for deliberately; it is true for a quarter of
 * the year and therefore says nothing when it is highlighted. These three are
 * true for a few weeks and answer a question the traveler is already asking.
 */
export const SPOTLIGHT_KEYS = ["pesach", "sukkos", "yeshiva-week"] as const;
export type SpotlightKey = (typeof SPOTLIGHT_KEYS)[number];

export function isSpotlightKey(value: string): value is SpotlightKey {
  return (SPOTLIGHT_KEYS as readonly string[]).includes(value);
}

/** A spotlight key is always a real trip theme — the compiler holds us to it. */
export const SPOTLIGHT_THEME: Record<SpotlightKey, TripTheme> = {
  pesach: "pesach",
  sukkos: "sukkos",
  "yeshiva-week": "yeshiva-week",
};

export type SeasonalWindow = {
  key: SpotlightKey;
  /** YYYY-MM-DD. */
  startsOn: string;
  /** YYYY-MM-DD, inclusive. */
  endsOn: string;
  /** Off means it never shows, whatever the dates say. */
  active: boolean;
  /** Wins when two windows overlap. At most one can be, and setting a second clears the first. */
  featured: boolean;
  /**
   * The owner's own line in place of the built-in one, or "".
   *
   * Kept to a question about the traveler's plans. There is nothing here to
   * price and no programme to describe — see the note at the top.
   */
  note: string;
  /** True when it came from the Jewish calendar rather than from the owner. */
  derived?: boolean;
};

/** What each key says when the owner has not written his own line. */
export const SPOTLIGHT_COPY: Record<SpotlightKey, { headline: string; blurb: string }> = {
  pesach: {
    headline: "Going away for Pesach?",
    blurb: "The destinations travelers go to for Yom Tov, with what is around them.",
  },
  sukkos: {
    headline: "Going away for Sukkos?",
    blurb: "Where to spend Yom Tov, and what there is to do over Chol Hamoed.",
  },
  "yeshiva-week": {
    headline: "Yeshiva week?",
    blurb: "Short winter trips, and what is open when you get there.",
  },
};

export const SPOTLIGHT_LABEL: Record<SpotlightKey, string> = {
  pesach: "Pesach",
  sukkos: "Sukkos",
  "yeshiva-week": "Yeshiva Week",
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** What stops this window being saved, in the owner's words, or null. */
export function windowProblem(window: Pick<SeasonalWindow, "startsOn" | "endsOn">): string | null {
  if (!DATE.test(window.startsOn)) return "Set the date it starts showing.";
  if (!DATE.test(window.endsOn)) return "Set the date it stops showing.";
  if (window.endsOn < window.startsOn) return "It cannot stop before it starts.";
  return null;
}

/** Dates compare as strings, which sorts correctly for YYYY-MM-DD. */
export function isOpen(window: SeasonalWindow, today: string): boolean {
  return window.active && window.startsOn <= today && today <= window.endsOn;
}

/**
 * The one spotlight to show, or null.
 *
 * ONE, NEVER A ROW OF THEM. Two things shouted at once is nothing shouted, and
 * the point of a seasonal prompt is that it is the thing that matters this
 * month. Featured wins; after that, whichever closes soonest, because it is the
 * one with the least time left to be useful.
 *
 * `hasDestinations` is asked rather than assumed: a window whose category is
 * empty is not shown at all. Passing a predicate keeps this pure — the caller
 * knows what the directory holds, this knows what the calendar says.
 */
export function openSpotlight(
  windows: readonly SeasonalWindow[],
  today: string,
  hasDestinations: (key: SpotlightKey) => boolean,
): SeasonalWindow | null {
  const open = windows.filter((window) => isOpen(window, today) && hasDestinations(window.key));
  if (open.length === 0) return null;
  const featured = open.filter((window) => window.featured);
  const pool = featured.length > 0 ? featured : open;
  return [...pool].sort((a, b) => a.endsOn.localeCompare(b.endsOn) || a.key.localeCompare(b.key))[0];
}

/** For the owner's screen: what is showing, what is coming, what has passed. */
export function sortForAdmin(windows: readonly SeasonalWindow[], today: string): SeasonalWindow[] {
  const rank = (w: SeasonalWindow) => (isOpen(w, today) ? 0 : w.endsOn < today ? 2 : 1);
  return [...windows].sort((a, b) => rank(a) - rank(b) || a.startsOn.localeCompare(b.startsOn));
}
