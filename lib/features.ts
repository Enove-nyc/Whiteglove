/**
 * Parts of the service that are built but not open yet.
 *
 * The site is going live before the concierge side of it is. The pages that
 * offer to arrange a trip for you stay exactly as they are — the words are
 * true, that is the service — but the forms that would put a request in
 * somebody's inbox are inert and say so, because a form that silently accepts
 * work nobody is there to do is worse than one that admits it is not ready.
 *
 * Each of these is one environment variable away from being on, so opening the
 * service is a setting change and a redeploy, not a code change.
 */

/**
 * Personal trip arrangement: the flight-booking request, and any other form
 * where a person on this end plans and books on the traveler's behalf.
 *
 * Off unless `TRIP_ARRANGEMENT=1`. Off is the safe default — a deployment that
 * forgets to set it shows "coming soon" to somebody who could have emailed
 * instead, where the other way round means requests arriving that nobody
 * answers.
 */
export function tripArrangementOpen(): boolean {
  return process.env.TRIP_ARRANGEMENT?.trim() === "1";
}

/*
 * Where to send somebody while a service is closed USED TO LIVE HERE, as
 * `CONTACT_EMAIL`, and the address was also typed into four components
 * separately — so changing where mail should go meant finding five places and
 * one of them twice. It is now one editable line: BUILT_IN_WORDS.contactEmail
 * in data/site-words.ts, overridden from /admin/settings/words.
 */

/**
 * The name of this site, for the pages that have to say it in a sentence.
 *
 * The terms and the privacy policy once named a different business's domain,
 * which had nothing to do with this one and has since been given up entirely.
 * A policy that names the wrong company is not a small typo: it is the
 * document a visitor reads to find out who is holding their data.
 *
 * One constant rather than the string typed into each page, so the next one
 * cannot be written differently. `siteOrigin()` is not used here because these
 * pages are prerendered and would then say whatever the build environment
 * happened to be, including a Vercel preview URL.
 */
export const SITE_DOMAIN = "whiteglovekoshertravel.com";
export const SITE_NAME = "White Glove Kosher Travel";

/**
 * What "Featured" means in the provider directory.
 *
 * THE OWNER'S DECISION, recorded here so it is not re-litigated: a listing is
 * featured for one of two reasons — their service has been found consistently
 * good, or the placement is sponsored — and the badge looks the same either
 * way. Visitors are not told which reason applies to a particular listing.
 *
 * WHAT THE DISCLOSURE MUST STILL DO. A badge that may mean "they paid" and is
 * indistinguishable from an editorial pick is the specific thing advertising
 * rules exist to catch — the FTC in the US, the ASA and CMA in the UK, and EU
 * consumer law all require paid placement to be identifiable as advertising.
 * So the note below says plainly that some featured listings are sponsored.
 * It does not say which, which is what was asked for; it does not pretend
 * none of them are, which is the part that would be a problem.
 *
 * If a listing is ever genuinely paid for, a marker on that one is safer than
 * this, and DIRECTORY_FEATURED_NOTE can still override the wording.
 */
export const FEATURED_REASONS = [
  { value: "service", label: "Service we have found consistently good" },
  { value: "sponsored", label: "Sponsored placement" },
] as const;

export type FeaturedReason = (typeof FEATURED_REASONS)[number]["value"];

export function featuredReasonLabel(reason?: string | null): string {
  return FEATURED_REASONS.find((r) => r.value === reason)?.label ?? "Not recorded";
}

export const DEFAULT_FEATURED_NOTE =
  "Featured listings appear first in their category. Some are sponsored; others are here because we have found their service consistently good. Check each provider's details with them directly before booking.";

export function featuredDisclosure(): string {
  return process.env.DIRECTORY_FEATURED_NOTE?.trim() || DEFAULT_FEATURED_NOTE;
}
