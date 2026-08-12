/**
 * How somebody rates a listing or a trip they took.
 *
 * NOT A PUBLIC STAR BOARD. Hotel partner star ratings live on the partner; this
 * site does not invent those. What this collects is private feedback for the
 * owner — how a place or a finished trip went — on a three-point scale with
 * plain labels. Nothing here publishes.
 *
 * Pure rules, no database: the store and the route sit on top of these.
 */

export const RATING_KINDS = ["listing", "trip", "destination", "place"] as const;
export type RatingKind = (typeof RATING_KINDS)[number];

/** Three options — not hotel stars, and not a five-point scale. */
export const RATING_SCORES = [1, 2, 3] as const;
export type RatingScore = (typeof RATING_SCORES)[number];

/** Labels on the three choices — experience, not a star board. */
export const SCORE_LABELS: Record<RatingScore, string> = {
  1: "Not what we hoped",
  2: "Fine",
  3: "Glad we went",
};

export type ExperienceRatingInput = {
  kind: string;
  /** Listing slug, trip share id / trip id, destination slug, or place id. */
  ref: string;
  /** What to call it in the inbox and on the admin screen. */
  label: string;
  score: number;
  name: string;
  email: string;
  note: string;
};

export type ExperienceRating = ExperienceRatingInput & {
  id: string;
  kind: RatingKind;
  score: RatingScore;
  at: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isRatingKind(value: string | undefined): value is RatingKind {
  return typeof value === "string" && (RATING_KINDS as readonly string[]).includes(value);
}

export function isRatingScore(value: unknown): value is RatingScore {
  return typeof value === "number" && (RATING_SCORES as readonly number[]).includes(value);
}

/**
 * The first thing wrong with a rating, or null.
 *
 * One at a time, in form order, so the message matches the box they are looking at.
 */
export function ratingProblem(input: Partial<ExperienceRatingInput>): string | null {
  if (!isRatingKind(input.kind)) return "We could not tell what this is about.";
  if (!input.ref?.trim()) return "We could not tell what this is about.";
  if (!input.label?.trim()) return "We could not tell what this is about.";
  if (!isRatingScore(Number(input.score))) return "Please choose how it went.";
  if (!input.name?.trim()) return "Please give your name, so we know who wrote.";
  if (!EMAIL.test((input.email ?? "").trim())) return "Please give an email address we can reply to.";
  if ((input.note ?? "").trim().length > 2000) return "Please keep the note under 2,000 characters.";
  return null;
}

/** How many may land from one address in an hour. */
export const RATING_STORED_LIMIT = { limit: 8, windowSeconds: 3600 };
export const RATING_REQUEST_LIMIT = { limit: 40, windowSeconds: 3600 };

/** Build the href for the public form, with the target already filled in. */
export function rateHref(input: { kind: RatingKind; ref: string; label: string }): string {
  const params = new URLSearchParams({
    kind: input.kind,
    ref: input.ref,
    label: input.label,
  });
  return `/rate?${params.toString()}`;
}

/** One line for the admin list. */
export function ratingSummary(rating: Pick<ExperienceRating, "score" | "label" | "kind">): string {
  const what =
    rating.kind === "trip"
      ? "trip"
      : rating.kind === "destination"
        ? "destination"
        : rating.kind === "place"
          ? "place"
          : "listing";
  return `${SCORE_LABELS[rating.score]} · ${what} · ${rating.label}`;
}

/**
 * Mean of 1–3 scores, or null when there are none.
 *
 * Returned as a number on the same scale — never as stars. Callers that show
 * it to a person should prefer the nearest label via `nearestScoreLabel`.
 */
export function averageScore(scores: readonly number[]): number | null {
  const usable = scores.filter((s): s is RatingScore => isRatingScore(s));
  if (!usable.length) return null;
  return usable.reduce((sum, s) => sum + s, 0) / usable.length;
}

/** Closest of the three labels to a mean on the 1–3 scale. */
export function nearestScoreLabel(average: number): string {
  const rounded = Math.min(3, Math.max(1, Math.round(average))) as RatingScore;
  return SCORE_LABELS[rounded];
}
