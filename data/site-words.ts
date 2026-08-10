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

  /* ---- what to expect about price -------------------------------------
   *
   * SIX ANSWERS THE SERVICES PAGE COULD NOT GIVE. It said "quoted once we
   * understand the trip" and stopped, which is true and is also what every
   * site with something to hide says. What a person deciding whether to write
   * in actually wants is: roughly what does this cost, what moves that number,
   * how long until I hear, do changes cost extra, is booking a separate bill,
   * and does the planning fee come off anything.
   *
   * THREE OF THE SIX ARE NOT PUBLISHED YET and say so in as many words rather
   * than being left blank or filled with something plausible. There is no
   * price list on this site to stand behind, and inventing one would be the
   * single worst thing to do on a site whose argument is that what it prints
   * has been checked. They are here as editable lines so the owner can answer
   * them from /admin/settings/words the day he decides, without a deploy —
   * which is the difference between a gap and a silence. */

  /** A starting figure or a typical range, once there is one to publish. */
  pricingStartsAt: string;
  /** What moves the number. */
  pricingWhatAffects: string;
  /** How long until a quote comes back. */
  pricingTurnaround: string;
  /** Whether changing the plan costs extra. */
  pricingRevisions: string;
  /** Whether booking the travel is a separate charge. */
  pricingBookingSupport: string;
  /** Whether a planning fee comes off anything else. */
  pricingFeeCredit: string;

  /**
   * What is said beside a link that earns a commission.
   *
   * ONE LINE, EDITABLE ONCE. It appears beside every booking action on the
   * site, and the reason it is a setting rather than a string in a component
   * is that a disclosure which is wrong in one of nine places is worse than no
   * disclosure at all — it proves the site knows it owes one.
   *
   * It is beside the action, never only in the footer. The FTC's endorsement
   * guides, the UK CAP code and the EU unfair-practices directive all ask for
   * the same thing in the same words: clear, and where the person is when they
   * decide.
   */
  affiliateDisclosure: string;
};

/**
 * What an unanswered pricing line says.
 *
 * ONE STRING, so the services page can tell the difference between a line the
 * owner has answered and one he has not, and mark the second as outstanding
 * rather than printing it as though it were the answer. The moment he edits
 * one, it stops matching and renders as an ordinary answer.
 */
export const PRICE_NOT_PUBLISHED =
  "Ask when you write in, and we will tell you before any work starts.";

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
  // Rewritten with the booking page. It used to open on flights and on how you
  // were paying; the page is now about the trip the travel is for, and hotels
  // are the product this site knows something a comparison site does not.
  bookingNotice:
    "Search the travel that fits your destination, dates, and kosher needs — with cash, or with your own miles and points.",

  // Three answers the site can already stand behind, because they are said
  // elsewhere on it, and three it cannot. The three it cannot say so.
  pricingStartsAt: PRICE_NOT_PUBLISHED,
  pricingWhatAffects:
    "The work scales with how many places are involved, how long the trip is, how much has to be arranged rather than only recommended, and how much of the kosher side has to be checked from scratch.",
  pricingTurnaround: PRICE_NOT_PUBLISHED,
  pricingRevisions:
    "Changing the plan is part of the planning, not an extra: you say what you want different and we adjust until the itinerary is right.",
  pricingBookingSupport:
    "Booking your own travel through the search on this site costs you nothing extra — the site may earn a commission from the travel provider, which does not change your price. Booking on your behalf is a separate service, quoted before any work starts.",
  pricingFeeCredit: PRICE_NOT_PUBLISHED,
  affiliateDisclosure:
    "White Glove may earn a commission if you book through a partner link, at no additional cost to you.",
};
