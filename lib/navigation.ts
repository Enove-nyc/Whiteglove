/**
 * What the site says it is, in the order it says it.
 *
 * Four dropdown categories in the bar — Destinations, Kosher, Plan, Travel
 * — each a short list of links with no photographs or paragraphs. Booking
 * (flights, hotels, cars) lives inside Travel rather than as a fifth door. A
 * category is what somebody is trying to do, not which folder the page lives
 * in: Kosher Stays and Travel Stays point at the same page today (one kosher
 * stays page is still to come) and that is fine — the two labels answer two
 * different questions even when today they land in the same place.
 *
 * RULES, each with the mistake it exists to prevent:
 *
 *   1. **No personal planning anywhere in this file.** /services does not
 *      appear. Not renamed, not demoted — removed, at the owner's word: the
 *      business is self-service destinations, kosher information and booking
 *      partners, not a planning agency.
 *
 *   2. **Heritage is not a category.** Kevarim, batei hachaim and heritage
 *      towns are reached through Destinations (as places) and Kosher (as
 *      practical information) — not as a fourth thing this site is about.
 *
 *   3. **Nothing here may lead to an access code.** The booking links in
 *      Travel are resolved through lib/booking-access.ts, exactly as the old
 *      single "Search & Book" button was: when the owner has the search
 *      locked, they go to the public assistance page instead of a password
 *      box.
 */

import { BOOKING_SEARCH_PATH, type BookingLink } from "@/lib/booking-access";

export type NavLink = {
  /** The word on the link. Short — this is a dropdown, not a page. */
  label: string;
  href: string;
  /**
   * Only when the label alone would not say enough out of context (an icon,
   * or a link whose destination isn't obvious from its word). Used as the
   * accessible name; never shown as visible text in the dropdown itself.
   */
  description?: string;
};

export type NavGroup = { title: string; links: readonly NavLink[] };

export type NavCategory = {
  label: string;
  links: readonly NavLink[];
  /**
   * Set on a category whose panel is wide and organized under small group
   * headings (Destinations). `links` still carries the flat list — it is what
   * categoryIsCurrent and the mobile accordion read — and MUST contain every
   * link the groups do.
   */
  groups?: readonly NavGroup[];
};

/**
 * The four dropdowns, in order. Destinations first: a visitor reads left to
 * right and stops at the first thing that sounds like what they came for.
 * Travel's booking links (Flights/Hotels/Cars) are appended per request by
 * travelCategoryFor below, never listed here — rule 3.
 */
export const NAV_CATEGORIES: readonly NavCategory[] = [
  {
    label: "Destinations",
    links: [
      { label: "All Destinations", href: "/destinations" },
      { label: "Map", href: "/map" },
      { label: "Beach", href: "/destinations?kind=beach" },
      { label: "Cities", href: "/destinations?kind=city" },
      { label: "Mountains", href: "/destinations?kind=mountains" },
      { label: "Family", href: "/destinations?kind=family" },
      { label: "Couples", href: "/destinations?kind=couples" },
      { label: "Short Trips", href: "/destinations?kind=short-break" },
      // Heritage as a TRIP TYPE, beside Beach and Cities — not as a fifth
      // category in the bar. Rule 2 above stands: kevarim and batei hachaim
      // are reached as places, through Destinations, and this is how somebody
      // says that is the kind of trip they want.
      { label: "Heritage", href: "/destinations?kind=heritage" },
      { label: "Seasonal", href: "/destinations?view=seasonal" },
    ],
    groups: [
      {
        title: "Browse",
        links: [
          { label: "All Destinations", href: "/destinations" },
          { label: "Map", href: "/map" },
        ],
      },
      {
        title: "Trip type",
        links: [
          { label: "Beach", href: "/destinations?kind=beach" },
          { label: "Cities", href: "/destinations?kind=city" },
          { label: "Mountains", href: "/destinations?kind=mountains" },
          { label: "Family", href: "/destinations?kind=family" },
          { label: "Couples", href: "/destinations?kind=couples" },
          { label: "Short Trips", href: "/destinations?kind=short-break" },
          { label: "Heritage", href: "/destinations?kind=heritage" },
          { label: "Seasonal", href: "/destinations?view=seasonal" },
        ],
      },
    ],
  },
  {
    label: "Kosher",
    links: [
      { label: "Food", href: "/kosher" },
      { label: "Stays", href: "/hotels" },
      { label: "Shuls", href: "/shuls" },
      { label: "Mikvahs", href: "/mikvaos" },
      { label: "Eruvin", href: "/eruvin" },
      { label: "Zmanim", href: "/zmanim" },
      { label: "Kevarim", href: "/tzaddikim" },
      { label: "Cemeteries", href: "/cemeteries" },
      { label: "Batei hachaim worldwide", href: "/cemeteries/heritage" },
    ],
  },
  {
    label: "Plan",
    links: [
      { label: "Planner", href: "/plan" },
      { label: "Route", href: "/my-route" },
      { label: "Itinerary", href: "/itinerary" },
    ],
  },
  {
    label: "Travel",
    links: [
      { label: "Stays", href: "/hotels" },
      { label: "Activities", href: "/things-to-do" },
      { label: "Transport", href: "/transfers" },
      { label: "Insurance", href: "/travel-insurance" },
      { label: "Gear", href: "/travel-gear" },
      // THE DIRECTORY HAD NO ENTRY IN THE MENUS AT ALL. Thirty-one tour
      // operators, agencies, guides and drivers, reachable only by somebody
      // who already knew the address or stumbled through Explore — which is
      // the same failure the "Before you go" column was added for. It belongs
      // under Travel: everything else here is a thing you arrange, and this is
      // the people who arrange it.
      { label: "Directory", href: "/directory" },
    ],
  },
] as const;

/**
 * Travel, with the booking links resolved so they can never end at a
 * password box. A function because Flights/Hotels/Cars share one destination
 * (BOOKING_SEARCH_PATH) whose reachability is the owner's setting, read per
 * request; locked, the three collapse to the one public assistance link.
 */
export function travelCategoryFor(booking: BookingLink): NavCategory {
  const travel = NAV_CATEGORIES.find((category) => category.label === "Travel")!;
  const bookingLinks: NavLink[] = booking.searchIsPublic
    ? [
        { label: "Flights", href: `${BOOKING_SEARCH_PATH}?type=flights` },
        { label: "Hotels", href: `${BOOKING_SEARCH_PATH}?type=hotels` },
        { label: "Cars", href: `${BOOKING_SEARCH_PATH}?type=cars` },
      ]
    : [{ label: booking.label, href: booking.href, description: booking.description }];
  // Booking sits between Transport and Insurance — the searches beside the
  // other ways of getting there, the add-ons after.
  const links = [...travel.links.slice(0, 3), ...bookingLinks, ...travel.links.slice(3)];
  return { ...travel, links };
}

export const SIGN_IN: NavLink = { label: "Sign in", href: "/login" };

/**
 * Is this navigation item the page we are on? A section match, so a
 * destination page still lights Destinations up. `/` is exempt, because
 * every path starts with it and the front page would otherwise be current
 * everywhere.
 */
export function isCurrent(href: string, pathname: string): boolean {
  const clean = href.split("?")[0];
  if (clean === "/") return pathname === "/";
  return pathname === clean || pathname.startsWith(`${clean}/`);
}

/** Is any link in this category the page we are on? Lights up the trigger. */
export function categoryIsCurrent(category: NavCategory, pathname: string): boolean {
  return category.links.some((link) => isCurrent(link.href, pathname));
}
