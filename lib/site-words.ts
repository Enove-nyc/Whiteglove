/**
 * The owner's words on top of the built-in ones, and where each one shows.
 *
 * The rules only — no store, no React. The point of keeping WHERE EACH ONE
 * SHOWS beside the word itself is that the previous attempt at this failed
 * precisely there: six fields were saved and none of them were read anywhere,
 * and nothing in the code connected the two ends, so nobody noticed. The list
 * below is what the screen renders and what the test checks against the source.
 */

import { BUILT_IN_WORDS, type SiteWords } from "@/data/site-words";

/** Only what the owner actually changed. */
export type StoredWords = Partial<SiteWords>;

export const WORD_KEYS = Object.keys(BUILT_IN_WORDS) as (keyof SiteWords)[];

/**
 * The built-in words with the owner's on top.
 *
 * A stored value that is empty or not a string is DROPPED rather than used.
 * An empty headline is not a decision anybody makes on purpose, and a front
 * page with no words on it is worse than one with the wrong words.
 */
export function mergeWords(stored: StoredWords | null | undefined): SiteWords {
  const merged: SiteWords = { ...BUILT_IN_WORDS };
  if (!stored || typeof stored !== "object") return merged;
  for (const key of WORD_KEYS) {
    const value = stored[key];
    if (typeof value === "string" && value.trim()) merged[key] = value.trim();
  }
  return merged;
}

/** Only what differs from the built-in set, so the store holds decisions. */
export function onlyChangedWords(words: SiteWords): StoredWords {
  const out: StoredWords = {};
  for (const key of WORD_KEYS) {
    if (words[key] !== BUILT_IN_WORDS[key]) Object.assign(out, { [key]: words[key] });
  }
  return out;
}

/* ---- what cannot be saved ----------------------------------------------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Why these words cannot be saved, or null.
 *
 * Deliberately few. These are words, not arithmetic — the owner is allowed to
 * write whatever he likes on his own front page, and a screen that argued with
 * him about a headline would be an insult. Only two things are refused: an
 * empty one, because it puts a blank where a sentence has to be, and an
 * address that is not an address, because it is the one field where a typo
 * means mail silently going nowhere.
 */
export function wordProblem(words: SiteWords): string | null {
  for (const key of WORD_KEYS) {
    if (!words[key]?.trim()) {
      const field = FIELDS.find((f) => f.key === key);
      return `${field?.label ?? key} cannot be empty — it would leave a blank ${field?.where ?? "on the site"}.`;
    }
  }
  if (!EMAIL.test(words.contactEmail.trim())) {
    return "That is not an email address. Every form on the site tells people to write to it, so a typo here means mail going nowhere.";
  }
  return null;
}

/* ---- what each word is, and where it shows ------------------------------ */

export type WordGroup = "front" | "contact" | "footer" | "booking";

export type WordField = {
  key: keyof SiteWords;
  group: WordGroup;
  label: string;
  /** The place on the site this appears. Named, so it can be gone and looked at. */
  where: string;
  /** The page it is on, so the screen can link straight to it. */
  href: string;
  long?: boolean;
};

export const WORD_GROUPS: Array<{ id: WordGroup; title: string; note: string }> = [
  { id: "front", title: "The front page", note: "The first three lines anybody reads, and what the search box invites them to type." },
  {
    id: "contact",
    title: "Getting in touch",
    note: "Shown wherever the site asks somebody to write in. This is the address VISITORS ARE TOLD, and it is not the same setting as the inbox the site delivers its own forms to — that is CONTACT_INBOX, on the connections screen. Changing this one changes what is printed on the page; make sure somebody reads whatever you put here.",
  },
  { id: "footer", title: "The footer", note: "On the bottom of every page." },
  { id: "booking", title: "The booking page", note: "Under the heading on /book." },
];

export const FIELDS: WordField[] = [
  { key: "heroEyebrow", group: "front", label: "The line above the headline", where: "on the front page, in small gold capitals", href: "/" },
  { key: "heroTitle", group: "front", label: "The headline", where: "on the front page, the largest words on the site", href: "/" },
  { key: "heroSubtitle", group: "front", label: "The paragraph under it", where: "on the front page, under the headline", href: "/", long: true },
  { key: "searchPlaceholder", group: "front", label: "What the search box says", where: "inside the search box until somebody types", href: "/" },
  {
    key: "contactEmail",
    group: "contact",
    label: "The address people are told to write to",
    // Named exhaustively because it is the one word here that is load-bearing:
    // getting it wrong loses mail rather than looking wrong.
    where: "on every form, in the terms, in the privacy policy, and on the Lizhensk page",
    href: "/contact",
  },
  { key: "replyPromise", group: "contact", label: "What a form says once it is sent", where: "after somebody presses send", href: "/contact" },
  { key: "footerBlurb", group: "footer", label: "The paragraph under the logo", where: "in the footer of every page", href: "/", long: true },
  { key: "footerStrapline", group: "footer", label: "The line under that", where: "in the footer of every page, in gold capitals", href: "/" },
  { key: "bookingNotice", group: "booking", label: "The paragraph under the heading", where: "on the booking page", href: "/book", long: true },
];

/** Which words are no longer the ones the site ships with. */
export function changedWords(words: SiteWords): WordField[] {
  return FIELDS.filter((f) => words[f.key] !== BUILT_IN_WORDS[f.key]);
}

/**
 * What the OLD settings screen had saved, worth showing him.
 *
 * Six fields were saved there and read nowhere, so whatever he typed has been
 * sitting in the database doing nothing — possibly for a long time. Merging it
 * in silently would change his front page without him asking today; throwing it
 * away would discard something he did ask for. So it is shown, and he chooses.
 *
 * Only the ones that actually differ from what the site says now, and only the
 * four that have a home here — the old `publicNotice` had no place on the site
 * at all, which is part of why none of this worked.
 */
export type OldSetting = { key: keyof SiteWords; label: string; theirs: string; nowShowing: string };

export function whatTheOldScreenSaved(old: Partial<Record<string, string>> | null | undefined, now: SiteWords): OldSetting[] {
  if (!old) return [];
  const pairs: Array<[string, keyof SiteWords]> = [
    ["heroTitle", "heroTitle"],
    ["heroSubtitle", "heroSubtitle"],
    ["searchPlaceholder", "searchPlaceholder"],
    ["footerEmail", "contactEmail"],
    ["bookingNotice", "bookingNotice"],
  ];
  const out: OldSetting[] = [];
  for (const [from, to] of pairs) {
    const theirs = old[from]?.trim();
    if (!theirs || theirs === now[to]) continue;
    out.push({ key: to, label: FIELDS.find((f) => f.key === to)?.label ?? to, theirs, nowShowing: now[to] });
  }
  return out;
}
