/**
 * Which seasonal prompt, if any, the site should be showing right now.
 *
 * Two questions, and both have to be yes: is the window open (the calendar and
 * the owner's overrides, lib/seasonal-windows-store.ts), and does the category
 * actually hold destinations (the live directory). The second is the one that
 * keeps this honest — a Pesach prompt leading to an empty filter is worse than
 * no prompt, because the traveler has spent a click to be told nothing.
 *
 * READ ONCE PER PAGE, not per surface. The destinations hub already loads the
 * directory; the front page does not, so it pays for one cached read.
 */

import { openSpotlight, type SeasonalWindow, type SpotlightKey } from "@/data/seasonal-spotlight";
import { deriveYomTovThemes } from "@/data/vacation-destinations";
import { readSeasonalWindows } from "@/lib/seasonal-windows-store";
import { getVacationDestinations, type VacationDestinationItem } from "@/lib/vacation-destinations-view";

/**
 * Fewer than this is not a category worth a prompt of its own.
 *
 * The same floor the filter chips use (MIN_TRIP_TYPE_DESTINATIONS in
 * lib/vacation-ideas.ts): one destination answering "Pesach" is a destination,
 * not a way of choosing between them.
 */
export const MIN_SPOTLIGHT_DESTINATIONS = 2;

/** How many live destinations answer each Yom Tov category, in their own words. */
export function spotlightCounts(destinations: readonly VacationDestinationItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const destination of destinations) {
    for (const theme of deriveYomTovThemes(destination.bestFor)) {
      counts[theme] = (counts[theme] ?? 0) + 1;
    }
  }
  return counts;
}

/** The prompt to show, given what the directory holds. Null is the common answer. */
export function spotlightFrom(
  windows: readonly SeasonalWindow[],
  destinations: readonly VacationDestinationItem[],
  today: string,
): SeasonalWindow | null {
  const counts = spotlightCounts(destinations);
  return openSpotlight(windows, today, (key: SpotlightKey) => (counts[key] ?? 0) >= MIN_SPOTLIGHT_DESTINATIONS);
}

/** The prompt to show right now, reading everything it needs. */
export async function currentSpotlight(today = new Date().toISOString().slice(0, 10)): Promise<SeasonalWindow | null> {
  const [windows, destinations] = await Promise.all([readSeasonalWindows(today), getVacationDestinations()]);
  return spotlightFrom(windows, destinations, today);
}
