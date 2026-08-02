/**
 * What you typed but had not saved.
 *
 * The admin's forms save when a button is pressed and not before. That is the
 * right way round — a half-typed overview should not be on the website — but
 * it means the twenty minutes somebody spends writing about a town lives
 * nowhere until they press Save. A closed tab, a phone that sleeps, a stray
 * back gesture, and it is gone with nothing to say it ever existed.
 *
 * So while somebody types, what they have typed is kept in their own browser,
 * and offered back when they return.
 *
 * A DRAFT ONLY EXISTS BECAUSE SOMEBODY TYPED. It is written on a real change
 * to the form and cleared the moment a save succeeds, so its presence is the
 * whole test: there is a draft, therefore there is unsaved work. Nothing has
 * to be compared against the record to find that out, and nothing has to
 * guess whether the difference matters.
 *
 * IT IS THE BROWSER'S, NOT THE SITE'S. Never sent anywhere, never in the
 * database, never seen by anybody else — it is the same words, on the same
 * machine, waiting for the person who typed them.
 */

export type Draft = {
  /** ISO timestamp. */
  savedAt: string;
  /** Field name to value, exactly as the form held them. */
  values: Record<string, string>;
};

/**
 * How long a draft is worth offering.
 *
 * A week. Past that the record underneath has probably moved on — somebody
 * else edited it, or the same person did from another machine — and putting
 * week-old words back over it would be a quiet overwrite rather than a rescue.
 */
export const DRAFT_MAX_AGE_DAYS = 7;

/** Where one form's draft lives. Never shared between two records. */
export function draftKey(...parts: Array<string | undefined>): string {
  return `whiteGloveDraft:${parts.filter(Boolean).join(":")}`;
}

/**
 * Fields never kept in a draft.
 *
 * TWO KINDS, AND BOTH SAY WHERE A SAVE GOES.
 *
 * The hidden ones naming WHICH record this is. A draft is stored per record
 * already; carrying the identity in it as well would let a stale draft rewrite
 * which row a save lands on.
 *
 * And React's own, which every form with a server action carries: `$ACTION_KEY`,
 * `$ACTION_REF_2`, `$ACTION_2:0` and the like. They name WHICH ACTION runs and
 * what is bound to it — a worse version of the same mistake, since putting a
 * week-old one back would point Save at whatever that page happened to be. They
 * are also not something a person typed, so a form somebody emptied would look
 * full of them and be offered back as if it held work.
 *
 * Nothing a person types is named `$`-anything, so the prefix is the whole test.
 */
const NEVER_KEPT = new Set(["slug", "id", "destinationId", "contactId", "placeId", "photoId", "cemeteryId", "tripId"]);

function isDraftable(field: string): boolean {
  return !field.startsWith("$") && !NEVER_KEPT.has(field);
}

/**
 * Parse what was stored, or null for anything unreadable.
 *
 * The same fields are dropped here as when writing. Storage is an outside
 * thing — another tab, a browser extension, or an older version of this code
 * put what is in it there — so what comes back is filtered on the way in and
 * not merely trusted because we usually write it ourselves.
 */
export function readDraft(raw: string | null | undefined): Draft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Draft;
    if (!parsed || typeof parsed !== "object" || typeof parsed.savedAt !== "string") return null;
    if (!parsed.values || typeof parsed.values !== "object") return null;
    // Only strings. A form holds text; anything else came from somewhere this
    // did not write, and putting it back into a field would be nonsense.
    const values: Record<string, string> = {};
    for (const [field, value] of Object.entries(parsed.values)) {
      if (typeof value === "string" && isDraftable(field)) values[field] = value;
    }
    return { savedAt: parsed.savedAt, values };
  } catch {
    return null;
  }
}

/** Age in whole hours, or null when the timestamp is not one. */
function hoursOld(savedAt: string, now: number): number | null {
  const then = Date.parse(savedAt);
  if (Number.isNaN(then)) return null;
  return Math.floor((now - then) / 3_600_000);
}

/**
 * Is this worth putting in front of somebody?
 *
 * Three noes: unreadable, older than a week, or holding nothing at all. The
 * last is not pedantry — a form whose only change was clearing a box stores an
 * empty value, and offering to restore nothing reads as a bug.
 */
export function worthOffering(draft: Draft | null, now: number): boolean {
  if (!draft) return false;
  const hours = hoursOld(draft.savedAt, now);
  if (hours === null || hours < 0 || hours > DRAFT_MAX_AGE_DAYS * 24) return false;
  return Object.values(draft.values).some((value) => value.trim().length > 0);
}

/** "from a few minutes ago", "from yesterday". */
export function describeDraft(draft: Draft, now: number): string {
  const hours = hoursOld(draft.savedAt, now);
  if (hours === null) return "from an earlier visit";
  if (hours < 1) {
    const minutes = Math.max(0, Math.floor((now - Date.parse(draft.savedAt)) / 60_000));
    if (minutes < 1) return "from a moment ago";
    return `from ${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (hours < 24) return `from ${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "from yesterday" : `from ${days} days ago`;
}

/**
 * Which fields a draft would change, given what the form holds now.
 *
 * Used to say what restoring would do rather than asking somebody to press a
 * button and find out. A field the form does not have is skipped: the form
 * changed since the draft was written, and writing into a field that is no
 * longer there would do nothing while claiming otherwise.
 */
export function fieldsToRestore(draft: Draft, current: Record<string, string>): string[] {
  return Object.entries(draft.values)
    .filter(([field, value]) => field in current && current[field] !== value)
    .map(([field]) => field)
    .sort();
}

/** What to store out of a form's own values. */
export function draftableValues(entries: Iterable<[string, FormDataEntryValue]>): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [field, value] of entries) {
    if (typeof value === "string" && isDraftable(field)) values[field] = value;
  }
  return values;
}

/**
 * Does the form still hold exactly what it was given?
 *
 * This is what decides whether there is a draft at all. "Somebody typed" is
 * not the test — somebody who types a letter and deletes it has typed, and
 * offering their work back afterwards would be offering them nothing while
 * saying otherwise. "The form no longer matches what it was loaded with" is
 * the test, and it is the same question as "would saving change anything".
 */
export function sameValues(a: Record<string, string>, b: Record<string, string>): boolean {
  const fields = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const field of fields) if ((a[field] ?? "") !== (b[field] ?? "")) return false;
  return true;
}
