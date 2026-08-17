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

import { providerIsAllowed } from "@/lib/travel/registry";
import { readProviderStages } from "@/lib/travel/registry-store";
import { searchProviders, type SearchOptions } from "@/lib/travel/search";
import { duffelFlights } from "@/lib/travel/adapters/duffel-flights";
import { routestackCars } from "@/lib/travel/adapters/routestack-cars";
import { routestackFlights } from "@/lib/travel/adapters/routestack-flights";
import { routestackHotels } from "@/lib/travel/adapters/routestack-hotels";
import { stay22Hotels } from "@/lib/travel/adapters/stay22-hotels";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchOutcome, SearchQuery, TravelCategory } from "@/lib/travel/types";

/**
 * Every adapter the site has, by category.
 *
 * TWO IN EVERY CATEGORY, WHICH IS WHAT MAKES IT A COMPARISON. One row per
 * category is a list. Flights now ask Duffel and RouteStack; hotels ask Stay22
 * and RouteStack; cars ask RouteStack, and a second car company is the next
 * thing missing here.
 *
 * DUFFEL IS IN, TRAVELPAYOUTS IS STILL OUT, AND THE REASON IS THE SAME ONE.
 * The rule was never "leave the existing integrations alone" — it was don't
 * wrap a path a visitor is using today. Duffel's search is admin-only behind
 * duffelRefusal, so reading the same account from here risks nothing a
 * customer can see. Travelpayouts is answering on /book right now, so it waits.
 */
const ADAPTERS: Record<TravelCategory, ProviderSearch[]> = {
  flight: [duffelFlights, routestackFlights],
  hotel: [stay22Hotels, routestackHotels],
  car: [routestackCars],
};

export async function searchTravel(
  category: TravelCategory,
  query: SearchQuery,
  audience: "public" | "admin",
  options: SearchOptions = {},
): Promise<SearchOutcome> {
  const stages = await readProviderStages();
  const allowed = ADAPTERS[category].filter((provider) =>
    providerIsAllowed(stages, provider.id, category, audience),
  );
  return searchProviders(category, allowed, query, options);
}

/** Which adapters exist for a category, whatever their stage. For the admin. */
export function adaptersFor(category: TravelCategory): ProviderSearch[] {
  return ADAPTERS[category];
}
