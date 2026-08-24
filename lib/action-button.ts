/**
 * The one button style used across the public booking/search funnel —
 * destinations, plan, heritage, the sample itinerary, alert signup, zmanim,
 * stay search. It already existed, copy-pasted identically into more than a
 * dozen files; this gives it one place to be defined, so the next page
 * reaches for it rather than inventing a thirteenth copy, or a different
 * look entirely.
 *
 * NOT the same rule as the account/dashboard tools, which use a softer,
 * fully-rounded pill (see components/LockedToolCard.tsx) — that is a
 * deliberately different voice for a signed-in advisor's own tools, not an
 * inconsistency to fix.
 */
export type ActionButtonVariant = "primary" | "secondary";

const BASE = "rounded-md text-xs font-bold uppercase tracking-[0.12em] transition";

export const ACTION_BUTTON_CLASS: Record<ActionButtonVariant, string> = {
  primary: `${BASE} border border-[var(--navy)] bg-[var(--navy)] px-6 text-white hover:border-[var(--gold)] hover:bg-[var(--gold)]`,
  secondary: `${BASE} border border-[var(--gold)] px-6 text-[var(--navy)] hover:bg-[var(--surface)]`,
};
