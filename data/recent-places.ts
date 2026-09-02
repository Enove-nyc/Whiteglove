/**
 * WHERE SOMEBODY HAD GOT TO — the few places they were last looking at.
 *
 * Planning a trip happens over a fortnight, on a phone in the evening and a
 * laptop at the weekend, and the site started from nothing every time. This is
 * the short list that lets somebody pick the thread back up, and it is the
 * reason it matters that it lives on the account rather than in one browser.
 *
 * IT IS NOT A PREFERENCE, AND NEVER BECOMES ONE. Looking at Rome twice is not
 * a standing preference for Italy. This list is never read into
 * data/travel-preferences.ts, never sent to an assistant, and never used to
 * decide what anybody is shown — it is a way back to a page, and nothing else
 * is built on top of it. Those two things are kept apart deliberately: one is
 * what somebody told us, the other is only where they have been.
 *
 * IT IS SHORT ON PURPOSE. Eight, and a fortnight. Long enough to find last
 * weekend's page, too short to be a record of anybody's reading. A history
 * nobody asked for is worth less than the trust it costs.
 *
 * Pure: what is kept and what falls off can be tested without a store.
 */

/** Enough to find your way back. Not a log. */
export const MAX_RECENT = 8;

/** After this, somebody has moved on. */
export const RECENT_KEEP_DAYS = 14;

export type RecentPlace = {
  /** The path on this site. Also the identity — one page is one entry. */
  href: string;
  /** What to call it in the list. */
  name: string;
  /** "Kraków, Poland" — enough to tell two similar names apart. */
  where: string;
  /** When it was last opened, ISO. */
  at: string;
};

export function isStale(entry: RecentPlace, now: string): boolean {
  const at = Date.parse(entry.at);
  const then = Date.parse(now);
  if (Number.isNaN(at) || Number.isNaN(then)) return true;
  return then - at > RECENT_KEEP_DAYS * 24 * 60 * 60 * 1000;
}

/** Only a path on this site. Never an absolute URL, never a protocol. */
export function usableHref(href: string): boolean {
  const value = href?.trim() ?? "";
  return value.startsWith("/") && !value.startsWith("//") && value.length <= 300;
}

/**
 * Fold one visit into the list.
 *
 * Opening the same page again moves it to the front rather than adding a
 * second row — the list is places, not visits, which is the difference between
 * finding your way back and being counted.
 */
export function withVisit(entries: readonly RecentPlace[], entry: RecentPlace, now: string): RecentPlace[] {
  if (!usableHref(entry.href) || !entry.name.trim()) return [...entries];
  const rest = entries.filter((e) => e.href !== entry.href && !isStale(e, now));
  return [{ ...entry, name: entry.name.trim().slice(0, 120), where: entry.where.trim().slice(0, 120) }, ...rest].slice(0, MAX_RECENT);
}

/** What to show, newest first, with anything gone stale left out. */
export function recentToShow(entries: readonly RecentPlace[], now: string): RecentPlace[] {
  return entries.filter((e) => !isStale(e, now) && usableHref(e.href)).slice(0, MAX_RECENT);
}
