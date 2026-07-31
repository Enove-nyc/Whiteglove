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

/** Where to send somebody while a service is closed. */
export const CONTACT_EMAIL = "contact@whitegloveitineraries.com";

/**
 * What "Featured" means in the provider directory, in the owner's own words.
 *
 * A promotional badge with no explanation is the thing the review warned
 * about: a visitor cannot tell whether a starred listing was chosen because
 * it is good or because somebody paid, and guessing either way is unfair to
 * one side of that. Only the owner knows the answer.
 *
 * So the badge is gated on the answer existing. With `DIRECTORY_FEATURED_NOTE`
 * unset, featured listings appear as ordinary listings — no star, no
 * advantage — because an unexplained promotion is worse than none. Set it to
 * the truth, whatever the truth is:
 *
 *   DIRECTORY_FEATURED_NOTE="Featured providers pay for placement."
 *   DIRECTORY_FEATURED_NOTE="Featured providers are ones we have worked with directly. No one pays for placement."
 */
export function featuredDisclosure(): string | null {
  return process.env.DIRECTORY_FEATURED_NOTE?.trim() || null;
}
