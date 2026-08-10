/**
 * "Where should I stay?" — turning a quarter we recommend into a search for it.
 *
 * THE GAP THIS CLOSES. /hotels already told a visitor which part of town to be
 * in: the shuls are here, the kosher food is here, this is the bit inside the
 * eruv. Then the only search on the page went to the whole city. Somebody who
 * read "stay in the Marais" and pressed the button got every hotel in Paris,
 * and had to re-type the quarter into a partner site that has never heard of
 * our reason for naming it. The research was the asset and the search threw it
 * away.
 *
 * WHAT A QUARTER SEARCH IS. The partner takes a free-text address, so the
 * quarter is expressed as one: "Le Marais, Paris". That is a real address a
 * mapping search resolves, and it centres the results on the quarter rather
 * than filtering a city list by a name the partner does not hold. No new
 * partner capability is needed, which is why this is a string rule and not an
 * integration.
 *
 * THE HONESTY RULE STILL BINDS. A quarter is a place to search, never a place
 * to sleep — `docs/commercial-pivot-plan.md` §6: "a neighbourhood
 * recommendation is never presented as a property". Nothing here names a
 * hotel, claims one is kosher, or implies the quarter has been booked. It
 * moves the map pin and carries the dates.
 *
 * PURE, AND THAT IS THE POINT. The address rule is the whole behaviour worth
 * testing, so it lives here rather than inside a component where it could only
 * be checked by rendering one.
 */

import type { AffiliateRequest } from "@/lib/affiliate/partners";
import type { StaySearch } from "@/lib/stay-search";

/** The fields of a recommended quarter this module needs. */
export type QuarterLike = {
  slug: string;
  name: string;
  city: string;
  country: string;
  note: string;
};

/**
 * The address the partner is centred on.
 *
 * The quarter's name is not always enough on its own — "Centre" and "Old Town"
 * name a hundred places — so the city is always carried. When the quarter's
 * recorded name already opens with the city (some are written "Rome, Monteverde"
 * in the admin), it is not repeated; a doubled city reads as a mistake and can
 * confuse the partner's own geocoder.
 */
export function quarterAddress(area: QuarterLike): string {
  const name = area.name.trim();
  const city = area.city.trim();
  if (!name) return city;
  if (!city) return name;
  const lower = name.toLowerCase();
  if (lower === city.toLowerCase()) return city;
  if (lower.startsWith(`${city.toLowerCase()},`)) return name;
  return `${name}, ${city}`;
}

/**
 * The booking request for a quarter, carrying whatever the visitor already
 * typed.
 *
 * Dates and party size come from the search that produced this page, so
 * choosing a quarter never asks for them a second time. `placement` is fixed
 * rather than passed: every one of these clicks is the same act, and the click
 * record is only worth reading if the name is stable.
 */
export function quarterRequest(area: QuarterLike, search: StaySearch): AffiliateRequest {
  return {
    product: "hotel",
    destination: quarterAddress(area),
    destinationSlug: area.slug,
    checkIn: search.checkIn,
    checkOut: search.checkOut,
    adults: search.adults,
    children: search.children,
    rooms: search.rooms,
    page: "/hotels",
    placement: "quarter",
  };
}

/**
 * The quarters worth offering as a choice.
 *
 * A quarter with no note is one nobody has written up yet. Offering it would
 * be a button whose only content is a place name — the visitor cannot tell why
 * it is there, which is the "empty section" failure the house rules name. It
 * stays out of the picker; the directory below still lists it.
 */
export function offerableQuarters<T extends QuarterLike>(areas: readonly T[]): T[] {
  return areas.filter((area) => area.name.trim().length > 0 && area.note.trim().length > 0);
}
