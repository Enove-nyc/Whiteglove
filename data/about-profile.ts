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

/** The one line the page may still say when the personal half is empty. */
export const ABOUT_FALLBACK_INTRO =
  "White Glove Itineraries is a small independent travel outfit that plans kosher holidays and Jewish heritage journeys. The person who answers your message is the person who does the planning — there is no call centre behind this.";
