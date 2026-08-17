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
import { routestackCars } from "@/lib/travel/adapters/routestack-cars";
import { stay22Hotels } from "@/lib/travel/adapters/stay22-hotels";
import type { ProviderSearch } from "@/lib/travel/provider";
import type { SearchOutcome, SearchQuery, TravelCategory } from "@/lib/travel/types";

/**
 * Every adapter the site has, by category.
 *
 * Duffel and Travelpayouts are deliberately absent for now. Both already
 * answer through their own routes — Duffel behind its admin guard, Travelpayouts
 * on /book — and wrapping a working public path is the one change in this
 * project that could break something a visitor uses today. They join when the
 * seam has proven itself on a category where nothing is at stake.
 */
const ADAPTERS: Record<TravelCategory, ProviderSearch[]> = {
  flight: [],
  hotel: [stay22Hotels],
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
