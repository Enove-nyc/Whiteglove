/**
 * Public reviews of a place: the rules, with no database in them.
 *
 * NOT lib/experience-ratings.ts. That file is PRIVATE feedback for the owner —
 * how a trip or a listing went, read on an admin screen, never published. This
 * one is the public board: a signed-in traveller rates a place and writes a
 * line, and it appears on the place's page the moment it is saved. The two
 * must never merge, because merging them would publish words that were written
 * to the owner in confidence.
 *
 * THE SCALE IS 1–3, on purpose. Poor, Good, Excellent — three words a person
 * can pick between without agonising over the difference of one star. Not
 * five stars, and not the hotel-star system, which belongs to the partner
 * sites. These labels are the single source; nothing else may define them.
 *
 * THE PUBLIC SEES INITIALS, never the name. The author's name comes off their
 * account record so nobody types a fake one, and it leaves the server as "YC"
 * — a review is a stranger's opinion, and a stranger does not need this
 * traveller's full name to weigh it.
 */

export const REVIEW_PLACE_KINDS = [
  "destination",
  "attraction",
  "eatery",
  "stay",
  "shul",
  "mikvah",
  "kever",
  "cemetery",
  "listing",
] as const;
export type ReviewPlaceKind = (typeof REVIEW_PLACE_KINDS)[number];

/**
 * The kinds whose review section reads as visitor experience — practical
 * notes on access, directions and condition — rather than a verdict on the
 * place. Nobody rates a kever; they rate the road to it.
 */
export const SACRED_PLACE_KINDS: readonly ReviewPlaceKind[] = ["shul", "mikvah", "kever", "cemetery"];

export const REVIEW_SCORES = [1, 2, 3] as const;
export type ReviewScore = (typeof REVIEW_SCORES)[number];

/** The whole scale, and the only place it is written down. */
export const REVIEW_SCORE_LABELS: Record<ReviewScore, string> = {
  1: "Poor",
  2: "Good",
  3: "Excellent",
};

export const MAX_REVIEW_LENGTH = 2000;

/** A stored review, as the store hands it back. */
export type PlaceReview = {
  id: string;
  placeKind: ReviewPlaceKind;
  placeRef: string;
  placeLabel: string;
  score: ReviewScore;
  text: string;
  authorEmail: string;
  authorName: string;
  status: "PUBLISHED" | "REMOVED";
  reportCount: number;
  /** When it was written (ISO). */
  at: string;
  /**
   * The author's picture, when their account has one. Not stored on the
   * review — the account system owns pictures, and this is the seam it fills.
   */
  avatarUrl?: string;
};

/**
 * What a review looks like once it has left the server: initials, never the
 * name, and no email at all. `mine` is how the page knows to offer Edit.
 */
export type PublicReview = {
  id: string;
  score: ReviewScore;
  text: string;
  initials: string;
  /** "Yaakov C." — shown as the review's byline. See reviewBylineOf. */
  name: string;
  avatarUrl?: string;
  at: string;
  mine: boolean;
};

export function isReviewPlaceKind(value: unknown): value is ReviewPlaceKind {
  return typeof value === "string" && (REVIEW_PLACE_KINDS as readonly string[]).includes(value);
}

export function isSacredPlaceKind(value: unknown): boolean {
  return isReviewPlaceKind(value) && SACRED_PLACE_KINDS.includes(value);
}

export function isReviewScore(value: unknown): value is ReviewScore {
  return typeof value === "number" && (REVIEW_SCORES as readonly number[]).includes(value);
}

/**
 * "Yaakov Cohen" → "YC". First letter of the first word and of the last, so a
 * middle name changes nothing. One word gives one letter; nothing gives "?".
 * Split by code point rather than charAt, so a name in Hebrew — which has no
 * upper case, and whose letters do not fit in one UTF-16 unit less often than
 * Latin — comes out as its own first letters and not as broken halves.
 */
/**
 * "Yaakov Cohen" → "Yaakov C." — the first name in full and the last name's
 * initial. Enough to see a real person stands behind the review without
 * publishing anybody's full name; the owner chose this over initials-only and
 * over the full name. One word gives that word alone; nothing gives "A traveler".
 * Split by code point so a Hebrew name survives.
 */
export function reviewBylineOf(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "A traveler";
  if (words.length === 1) return words[0];
  const last = [...words[words.length - 1]];
  return `${words[0]} ${last[0]}.`;
}

export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = [...words[0]][0];
  if (words.length === 1) return first.toLocaleUpperCase();
  const last = [...words[words.length - 1]][0];
  return (first + last).toLocaleUpperCase();
}

/**
 * Link spam is the reason review forms rot. http, www, and bare domains on
 * the TLDs spam actually uses. The word-boundary after the TLD keeps
 * "obviously.lyrics" (a typo, not a link) from matching.
 */
const LINKS = /https?:\/\/|www\.|\b[\w-]{2,}\.(?:com|net|org|info|io|ly|me|site|online|shop|xyz|club|link)\b/i;

/**
 * Nine or more digits with at most one separator between neighbours. Nine,
 * not seven: "2024-2026" is a season, "054-123-4567" is a phone number, and
 * nine is the line between them. Coordinates survive because ", " is two
 * characters and breaks the chain.
 */
const PHONE = /\+?\d(?:[\s\-().]?\d){8,}/;

/** Short and mild. This is a courtesy filter, not a moderation system. */
const PROFANITY = /\b(?:fuck\w*|shit\w*|bitch\w*|asshole|bastard|cunt|whore|slut)\b/i;

/**
 * What is wrong with the written part, or null. An empty text is null: the
 * rating alone is a review, and demanding words produces padding, not words.
 */
export function reviewTextProblem(text: string | null | undefined): string | null {
  const clean = (text ?? "").trim();
  if (!clean) return null;
  if (clean.length > MAX_REVIEW_LENGTH) return "Keep it under 2,000 characters.";
  if (LINKS.test(clean)) return "Leave out links.";
  if (PHONE.test(clean)) return "Leave out phone numbers.";
  if (PROFANITY.test(clean)) return "Keep the language clean.";
  return null;
}

export type PlaceReviewInput = {
  placeKind?: string;
  placeRef?: string;
  placeLabel?: string;
  score?: unknown;
  text?: string;
};

/**
 * The first thing wrong with a review, or null. One at a time, in form order,
 * so the message matches what they are looking at.
 */
export function reviewProblem(input: PlaceReviewInput): string | null {
  if (!isReviewPlaceKind(input.placeKind)) return "We could not tell which place this is about.";
  if (!input.placeRef?.trim()) return "We could not tell which place this is about.";
  if (!input.placeLabel?.trim()) return "We could not tell which place this is about.";
  if (!isReviewScore(Number(input.score))) return "Choose a rating.";
  return reviewTextProblem(input.text);
}

/**
 * Strip a review for the public page. The name and email stay behind; what
 * crosses is the initials, the words, and whether it belongs to whoever is
 * looking.
 */
export function toPublicReview(review: PlaceReview, viewerEmail: string | null): PublicReview {
  return {
    id: review.id,
    score: review.score,
    text: review.text,
    initials: initialsOf(review.authorName),
    name: reviewBylineOf(review.authorName),
    avatarUrl: review.avatarUrl,
    at: review.at,
    mine: viewerEmail !== null && viewerEmail === review.authorEmail,
  };
}

/** Mean of 1–3 scores, or null with none. Same scale back, never stars. */
export function averageReviewScore(scores: readonly number[]): number | null {
  const usable = scores.filter((score): score is ReviewScore => isReviewScore(score));
  if (!usable.length) return null;
  return usable.reduce((sum, score) => sum + score, 0) / usable.length;
}

/** The nearest of the three words to a mean, for the summary line. */
export function nearestReviewScore(average: number): ReviewScore {
  return Math.min(3, Math.max(1, Math.round(average))) as ReviewScore;
}

/** How many reviews may land from one person in an hour. */
export const REVIEW_STORED_LIMIT = { limit: 8, windowSeconds: 3600 };
export const REVIEW_REQUEST_LIMIT = { limit: 40, windowSeconds: 3600 };
/** Reports need no account, so the limit is what stands between a place and a grudge. */
export const REVIEW_REPORT_LIMIT = { limit: 20, windowSeconds: 3600 };
