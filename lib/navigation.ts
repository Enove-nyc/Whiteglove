/**
 * What the site says it is, in the order it says it.
 *
 * THE NAVIGATION WAS THE POSITIONING, and it said the wrong thing. The bar
 * read: Destinations · Cemeteries · Getaways · Directory · Services · Book.
 * Three of those six were the heritage database, one was a word that means
 * something else to the customer this site is for, and one led to a page that
 * can be behind an access code.
 *
 * Somebody who has just been told about "a kosher vacation planner" reads
 * "Destinations" as places to go on holiday, presses it, and lands in a
 * directory of batei hachaim. Nothing about that is a labelling accident — it
 * is what the site was, and the bar was honest about it.
 *
 * So the bar is here rather than typed into the header, for two reasons. It is
 * the shape of the business and it should be reviewable as one screen of text;
 * and the rules below are the kind that get broken by somebody adding "just one
 * more link", so they are enforced by a test rather than by this comment.
 *
 * THE RULES, each with the mistake it exists to prevent:
 *
 *   1. **No Cemeteries at the top level.** It is the single item that makes a
 *      vacation planner look like a burial-records database, and it is one
 *      press away inside Heritage Travel where the person looking for it will
 *      look.
 *
 *   2. **No item called "Destinations".** Not because the word is wrong, but
 *      because it is ambiguous exactly here: to a vacation customer it promises
 *      places to go, and on this site it opened the kevarim directory. Vacation
 *      places live under Vacation Ideas; towns with kevarim live under Heritage
 *      Travel; neither is called Destinations.
 *
 *   3. **Nothing in the bar may lead to an access code.** `/book` is not
 *      itself gated, but the site can be closed and single paths can be locked
 *      from the admin, and the booking search is the least finished thing on
 *      the public site. A first-time visitor pressing a main navigation item
 *      and meeting a password box is the end of that visit. It stays reachable
 *      from Travel Services, from the planner and from the footer.
 *
 *   4. **One primary action, and it starts a trip.** Not "contact us", not
 *      "book" — the thing this business does is plan the trip.
 */

export type NavItem = {
  label: string;
  href: string;
  /**
   * What is actually behind it, in the words a traveler would use.
   *
   * Used as the description in the menu panel and as the accessible name where
   * a link would otherwise be a bare noun. A navigation item whose meaning has
   * to be guessed is one that gets pressed once.
   */
  description: string;
};

/** The bar, in order, at the widths that have room for it. */
export const PRIMARY_NAV: readonly NavItem[] = [
  {
    label: "Plan a Trip",
    href: "/plan",
    description: "Answer a few questions and we will open a trip for you — or take it from here ourselves.",
  },
  {
    label: "Vacation Ideas",
    href: "/vacation-ideas",
    description: "Where to go: beaches, cities, mountains, family trips and short breaks, with the kosher side worked out.",
  },
  {
    label: "Kosher Travel",
    href: "/kosher-travel",
    description: "Food, Shabbos, minyanim, mikvaos, hechsherim and the practical side of travelling kosher.",
  },
  {
    label: "Travel Services",
    href: "/services",
    description: "What we do for you: planning, flights and hotels, kosher arrangements, and the essentials.",
  },
  {
    label: "Heritage Travel",
    href: "/heritage",
    description: "שתוליכנו לשלום — kevarim, batei hachaim and Jewish heritage journeys.",
  },
] as const;

/** The one button. Filled, and the only filled thing in the header. */
export const PRIMARY_CTA: NavItem = {
  label: "Start planning",
  href: "/plan",
  description: "Begin a trip, whether or not you know where you are going yet.",
};

export const SIGN_IN: NavItem = {
  label: "Sign in",
  href: "/login",
  description: "Reach your saved trips from any device.",
};

/**
 * The rest of the site, behind the menu button.
 *
 * At compact widths this IS the navigation and it carries the bar as well; at
 * desktop the bar is showing, so the panel drops what the bar already offers
 * (see PRIMARY_HREFS in the header). Grouped by what somebody is trying to do,
 * not by which folder the page lives in.
 */
export const MENU_GROUPS: ReadonlyArray<{ title: string; links: readonly NavItem[] }> = [
  {
    title: "Plan",
    links: [
      PRIMARY_NAV[0],
      { label: "Itinerary planner", href: "/itinerary", description: "Build the trip day by day." },
      { label: "Vacation ideas", href: "/vacation-ideas", description: "Somewhere to start when the destination is undecided." },
      { label: "Have us plan it", href: "/contact", description: "Tell us about the trip and we will arrange it." },
    ],
  },
  {
    title: "Where to go",
    links: [
      { label: "Things to do", href: "/attractions", description: "What to do on the days between, and what it does on Shabbos." },
      { label: "Where to stay", href: "/kosher-stays", description: "Kosher hotels, seasonal programmes and which quarter to book in." },
      { label: "Kosher food", href: "/kosher", description: "Restaurants, bakeries and groceries, live, anywhere in the world." },
      { label: "Map", href: "/map", description: "Everything the site knows, plotted in one place." },
    ],
  },
  {
    title: "Heritage travel",
    links: [
      PRIMARY_NAV[4],
      { label: "Towns and guides", href: "/stops", description: "Every town and kever on the site, searchable in English or יידיש." },
      { label: "Batei hachaim", href: "/cemeteries", description: "Cemetery records with kevarim, access notes and shomer contacts." },
      { label: "Kevarim by name", href: "/tzaddikim", description: "Who is buried where, by the name he is known by." },
      { label: "Send in a correction", href: "/submit", description: "Tell us about a kever, a cemetery or a provider we are missing." },
    ],
  },
  {
    title: "Services & booking",
    links: [
      PRIMARY_NAV[3],
      { label: "Flights, hotels & cars", href: "/book", description: "Search and book your own travel, with cash or with points." },
      { label: "Honeymoon", href: "/honeymoon", description: "A quiet, well-planned kosher honeymoon." },
      { label: "Provider directory", href: "/directory", description: "Drivers, shomrim and local services." },
      { label: "Travel guide", href: "/travel-guide", description: "Documents, entry rules and paying for the trip." },
    ],
  },
  {
    title: "White Glove",
    links: [
      { label: "Home", href: "/", description: "The front page, and everything the site can do, in one screen." },
      { label: "Contact", href: "/contact", description: "Tell us about the trip you want to take." },
      { label: "How we verify", href: "/verification", description: "What Verified, Reported and Being checked mean here." },
    ],
  },
] as const;

/** Everything the bar shows, for the header to hide from the panel at desktop. */
export const PRIMARY_HREFS: ReadonlySet<string> = new Set(PRIMARY_NAV.map((item) => item.href));

/**
 * Is this navigation item the page we are on?
 *
 * A section match, so a destination page still lights its section up. `/` is
 * exempt, because every path starts with it and the front page would otherwise
 * be current everywhere.
 */
export function isCurrent(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
