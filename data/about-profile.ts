/**
 * Who is behind White Glove — structured fields the owner fills in.
 *
 * The About page used to ship only a generic “small independent travel outfit”
 * intro. Personal facts (name, photo, where, experience, languages, why it
 * exists) belong to the owner and must not be invented in code. Empty fields
 * stay off the public page; the generic fallback remains until something real
 * is saved at /admin/settings/about.
 */

export type AboutProfile = {
  /** Planner / owner name as visitors should see it. */
  name: string;
  /** Same-origin media URL from /api/admin/media (`/api/media?id=…`), or empty. */
  photoUrl: string;
  /** Accessible description of the photograph. Required when a photo is set. */
  photoAlt: string;
  /** City / region / service area. */
  location: string;
  /** Travel and kosher-planning experience, in their own words. */
  experience: string;
  /** Languages spoken with clients. */
  languages: string;
  /** Why White Glove was created — personal half of the About story. */
  whyCreated: string;
};

/** Empty profile — nothing personal is published until the owner fills it in. */
export const EMPTY_ABOUT_PROFILE: AboutProfile = {
  name: "",
  photoUrl: "",
  photoAlt: "",
  location: "",
  experience: "",
  languages: "",
  whyCreated: "",
};

/**
 * What the About page opens with, whoever is reading it.
 *
 * THIS IS THE PAGE NOW, not a placeholder waiting for a biography. The owner
 * has decided it carries no personal facts at all — no name, no background,
 * and no location, because White Glove is not based anywhere: it is a website.
 * So what used to be a stopgap line apologising for being "a small independent
 * travel outfit" has to do the whole job instead, and does.
 *
 * It says what the site is for and what its information is worth, because that
 * is what a family deciding whether to trust it actually wants to know. Not
 * one word of it is a personal claim, a credential, a team size or a number of
 * years, so nothing here can go stale or turn out to be untrue.
 *
 * It also does not sell the planning service. That is the bottom option and
 * not what this website offers — see AGENTS.md.
 */
export const ABOUT_INTRO: readonly string[] = [
  "White Glove Itineraries is built around the questions that decide a Jewish family's trip. Where the kosher food is, and who stands behind it. Which quarter keeps you within walking distance on Shabbos. How long the drive between two places really takes, and what Friday afternoon looks like when the clock is against you.",
  "Answers like those are only worth having if they hold up. So every listing here names its source, nothing is shown as checked unless somebody checked it, and where we cannot yet stand behind something we leave it out — better an honest gap than a phone number that stopped working two years ago.",
  "Everything on this site is free to use: ask for recommendations, build the trip day by day yourself, or search our booking partners once the dates are settled.",
];

/**
 * The single line kept for anywhere that wants one sentence rather than three.
 * Same voice, same promise, no personal claim.
 */
export const ABOUT_FALLBACK_INTRO = ABOUT_INTRO[0];
