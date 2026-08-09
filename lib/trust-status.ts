/**
 * One set of words for "how much of this has anybody checked".
 *
 * THE SITE HAD FOUR ANSWERS TO THE SAME QUESTION, in four vocabularies. A
 * destination section was `verified | partial | community | needs-verification
 * | unavailable`. A hotel's kashrus was `none | reported | confirmed`. A
 * restaurant's hechsher was `certified | reported | none | unverified`. A
 * cemetery record used the first set again. Each was reasonable where it was
 * written, and a traveler moving between three pages met three scales and had
 * to work out for themselves whether "reported" was better or worse than
 * "partially verified".
 *
 * So this is the presentation layer over all of them: four labels, in plain
 * words, that mean the same thing everywhere they appear.
 *
 *   Verified               — somebody here checked it, and when.
 *   Reported               — a source says so; nobody here has confirmed it.
 *   Being checked          — we are working on it. Do not lean on it yet.
 *   Reconfirm before travel — true when it was written and the kind of thing
 *                             that changes: a phone number, a season, an
 *                             arrangement to be let in.
 *
 * THE FOURTH IS NOT A WEAKER "VERIFIED". It is an instruction, and it is the
 * one that stops somebody standing at a gate at four in the afternoon holding
 * a number that was right last year. It is used for facts that go stale on
 * their own, whatever their state when they were written down.
 *
 * WHAT IS DELIBERATELY NOT HERE: a percentage, a star, or a score. "62%
 * complete" tells a traveler nothing about whether the mikvah is open, and a
 * number attached to a kever reads as a rating of the kever. The completeness
 * score in lib/verification.ts stays where it is — in the admin, as a work
 * queue.
 *
 * The existing scales are not replaced. lib/verification.ts still answers what
 * a record holds; this module answers what to print, and maps every scale onto
 * it in one place so a new one cannot quietly invent a fifth vocabulary.
 */

import type { VerificationStatus } from "@/data/destination-database";
import type { TrustLabel } from "@/lib/verification";

export type TrustLevel = "verified" | "reported" | "being-checked" | "reconfirm";

export type TrustTone = "verified" | "reported" | "pending" | "caution";

export type TrustDescriptor = {
  level: TrustLevel;
  /** What the badge says. */
  label: string;
  /**
   * Never colour alone.
   *
   * A glyph as well as a tint, because the whole point of these four is to be
   * distinguishable, and roughly one man in twelve cannot separate the amber
   * from the green. The glyph is `aria-hidden` where the label is read out.
   */
  glyph: string;
  tone: TrustTone;
  /** What it means, in a sentence, for somebody who has never seen the scale. */
  meaning: string;
  /** What to do about it. Empty for "verified", where there is nothing to do. */
  action: string;
};

export const TRUST_LEVELS: Record<TrustLevel, TrustDescriptor> = {
  verified: {
    level: "verified",
    label: "Verified",
    glyph: "✓",
    tone: "verified",
    meaning: "Somebody here checked this against the place itself or its own published source.",
    action: "",
  },
  reported: {
    level: "reported",
    label: "Reported",
    glyph: "◇",
    tone: "reported",
    meaning: "A source says so — a directory, a community list, or a traveler — and nobody here has confirmed it.",
    action: "Treat it as a lead rather than a fact, and confirm it before you rely on it.",
  },
  "being-checked": {
    level: "being-checked",
    label: "Being checked",
    glyph: "…",
    tone: "pending",
    meaning: "This is on our list and the checking is not finished. What is shown may be incomplete.",
    action: "Do not plan around it yet. Ask us and we will tell you where it has got to.",
  },
  reconfirm: {
    level: "reconfirm",
    label: "Reconfirm before travel",
    glyph: "!",
    tone: "caution",
    meaning: "This was right when it was written and it is the kind of thing that changes without notice.",
    action: "Ring ahead, or check the source link, close to your dates.",
  },
};

/** The four, in the order they are explained on the methodology page. */
export const TRUST_ORDER: readonly TrustLevel[] = ["verified", "reported", "being-checked", "reconfirm"] as const;

/** Where the four are explained. Every badge links here. */
export const TRUST_METHODOLOGY_PATH = "/verification";

/**
 * Tailwind classes per tone.
 *
 * Kept beside the words so a new badge cannot invent its own palette. Every
 * combination here was chosen to clear 4.5:1 against the cream and white the
 * site puts them on — amber-800 rather than amber-500, stone-600 rather than
 * stone-400.
 */
export const TRUST_CLASSES: Record<TrustTone, { text: string; border: string; background: string }> = {
  verified: { text: "text-emerald-900", border: "border-emerald-700", background: "bg-emerald-50" },
  reported: { text: "text-amber-900", border: "border-amber-600", background: "bg-amber-50" },
  pending: { text: "text-stone-700", border: "border-stone-400", background: "bg-stone-100" },
  caution: { text: "text-[var(--navy)]", border: "border-[var(--gold)]", background: "bg-[#fcf6e9]" },
};

/**
 * A date said the way a person says it, or null.
 *
 * Parsed at UTC noon so a timezone cannot roll the date back a day and turn
 * "checked today" into "checked yesterday" — the same rule, and the same
 * reason, as lib/verification.ts.
 */
export function checkedOn(iso?: string | null): string | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso.trim());
  if (!match) return null;
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

/**
 * The five-way record status as one of the four.
 *
 * `unavailable` returns null on purpose. "Nothing has been published here" is
 * not a statement about accuracy, and a badge saying so under an empty section
 * is a label with no subject. The caller shows an empty state instead.
 */
export function fromRecordStatus(status: VerificationStatus): TrustDescriptor | null {
  switch (status) {
    case "verified":
      return TRUST_LEVELS.verified;
    // Somebody sent it in. That is exactly "a source says so, nobody here has
    // confirmed it", which is what Reported means.
    case "community":
      return TRUST_LEVELS.reported;
    // Part of it is checked and part is not, which for the person reading it
    // is the same instruction as an unfinished one: the checking is not done.
    case "partial":
    case "needs-verification":
      return TRUST_LEVELS["being-checked"];
    default:
      return null;
  }
}

/** The label lib/verification.ts already worked out, mapped onto the four. */
export function fromTrustLabel(label: TrustLabel): TrustDescriptor | null {
  return fromRecordStatus(label.level);
}

/** What a hotel claims about kashrus (`data/kosher-stays.ts`). */
export function fromKosherClaim(claim: "none" | "reported" | "confirmed"): TrustDescriptor | null {
  if (claim === "confirmed") return TRUST_LEVELS.verified;
  if (claim === "reported") return TRUST_LEVELS.reported;
  // A hotel that makes no kosher claim is not an unverified kosher hotel. It
  // is a hotel. A badge here would be a doubt about something that was never
  // asserted — see the note at the top of data/kosher-stays.ts.
  return null;
}

/** What an eatery's hechsher state amounts to (`data/hechsherim.ts`). */
export function fromHechsherState(state: "certified" | "reported" | "none" | "unverified"): TrustDescriptor | null {
  if (state === "certified") return TRUST_LEVELS.verified;
  if (state === "reported") return TRUST_LEVELS.reported;
  if (state === "unverified") return TRUST_LEVELS["being-checked"];
  return null;
}

/**
 * The standing instruction, for a fact that goes stale on its own.
 *
 * Phone numbers, seasonal kosher programmes, whoever holds the key, opening
 * arrangements. Not a downgrade of "verified" — a verified phone number and a
 * reconfirm-before-travel phone number are the same number, and the second is
 * telling you what to do with it in four months' time.
 */
export function reconfirmBeforeTravel(): TrustDescriptor {
  return TRUST_LEVELS.reconfirm;
}

/**
 * The sentence under a badge: the label, the date where there is one, and what
 * to do about it.
 *
 * One function so the badge, the destination page and a screen reader all get
 * the same sentence rather than three near-copies.
 */
export function describeTrust(descriptor: TrustDescriptor, lastChecked?: string | null): string {
  const on = descriptor.level === "verified" ? checkedOn(lastChecked) : null;
  const opening = on ? `Verified on ${on}.` : `${descriptor.label}.`;
  return [opening, descriptor.meaning, descriptor.action].filter(Boolean).join(" ");
}

/** "Verified on 3 March 2026" / "Being checked" — the badge's own text. */
export function trustText(descriptor: TrustDescriptor, lastChecked?: string | null): string {
  const on = descriptor.level === "verified" ? checkedOn(lastChecked) : null;
  return on ? `Verified on ${on}` : descriptor.label;
}
