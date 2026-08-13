/**
 * What changed on the site, what it said before, and who changed it.
 *
 * The recycle bin covers a deletion. It does not cover the other way to lose
 * something, which is more common and quieter: saving over it. Somebody
 * retypes a shomer's number with a digit wrong, or pastes a shorter overview
 * over a longer one, and the old wording is gone with nothing to compare
 * against. There was no record anywhere that a page had ever said anything
 * else — no history, and no answer to "who changed this".
 *
 * ONLY THE FIELDS THAT ACTUALLY DIFFER are recorded. Saving a form writes
 * every field it holds, so a record of "the save" would say fourteen things
 * changed when the owner corrected one telephone digit, and the one real
 * change would be impossible to find.
 *
 * A CHANGE WITH NOTHING IN IT IS NOT RECORDED AT ALL. Pressing save without
 * typing anything is not history; a log full of those is a log nobody reads.
 */

export const CHANGE_KINDS = ["town", "page", "listing", "contact", "cemetery-contact", "burial", "business", "link"] as const;
export type ChangeKind = (typeof CHANGE_KINDS)[number];

export const CHANGE_WORDS: Record<ChangeKind, string> = {
  town: "Town",
  page: "Page",
  listing: "Listing",
  contact: "Contact",
  "cemetery-contact": "Shomer or contact",
  burial: "Kever",
  business: "Business",
  link: "Useful link",
};

/** Which part of the admin each kind belongs to, so the log can be narrowed. */
export const CHANGE_AREA: Record<ChangeKind, "content" | "directory"> = {
  town: "directory",
  page: "content",
  listing: "directory",
  contact: "directory",
  "cemetery-contact": "directory",
  burial: "directory",
  business: "directory",
  link: "directory",
};

/** How long a change is kept, and how many at once. */
export const KEEP_DAYS = 30;
export const KEEP_COUNT = 120;

export type FieldChange = {
  field: string;
  /** What it said before. Null means it was empty. */
  before: string | null;
  after: string | null;
};

export type Change = {
  id: string;
  kind: ChangeKind;
  /** The row's id or slug — whatever puts it back. */
  rowId: string;
  /** How it reads in the list. */
  title: string;
  /** Who did it: an email, or the shared password. */
  who: string;
  /** ISO timestamp. */
  at: string;
  fields: FieldChange[];
};

/** Fields nobody wants in a history: bookkeeping the site writes itself. */
const IGNORED = new Set(["id", "slug", "createdAt", "updatedAt", "lastVerified", "sortOrder"]);

/** A value as the log stores it: a string, or null for nothing. */
function asText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.length ? value.join(", ") : null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  const text = String(value).trim();
  return text.length ? text : null;
}

/**
 * What actually differs between what was there and what was saved.
 *
 * Compared as the text a person would see, so `null`, `""` and `undefined` are
 * one thing — "nothing" — rather than three changes that all read the same on
 * screen.
 *
 * Only keys present in `after` are looked at: a partial update is not a
 * statement that the fields it omits were cleared.
 */
export function fieldsChanged(before: Record<string, unknown>, after: Record<string, unknown>): FieldChange[] {
  const out: FieldChange[] = [];
  for (const [field, value] of Object.entries(after)) {
    if (IGNORED.has(field)) continue;
    // A field the "before" read did not ask about is not a change — it is a
    // field nobody looked at. Without this rule an incomplete `select` in one
    // writer reads as "it was empty and now it is not", which then offers to
    // put it back to empty and fails on a column that cannot be null. A
    // Prisma select returns every field it names, null ones included, so a
    // missing key really does mean "not asked".
    if (!(field in before)) continue;
    const was = asText(before[field]);
    const now = asText(value);
    if (was === now) continue;
    out.push({ field, before: was, after: now });
  }
  return out.sort((a, b) => a.field.localeCompare(b.field));
}

/** A field name as a person would say it: "yiddishCity" → "Yiddish city". */
export function fieldLabel(field: string): string {
  const spaced = field.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

/** Long text is shown short in a list; the whole thing is not the headline. */
export function shorten(value: string | null, limit = 90): string {
  if (value === null) return "nothing";
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length <= limit ? clean : `${clean.slice(0, limit - 1)}…`;
}

/** One line saying what happened: "The phone number changed." */
export function describeChange(change: Change): string {
  if (change.fields.length === 1) return `${fieldLabel(change.fields[0].field)} changed.`;
  return `${change.fields.length} things changed: ${change.fields.map((f) => fieldLabel(f.field).toLowerCase()).join(", ")}.`;
}

function daysOld(at: string, today: string): number | null {
  const then = Date.parse(at);
  const now = Date.parse(`${today}T23:59:59Z`);
  if (Number.isNaN(then) || Number.isNaN(now)) return null;
  return Math.floor((now - then) / 86_400_000);
}

/** How long ago, in the words somebody would use. */
export function whenWords(at: string, today: string): string {
  const days = daysOld(at, today);
  if (days === null) return "at some point";
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return `${days} days ago`;
  return `${Math.round(days / 7)} weeks ago`;
}

/**
 * What the log still holds: newest first, nothing older than a month, no more
 * than the cap. An entry with an unreadable date is dropped rather than kept
 * forever — see the recycle bin for the same reasoning.
 */
export function stillLogged(rows: Change[], today: string): Change[] {
  return rows
    .filter((row) => {
      const age = daysOld(row.at, today);
      return age !== null && age <= KEEP_DAYS;
    })
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, KEEP_COUNT);
}

/** The one sentence at the top. */
export function logSummary(rows: Change[]): string {
  if (!rows.length) return "Nothing has been changed in the last month.";
  const people = new Set(rows.map((row) => row.who));
  const n = rows.length;
  return `${n === 1 ? "One change" : `${n} changes`} in the last ${KEEP_DAYS} days${
    people.size > 1 ? `, by ${people.size} people` : ""
  }. Anything here can be put back to what it said before.`;
}

/** The old values, ready to be written back. */
export function undoValues(change: Change): Record<string, string | null> {
  return Object.fromEntries(change.fields.map((f) => [f.field, f.before]));
}
