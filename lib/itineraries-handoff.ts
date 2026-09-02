import { BRAND_ORIGIN, BRAND_NAME } from "@/lib/site-brand-core";

/**
 * CARRYING A TRIP ON TO WHITE GLOVE ITINERARIES.
 *
 * THERE IS NOTHING TO TRANSFER, and that is the whole of why this is a link
 * rather than a feature. Both products read one store — proven in production,
 * see AGENTS.md — so a trip built here, and the places saved with it, are
 * already on the other side under the same account. The handoff is telling
 * somebody that, and taking them to the right page.
 *
 * IT GOES ONE WAY ONLY. Kosher Travel may point at Itineraries; Itineraries
 * never points back. That is a standing rule and not a layout preference: the
 * other product is positioned as general travel software, and a link home from
 * it would tell every one of its customers that it is really something else.
 * So this module is only ever rendered on the kosher brand, and the component
 * that uses it checks.
 *
 * IT PROMISES NO PLANNING. White Glove does not plan anybody's trip. What is
 * on the other side is the same self-service tools with more of them — flights
 * and hotels and documents in one place — and the wording says so rather than
 * implying somebody is waiting to take the trip off their hands.
 *
 * AND IT DOES NOT PRETEND THEY WILL ALREADY BE SIGNED IN. A session belongs to
 * a domain; crossing to another one means signing in again, with the same
 * account. Saying so is one short sentence, and finding out the hard way is a
 * traveller deciding the site is broken.
 */

/** Where a trip continues. The planner there, not a marketing page. */
export function continueTripHref(): string {
  return `${BRAND_ORIGIN.itineraries}/itinerary`;
}

/** What the invitation says, in one place so it cannot drift. */
export const HANDOFF_HEADING = `Carry this trip on to ${BRAND_NAME.itineraries}`;

export const HANDOFF_BODY =
  "Same account, same trip — it is already there. Itineraries is the fuller planner: flights, hotels, transport, documents and the day-by-day, in one place. Sign in there with this account to pick it up.";

export const HANDOFF_ACTION = "Open it in Itineraries";

/**
 * Whether to offer it at all.
 *
 * Only on the kosher brand, and only to somebody who has actually built
 * something — an invitation to carry on with a trip that does not exist yet is
 * an advertisement, and this site does not put one in front of an empty
 * planner.
 */
export function shouldOfferHandoff({ brand, hasTrip }: { brand: string; hasTrip: boolean }): boolean {
  return brand === "kosher" && hasTrip;
}
