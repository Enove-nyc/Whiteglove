/**
 * The words the website says about itself.
 *
 * The headline on the front page, the line under it, what the search box
 * invites you to type, the address people are told to write to, the paragraph
 * in the footer. Every one of them was typed into a component, so changing the
 * front page of the business meant a code change and a deploy.
 *
 * WHAT MAKES THIS WORTH DOING RATHER THAN ANNOYING is that there was already a
 * settings screen for six of these, saving to the database — and NOTHING ON THE
 * PUBLIC SITE READ ANY OF IT. Six fields, a Save button, and the website
 * afterwards said exactly what it said before. A settings screen that changes
 * nothing is worse than no settings screen: the owner believes he has already
 * corrected something he has not.
 *
 * THE BUILT-IN WORDS BELOW ARE EXACTLY WHAT THE SITE SAYS TODAY, character for
 * character, so shipping this changed no page. What the old screen had saved is
 * not merged in either — see lib/site-words.ts. It is shown to him instead, and
 * he chooses.
 *
 * A data file, like the airports and the planner figures, for the same reason:
 * lib/ may read data/ and data/ never reads lib/.
 */

export type SiteWords = {
  /** The small gold line above the front-page headline. */
  heroEyebrow: string;
  /** The front-page headline. */
  heroTitle: string;
  /** The paragraph under it. */
  heroSubtitle: string;
  /** What the search box invites somebody to type. */
  searchPlaceholder: string;
  /**
   * Where people are told to write.
   *
   * Shown to visitors on every form, so it has to be an address somebody
   * actually reads. It is not the address the site sends FROM — that is set by
   * the mail service (see the connections screen).
   */
  contactEmail: string;
  /** What a form says once it has been sent. */
  replyPromise: string;
  /** The paragraph under the logo in the footer. */
  footerBlurb: string;
  /** The gold line under that. */
  footerStrapline: string;
  /** The paragraph under the heading on the booking page. */
  bookingNotice: string;
};

/**
 * What the site says today.
 *
 * If one of these is edited here, the website changes for everybody with no way
 * to put it back from the admin — which is the situation this file exists to
 * end. Change them from /admin/settings/words.
 *
 * THE FRONT-PAGE FOUR WERE REWRITTEN when the site stopped describing itself
 * kevarim-first. They used to open with "Two kinds of journeys" and name the
 * heritage side before the vacation side, which is the right emphasis for the
 * heritage database and the wrong one for a business that plans kosher
 * holidays. A visitor has about five seconds to work out what a site is for,
 * and these are the words they spend them on.
 *
 * The heritage side is not diminished by this and is not meant to be — it has
 * its own section, its own identity and its own landing page. It is simply no
 * longer what the front door says first.
 *
 * Anything the owner has already changed from /admin/settings/words still wins
 * over every line here; only what he has not touched moves.
 */
export const BUILT_IN_WORDS: SiteWords = {
  heroEyebrow: "Kosher vacations, thoughtfully planned",
  heroTitle: "Plan your next vacation with every kosher detail in place.",
  heroSubtitle:
    "Discover where to go, build your itinerary, find kosher food and religious essentials, or let White Glove arrange the trip for you.",
  // No longer "a city, tzaddik, kever" — the same search still finds all three,
  // and the box no longer announces the heritage database on every page.
  searchPlaceholder: "Search a destination, hotel, kosher restaurant, or kever…",
  contactEmail: "contact@whitegloveitineraries.com",
  replyPromise: "We’ll be in touch soon.",
  footerBlurb:
    "Kosher vacations planned end to end — where to go, where to stay, what to do, and the food, Shabbos and religious essentials arranged around it. Jewish heritage journeys too, in their own section.",
  footerStrapline: "Personalized travel, planned with purpose.",
  bookingNotice:
    "Flights, hotels and rental cars in one place. Choose how you’re paying, book it, and keep the rest of the trip together in White Glove.",
};
