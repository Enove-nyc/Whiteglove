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
 * What "Featured" means in the provider directory.
 *
 * A promotional badge a visitor cannot interpret is the thing the review
 * warned about: they cannot tell whether a starred listing was chosen because
 * it is good or because somebody paid, and only the owner knows which.
 *
 * So there is always a disclosure, and the default one makes no claim in
 * either direction — it says what a visitor can see for themselves (featured
 * listings come first) and what to do about it (check for yourself). It is
 * true whichever way the question is eventually answered, which is what makes
 * it safe to ship before it has been.
 *
 * `DIRECTORY_FEATURED_NOTE` replaces it with the real answer once there is
 * one, e.g.
 *
 *   DIRECTORY_FEATURED_NOTE="Featured providers pay for placement."
 *   DIRECTORY_FEATURED_NOTE="Featured providers are ones we have worked with directly. Nobody pays for placement."
 *
 * Read at build time, so it takes a redeploy.
 */
export const DEFAULT_FEATURED_NOTE =
  "Featured listings appear first in their category. Check each provider's details with them directly before booking.";

export function featuredDisclosure(): string {
  return process.env.DIRECTORY_FEATURED_NOTE?.trim() || DEFAULT_FEATURED_NOTE;
}
