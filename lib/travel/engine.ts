/**
 * The one door into travel inventory.
 *
 * A page asks for a category and says who is looking. This decides which
 * companies may answer that particular question — off, admin-only, or public,
 * per provider per category — and runs them together under one deadline.
 *
 * NOTHING PUBLIC USES THIS YET, ON PURPOSE. Every existing page keeps calling
 * the module it already called; this is the seam beside them, exercised by the
 * admin screen until the owner has watched it work and says otherwise.
 */

import { providerHasBudget } from "@/lib/travel/provider-budget";
import { providerIsAllowed } from "@/lib/travel/registry";
import { readProviderStages } from "@/lib/travel/registry-store";
import { searchProviders, type SearchOptions } from "@/lib/travel/search";
import { duffelFlights } from "@/lib/travel/adapters/duffel-flights";
import { routestackCars } from "@/lib/travel/adapters/routestack-cars";
import { routestackFlights } from "@/lib/travel/adapters/routestack-flights";
import { routestackHotels } from "@/lib/travel/adapters/routestack-hotels";
import { stay22Hotels } from "@/lib/travel/adapters/stay22-hotels";
import { travelpayoutsFlights } from "@/lib/travel/adapters/travelpayouts-flights";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { ProviderId, SearchOutcome, SearchQuery, TravelCategory } from "@/lib/travel/types";

/**
 * Every adapter the site has, by category.
 *
 * TWO WHO CAN FACE A TRAVELER, WHICH IS WHAT MAKES IT A COMPARISON. Duffel is
 * counted in the flight list and cannot be counted on: it would make White
 * Glove the seller, so it answers the admin and nobody else, whatever its
 * stage says. That leaves RouteStack and Travelpayouts as the two third
 * parties who could publicly answer a flight search, and Stay22 and RouteStack
 * for hotels.
 *
 * CARS HAVE ONE. That is the real gap in this table and it is not an
 * oversight: no second car company is signed up. It is also the category
 * where one is worth the least — cars had no inventory here at all until
 * RouteStack, so the choice today is one company or none.
 *
 * Each adapter wraps the module its own public page already calls rather than
 * replacing it. Delete any of these files and /book, the flight page and the
 * places-to-stay page all carry on unchanged.
 */
const ADAPTERS: Record<TravelCategory, ProviderSearch[]> = {
  flight: [duffelFlights, routestackFlights, travelpayoutsFlights],
  hotel: [stay22Hotels, routestackHotels],
  car: [routestackCars],
};

/**
 * A provider where WHITE GLOVE would be the one who sold the ticket.
 *
 * Duffel is a real booking API: the order is ours, the margin is ours, and so
 * is the refund, the chargeback and the phone call when a gate is locked. The
 * owner's decision is that nothing of that shape faces a traveler — third
 * parties take the booking, or nobody does.
 *
 * Declared on the adapter and read from the adapter, so there is one place
 * where it is true. A list kept beside the adapters would be a second place to
 * forget.
 */
export function weWouldBeTheSeller(provider: ProviderId, category: TravelCategory): boolean {
  return ADAPTERS[category].some((adapter) => adapter.id === provider && adapter.fulfilment === "api-booking");
}

export async function searchTravel(
  category: TravelCategory,
  query: SearchQuery,
  audience: "public" | "admin",
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  const stages = await readProviderStages();
  const permitted = ADAPTERS[category].filter((provider) => {
    if (!providerIsAllowed(stages, provider.id, category, audience)) return false;
    // THE RULE THAT NO SETTING CAN OVERRIDE. Even set to "public" by hand, in
    // the store, a provider that would make us the seller does not answer a
    // visitor. The stage decides how far a provider has been trusted; this
    // decides what it is allowed to be trusted with.
    return audience === "admin" || provider.fulfilment !== "api-booking";
  });

  // A provider that has spent its month is not asked, by anybody. Checked in
  // parallel so a second metered provider does not cost a second round trip,
  // and the page that loses one shows what it showed before that provider
  // existed rather than an error.
  const budgets = await Promise.all(permitted.map((provider) => providerHasBudget(provider.id)));
  const allowed = permitted.filter((_, index) => budgets[index]);

  return searchProviders(category, allowed, query, options);
}

/** Which adapters exist for a category, whatever their stage. For the admin. */
export function adaptersFor(category: TravelCategory): ProviderSearch[] {
  return ADAPTERS[category];
}
