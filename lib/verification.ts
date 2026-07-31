import type { DestinationRecord, PracticalSection, VerificationStatus } from "@/data/destination-database";
import { DESTINATION_SECTIONS, LEGACY_RECORD_SECTIONS } from "@/lib/destination-sections";

/**
 * How much a visitor should trust what a page says, and how much work a
 * record still needs.
 *
 * These are two different questions and they get two different answers. A
 * visitor is told what has been checked and when — "Verified on 3 March 2026"
 * — because that is what decides whether they drive four hours on the
 * strength of it. They are never shown a percentage: "62% complete" tells
 * nobody anything about whether the mikvah is open, and a number attached to
 * a kever reads as a rating of the kever.
 *
 * The percentage is for the admin, where it is a work queue: which records are
 * thinnest, and exactly which fields are missing from each.
 */

/** What a visitor sees, in plain words. */
export type TrustLabel = {
  level: VerificationStatus;
  /** "Verified on 3 March 2026", "Update in progress", … */
  text: string;
  /** Not colour — a glyph, so the state survives being unable to see colour. */
  glyph: string;
  tone: "verified" | "partial" | "community" | "pending" | "empty";
};

function formatDate(iso?: string): string | null {
  if (!iso) return null;
  // Accepts a plain YYYY-MM-DD. Parsed as UTC noon so a timezone cannot roll
  // the date back a day, which is how "checked yesterday" appears on a page.
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/**
 * The label for one section of a destination.
 *
 * `lastChecked` only ever appears next to "Verified". A date beside "being
 * checked" reads as though the checking finished on that date, which is the
 * opposite of what it means.
 */
export function trustLabel(section: Pick<PracticalSection, "status" | "lastChecked">): TrustLabel {
  switch (section.status) {
    case "verified": {
      const on = formatDate(section.lastChecked);
      return { level: "verified", text: on ? `Verified on ${on}` : "Verified", glyph: "✓", tone: "verified" };
    }
    case "partial":
      return { level: "partial", text: "Partially verified", glyph: "◐", tone: "partial" };
    case "community":
      return { level: "community", text: "Community-submitted", glyph: "◇", tone: "community" };
    case "needs-verification":
      return { level: "needs-verification", text: "Update in progress", glyph: "…", tone: "pending" };
    default:
      return { level: "unavailable", text: "Not published yet", glyph: "—", tone: "empty" };
  }
}

const SECTION_KEYS = ["accommodations", "kosherFood", "minyanim", "mikvaos", "transport"] as const;

/**
 * One label for a whole destination, from the sections it holds.
 *
 * Deliberately pessimistic. A page where one section is checked and four are
 * placeholders is "partially verified", not "verified" — the visitor is being
 * told how much of the page they can lean on, and rounding that up is exactly
 * the failure the labels exist to prevent.
 */
export function destinationTrust(record: DestinationRecord): TrustLabel {
  const sections = SECTION_KEYS.map((key) => record[key]);
  const published = sections.filter((section) => section.status !== "unavailable");
  if (published.length === 0) {
    // Nothing practical published. If a cemetery record is checked, the page
    // still has something solid on it, and saying "not published" over a
    // verified kever would be wrong.
    const anyCemetery = record.cemeteries.some((cemetery) => cemetery.status === "verified");
    return anyCemetery
      ? { level: "partial", text: "Partially verified", glyph: "◐", tone: "partial" }
      : { level: "needs-verification", text: "Update in progress", glyph: "…", tone: "pending" };
  }
  if (published.some((section) => section.status === "community")) {
    return { level: "community", text: "Community-submitted", glyph: "◇", tone: "community" };
  }
  const allVerified = published.length === sections.length && published.every((section) => section.status === "verified");
  if (allVerified) {
    // The oldest check is the honest one to show: the page is only as current
    // as its stalest section.
    const dates = published.map((section) => section.lastChecked).filter((value): value is string => Boolean(value)).sort();
    return trustLabel({ status: "verified", lastChecked: dates[0] });
  }
  if (published.some((section) => section.status === "verified")) {
    return { level: "partial", text: "Partially verified", glyph: "◐", tone: "partial" };
  }
  return { level: "needs-verification", text: "Update in progress", glyph: "…", tone: "pending" };
}

/**
 * Every field a destination record is meant to carry.
 *
 * The practical sections are no longer typed out here. They come from
 * lib/destination-sections.ts, which is the same list the admin editor offers
 * and the public page renders — so a section can never again be editable but
 * uncounted, or counted but with nowhere to put it.
 *
 * `tracked: false` means this record type has nowhere to read the answer from.
 * It is still counted as missing, because it IS missing; it is listed apart so
 * the admin can tell "nobody has filled this in" from "the record cannot hold
 * it yet". The five that used to be hardcoded here — Tefillos, Shabbos,
 * Hospital, Emergency, Photos — are now four sections plus photos, and the
 * four are named by the shared list rather than by hand.
 */
const CEMETERY_FIELDS: Array<{ label: string; tracked: boolean; has?: (record: DestinationRecord) => boolean }> = [
  { label: "Address", tracked: true, has: (r) => r.cemeteries.some((c) => Boolean(c.address?.trim())) },
  { label: "Exact coordinates", tracked: true, has: (r) => r.cemeteries.some((c) => Boolean(c.coordinates?.trim())) },
  { label: "Navigation link", tracked: true, has: (r) => r.cemeteries.some((c) => Boolean(c.coordinates?.trim() || c.address?.trim())) },
  { label: "Cemetery", tracked: true, has: (r) => r.cemeteries.length > 0 },
  { label: "Tzaddikim", tracked: true, has: (r) => r.cemeteries.some((c) => c.burials.length > 0) },
  { label: "Access instructions", tracked: true, has: (r) => r.cemeteries.some((c) => c.arrivalNotes.length > 0) },
  { label: "Shomer or local contact", tracked: true, has: (r) => r.cemeteries.some((c) => c.shomerContacts.length > 0) },
  { label: "Sources", tracked: true, has: (r) => r.cemeteries.some((c) => Boolean(c.sourceUrl)) },
  { label: "Verification status", tracked: true, has: (r) => r.cemeteries.some((c) => c.status === "verified") || SECTION_KEYS.some((k) => r[k].status !== "unavailable") },
  { label: "Last verified date", tracked: true, has: (r) => Boolean(r.lastChecked) || SECTION_KEYS.some((k) => Boolean(r[k].lastChecked)) },
];

/** One entry per practical section, from the shared list. */
const SECTION_FIELDS = DESTINATION_SECTIONS.map((section) => {
  const legacy = LEGACY_RECORD_SECTIONS[section.key];
  return legacy
    ? { label: section.label, tracked: true, has: (r: DestinationRecord) => r[legacy].status !== "unavailable" }
    : { label: section.label, tracked: false };
});

const FIELDS: Array<{ label: string; tracked: boolean; has?: (record: DestinationRecord) => boolean }> = [
  ...CEMETERY_FIELDS,
  ...SECTION_FIELDS,
  // Not a section. Photos hang off the destination and the cemetery, and the
  // static record has none.
  { label: "Photos", tracked: false },
];

export type Completeness = {
  /** 0–100, admin only. Never rendered on a public page. */
  score: number;
  filled: number;
  total: number;
  /** Fields the record could hold and does not. This is the work. */
  missing: string[];
  /** Fields the schema has nowhere to put yet. This is the roadmap. */
  notTracked: string[];
};

/** How complete one destination record is, against the content standard. */
export function completeness(record: DestinationRecord): Completeness {
  const missing: string[] = [];
  const notTracked: string[] = [];
  let filled = 0;

  for (const field of FIELDS) {
    if (!field.tracked) {
      notTracked.push(field.label);
      continue;
    }
    if (field.has?.(record)) filled += 1;
    else missing.push(field.label);
  }

  return {
    score: Math.round((filled / FIELDS.length) * 100),
    filled,
    total: FIELDS.length,
    missing,
    notTracked,
  };
}
