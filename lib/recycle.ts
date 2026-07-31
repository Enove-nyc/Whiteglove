/**
 * What was deleted, and how to get it back.
 *
 * Every "Remove" in the admin is final and sits next to "Edit". A shomer's
 * number took a phone call to get; a burial took somebody reading a matzeivah.
 * One mis-tap and it is gone, with nothing anywhere that says it ever existed
 * — the row simply is not in the list any more, and nobody can tell whether it
 * was deleted or never entered.
 *
 * So a deletion now leaves the record behind for a month, with the day it
 * happened and a way to put it back exactly as it was.
 *
 * WHAT IS NOT IN HERE, and why: pictures. A photograph on this site is stored
 * as the picture itself, up to about 600KB a time, and fifty of those would be
 * a private store full of deleted images. A deleted picture is also a visible
 * act — the thumbnail goes — where a deleted phone number is a row quietly
 * missing from a list. The screen says so rather than leaving somebody to find
 * out by looking for one.
 */

export const RECYCLE_KINDS = ["contact", "cemetery-contact", "burial", "listing", "business", "advertisement"] as const;
export type RecycleKind = (typeof RECYCLE_KINDS)[number];

export const KIND_WORDS: Record<RecycleKind, { one: string; where: string }> = {
  contact: { one: "Contact", where: "on a town" },
  "cemetery-contact": { one: "Shomer or contact", where: "on a beis hachaim" },
  burial: { one: "Kever", where: "on a beis hachaim" },
  listing: { one: "Listing", where: "on a town" },
  business: { one: "Business", where: "in the directory" },
  advertisement: { one: "Advertisement", where: "" },
};

/**
 * Which part of the admin each kind belongs to.
 *
 * The bin holds things from two different areas, and somebody granted only the
 * directory has no business reading what advertisement was deleted. Kept as
 * plain strings so this file stays free of the permissions module — the screen
 * joins the two.
 */
export const KIND_AREA: Record<RecycleKind, "directory" | "advertisements"> = {
  contact: "directory",
  "cemetery-contact": "directory",
  burial: "directory",
  listing: "directory",
  business: "directory",
  advertisement: "advertisements",
};

/** How long a deletion is kept, and how many at once. */
export const KEEP_DAYS = 30;
export const KEEP_COUNT = 50;

export type Deleted = {
  /** The bin entry's own id. */
  id: string;
  kind: RecycleKind;
  /** The id the row had, so it comes back as itself rather than as a copy. */
  rowId: string;
  /** How it reads in the list. */
  title: string;
  /** A second line — the town, the beis hachaim, the phone number. */
  detail?: string;
  /** ISO timestamp. */
  deletedAt: string;
  /** Everything needed to write it back. */
  payload: Record<string, unknown>;
};

/** Days between an ISO timestamp and a YYYY-MM-DD day, or null. */
function daysOld(deletedAt: string, today: string): number | null {
  const then = Date.parse(deletedAt);
  const now = Date.parse(`${today}T23:59:59Z`);
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.floor((now - then) / 86_400_000);
}

/**
 * What the bin still holds: newest first, nothing older than a month, and no
 * more than fifty.
 *
 * An entry with an unreadable date is DROPPED rather than kept forever. The
 * alternative is an entry nobody can age out, sitting at the bottom of the
 * list until somebody clears the store by hand.
 */
export function stillKept(rows: Deleted[], today: string): Deleted[] {
  return rows
    .filter((row) => {
      const age = daysOld(row.deletedAt, today);
      return age !== null && age <= KEEP_DAYS;
    })
    .sort((a, b) => b.deletedAt.localeCompare(a.deletedAt))
    .slice(0, KEEP_COUNT);
}

/** Entries that have aged out or fallen off the end — the ones to forget. */
export function expired(rows: Deleted[], today: string): Deleted[] {
  const keeping = new Set(stillKept(rows, today).map((row) => row.id));
  return rows.filter((row) => !keeping.has(row.id));
}

/** How long ago, in the words somebody would use. */
export function ageWords(deletedAt: string, today: string): string {
  const age = daysOld(deletedAt, today);
  if (age === null) return "at some point";
  if (age <= 0) return "today";
  if (age === 1) return "yesterday";
  if (age < 14) return `${age} days ago`;
  return `${Math.round(age / 7)} weeks ago`;
}

/** How many days are left before it is forgotten for good. */
export function daysLeft(deletedAt: string, today: string): number {
  const age = daysOld(deletedAt, today);
  if (age === null) return 0;
  return Math.max(0, KEEP_DAYS - age);
}

/** The line under the title in the list. */
export function describeDeleted(row: Deleted, today: string): string {
  const words = KIND_WORDS[row.kind];
  const left = daysLeft(row.deletedAt, today);
  const kept = left === 0 ? "gone after today" : left === 1 ? "kept one more day" : `kept ${left} more days`;
  return [words.one, words.where, `deleted ${ageWords(row.deletedAt, today)}`, kept].filter(Boolean).join(" · ");
}

/**
 * Grouped by what they are, for a screen that would otherwise be a long
 * undifferentiated list. Empty groups are left out.
 */
export function groupedByKind(rows: Deleted[]): Array<{ kind: RecycleKind; rows: Deleted[] }> {
  return RECYCLE_KINDS.map((kind) => ({ kind, rows: rows.filter((row) => row.kind === kind) })).filter(
    (group) => group.rows.length > 0,
  );
}

/** The one sentence at the top of the screen. */
export function binSummary(rows: Deleted[]): string {
  if (!rows.length) return "Nothing has been deleted in the last month.";
  const n = rows.length;
  return `${n === 1 ? "One thing" : `${n} things`} deleted in the last ${KEEP_DAYS} days. Anything here can be put back exactly as it was.`;
}
