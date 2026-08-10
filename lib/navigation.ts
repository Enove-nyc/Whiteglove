/**
 * What the site says it is, in the order it says it.
 *
 * THE NAVIGATION IS THE POSITIONING, and it has now been rewritten twice for
 * that reason. The first time it read Destinations · Cemeteries · Getaways ·
 * Directory · Services · Book, which was an accurate description of a kevarim
 * database with a travel page attached. The second time it led with Plan a
 * Trip and Travel Services, which described a personal planning service.
 *
 * The business is neither. It helps somebody choose a kosher-friendly holiday
 * and earns when they book it, so the bar is where to go and what matters
 * about travelling kosher — with one filled Search & Book button for hotels,
 * flights and cars. Putting Hotels and Flights in the bar next to that button
 * said the same thing three times and crowded Destinations onto the logo.
 *
 * THE RULES, each with the mistake it exists to prevent:
 *
 *   1. **No Cemeteries at the top level.** It is the single item that makes a
 *      vacation planner look like a burial-records database, and it is one
 *      press away inside Heritage Travel where the person looking for it will
 *      look.
 *
 *   2. **"Destinations" means holidays.** It used to be forbidden here,
 *      because it was ambiguous: to a vacation customer it promises places to
 *      go, and on this site it opened a directory of towns with kevarim in
 *      them. The heritage towns have moved (lib/route-migration.ts), so the
 *      word is free to mean the thing a visitor expects — and it must keep
 *      meaning it.
 *
 *   3. **Nothing in the bar may lead to an access code.** The booking search
 *      is the primary action now, so this rule could not be kept by leaving it
 *      out; it is kept by RESOLVING it. `menuGroupsFor` and `primaryCtaFor`
 *      below take the resolved link (lib/booking-access.ts), so when the owner
 *      has that path locked the bar offers the public assistance page instead
 *      of a password box. A first-time visitor pressing the one filled button
 *      and meeting a login is the end of that visit.
 *
 *   4. **No personal planning in the bar, at all.** Not "Plan a Trip", not
 *      "Travel Services", not "Have us book it". The service still exists and
 *      is offered inside Contact; promoting it here would tell every visitor
 *      that the business is a planning agency, which is what the whole pivot
 *      is away from.
 *
 *   5. **One primary action, and it is a search.** The thing this business
 *      does is help somebody find and book a trip. Hotels and Flights stay on
 *      their own pages and in the menu — not beside the Search & Book button.
 */

import { BOOKING_SEARCH_PATH, type BookingLink } from "@/lib/booking-access";

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

/** Dedicated hotel search — menu and destination pages, not the bar. */
export const HOTELS_NAV: NavItem = {
  label: "Hotels & Stays",
  href: "/hotels",
  description: "Kosher hotels, seasonal programmes, and which quarter makes Shabbos walkable.",
};

/** Dedicated flight search — menu and destination pages, not the bar. */
export const FLIGHTS_NAV: NavItem = {
  label: "Flights",
  href: "/flights",
  description: "Search flights for your dates, then build the trip around them.",
};

/**
 * The bar, in order, at the widths that have room for it.
 *
 * FIVE, NOT SEVEN. Hotels & Stays and Flights used to sit here next to the
 * Search & Book button, which searches the same three things. That tripled the
 * booking pitch, crowded the first item onto the logo at 1280px, and left
 * Cars & Transfers in the menu where it still belongs — somebody looks for a
 * car AFTER they have chosen a hotel. The hotel and flight pages keep their
 * own addresses and stay in the menu below.
 */
export const PRIMARY_NAV: readonly NavItem[] = [
  {
    label: "Destinations",
    href: "/destinations",
    description: "Where to go: beaches, cities, mountains, family trips and short breaks, with the kosher side worked out.",
  },
  {
    label: "Things to Do",
    href: "/things-to-do",
    description: "What to do on the days between — and what each one does on Shabbos.",
  },
  {
    label: "Kosher Travel",
    href: "/kosher-travel",
    description: "Food, Shabbos, minyanim, mikvaos, hechsherim and the practical side of travelling kosher.",
  },
  {
    label: "Heritage Travel",
    href: "/heritage",
    description: "שתוליכנו לשלום — kevarim, batei hachaim and Jewish heritage journeys.",
  },
  {
    label: "My Trips",
    href: "/itinerary",
    description: "The trips you have saved, day by day, with everything you have booked in them.",
  },
] as const;

/**
 * The one button. Filled, and the only filled thing in the header.
 *
 * RESOLVED, NOT TYPED. It points at the booking search, which the owner can
 * lock from the admin — and rule 3 above says nothing in the bar may end at a
 * password box. `primaryCtaFor` swaps in the public assistance page when that
 * happens, so the most prominent control on the site cannot become a login
 * screen because of a setting somewhere else.
 */
export const PRIMARY_CTA: NavItem = {
  label: "Search & Book",
  href: BOOKING_SEARCH_PATH,
  description: "Search hotels, flights and cars for your dates.",
};

export function primaryCtaFor(booking: BookingLink): NavItem {
  return booking.searchIsPublic ? PRIMARY_CTA : { ...PRIMARY_CTA, label: "Plan & enquire", href: booking.href, description: booking.description };
}

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
    title: "Where to go",
    links: [
      PRIMARY_NAV[0],
      { label: "Kosher food", href: "/kosher", description: "Restaurants, bakeries and groceries, live, anywhere in the world." },
      { label: "Map", href: "/map", description: "Everything the site knows, plotted in one place." },
    ],
  },
  {
    title: "Book the trip",
    links: [
      // Hotels and flights live here rather than beside Search & Book in the
      // bar — same products, one primary action up top.
      HOTELS_NAV,
      FLIGHTS_NAV,
      { label: "Cars & transfers", href: "/cars", description: "Hire a car, or find out whether the destination is better without one." },
      { label: "Search hotels, flights & cars", href: BOOKING_SEARCH_PATH, description: "Search and book your own travel, with cash or with points." },
      { label: "Before you go", href: "/travel-guide", description: "Documents, entry rules, insurance and connectivity." },
    ],
  },
  {
    title: "While you are there",
    links: [
      PRIMARY_NAV[1],
      { label: "A sample itinerary", href: "/sample-itinerary", description: "What a planned trip actually looks like when it arrives." },
      { label: "Itinerary planner", href: "/itinerary", description: "Build the trip day by day." },
    ],
  },
  {
    title: "Heritage travel",
    links: [
      PRIMARY_NAV[3],
      { label: "Towns and guides", href: "/stops", description: "Every town and kever on the site, searchable in English or יידיש." },
      { label: "Batei hachaim", href: "/cemeteries", description: "Cemetery records with kevarim, access notes and shomer contacts." },
      { label: "Kevarim by name", href: "/tzaddikim", description: "Who is buried where, by the name he is known by." },
    ],
  },
  {
    title: "White Glove",
    links: [
      { label: "Home", href: "/", description: "The front page, and everything the site can do, in one screen." },
      { label: "How we verify", href: "/verification", description: "What Verified, Reported and Being checked mean here." },
      // Travel Services is OUT OF THE BAR (rule 4) and still reachable. What it
      // offers commercially has moved into the journeys; what it offers
      // personally is inside Contact.
      { label: "Travel services", href: "/services", description: "What we do, and what to expect about price." },
      { label: "Provider directory", href: "/directory", description: "Drivers, shomrim and local services." },
      { label: "Contact", href: "/contact", description: "Ask a question, report a correction, or talk about advertising." },
    ],
  },
] as const;

/** Everything the bar shows, for the header to hide from the panel at desktop. */
export const PRIMARY_HREFS: ReadonlySet<string> = new Set(PRIMARY_NAV.map((item) => item.href));

/**
 * The menu, with the booking entry pointed wherever it is allowed to go today.
 *
 * Rule 3 above kept `/book` out of the BAR because it can be behind an access
 * code. The menu panel kept it, and the same objection applied there — a
 * visitor opening the menu and pressing the combined search met the password
 * box just as squarely. The entry stays (removing it would hide a working
 * feature from everybody to protect against a setting most deployments do not
 * have) and its target is resolved instead. See lib/booking-access.ts.
 */
export function menuGroupsFor(booking: BookingLink): typeof MENU_GROUPS {
  return MENU_GROUPS.map((group) => ({
    ...group,
    links: group.links.map((item) =>
      item.href === BOOKING_SEARCH_PATH ? { ...item, href: booking.href, description: booking.description } : item,
    ),
  }));
}

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
