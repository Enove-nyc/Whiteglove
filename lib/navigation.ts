/**
 * What the site says it is, in the order it says it.
 *
 * Five dropdown categories in the bar — Destinations, Kosher, Plan, Travel,
 * Book — each a short list of links with no photographs or paragraphs. A
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
 *   3. **Nothing here may lead to an access code.** The Book category is
 *      resolved through lib/booking-access.ts, exactly as the old single
 *      "Search & Book" button was: when the owner has the search locked, its
 *      links go to the public assistance page instead of a password box.
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

export type NavCategory = {
  label: string;
  links: readonly NavLink[];
};

/**
 * The five dropdowns, in order. Destinations first: a visitor reads left to
 * right and stops at the first thing that sounds like what they came for.
 */
export const NAV_CATEGORIES: readonly NavCategory[] = [
  {
    label: "Destinations",
    links: [
      { label: "All", href: "/destinations" },
      { label: "Map", href: "/map" },
      { label: "Seasonal", href: "/destinations?view=seasonal" },
      { label: "Ideas", href: "/getaways" },
    ],
  },
  {
    label: "Kosher",
    links: [
      { label: "Food", href: "/kosher" },
      { label: "Stays", href: "/hotels" },
      { label: "Shuls", href: "/shuls" },
      { label: "Mikvahs", href: "/mikvaos" },
      { label: "Zmanim", href: "/zmanim" },
      { label: "Kevarim", href: "/tzaddikim" },
      { label: "Cemeteries", href: "/cemeteries" },
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
    ],
  },
] as const;

/**
 * Book — flights, hotels and cars, resolved so it can never end at a
 * password box. Kept apart from NAV_CATEGORIES because its three links share
 * one destination (BOOKING_SEARCH_PATH) that has to be resolved per request.
 */
export function bookCategoryFor(booking: BookingLink): NavCategory {
  if (!booking.searchIsPublic) {
    return { label: "Book", links: [{ label: booking.label, href: booking.href, description: booking.description }] };
  }
  return {
    label: "Book",
    links: [
      { label: "Flights", href: `${BOOKING_SEARCH_PATH}?type=flights` },
      { label: "Hotels", href: `${BOOKING_SEARCH_PATH}?type=hotels` },
      { label: "Cars", href: `${BOOKING_SEARCH_PATH}?type=cars` },
    ],
  };
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
