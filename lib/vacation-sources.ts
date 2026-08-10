// Reading the lists a vacation page is built from, in one place.
//
// SEPARATE FROM lib/vacation-ideas.ts ON PURPOSE. That module is imported by
// the hub, which runs in the browser; this one reaches the database through
// lib/attractions-view.ts. Putting the two together would drag the server read
// into the client bundle — the same mistake the search bar used to make when
// it imported the whole cemetery database in order to filter a dropdown.
//
// Reads through the view rather than the data files, so anything the owner
// adds in the admin appears on the vacation pages without a redeploy, exactly
// as it already does on /attractions and /stops. Eateries have no owner-added
// layer yet, so they come from the file.
//
// TWO READS, AND THE DIFFERENCE IS THE POINT OF THIS FILE NOW.
//
// `loadVacationSources()` is everything, for the pages that really do compare
// every destination — the hub's filters and the front page's cards.
//
// `loadDestinationSources()` is one destination's towns. A destination page
// used to call the first one: opening /vacation-ideas/rome read every
// attraction, every stay and every quarter on the site, then filtered the
// result down to Rome in memory, and the page was marked force-dynamic so it
// did that on every single view. Direct entry sat on "Loading vacation
// destinations…" while it happened. Now the page is prerendered from the static
// half and this read only supplies what the practical sections need.
//
// BOTH ARE CACHED AND TAGGED. The reason these were uncached is that an entry
// the owner adds in the admin has to appear without a deploy — which the tag
// gives, immediately, on save (app/admin/add/actions.ts), rather than by
// refusing to cache anything ever.

import { unstable_cache } from "next/cache";
import { kosherEateries } from "@/data/kosher-eateries";
import type { VacationDestination } from "@/data/vacation-destinations";
import { getAreaList, getAttractionList, getStayList } from "@/lib/attractions-view";
import type { VacationSources } from "@/lib/vacation-ideas";

/** Cleared whenever the owner publishes or edits an attraction, stay or quarter. */
export const VACATION_SOURCES_TAG = "vacation-sources";

/** Fifteen minutes is the backstop; the tag is the ordinary path. */
const REVALIDATE = 900;

const allSources = unstable_cache(
  async (): Promise<VacationSources> => {
    const [attractions, stays, areas] = await Promise.all([getAttractionList(), getStayList(), getAreaList()]);
    return { attractions, stays, areas, eateries: kosherEateries };
  },
  ["vacation-sources-all"],
  { tags: [VACATION_SOURCES_TAG], revalidate: REVALIDATE },
);

export async function loadVacationSources(): Promise<VacationSources> {
  return allSources();
}

/**
 * One destination's towns, and the towns it shops in.
 *
 * The kosherBase cities are included in the same read: a page about the
 * Dolomites has to be able to say what is on record in Zurich, and two reads to
 * find that out would undo the point of narrowing this one.
 *
 * Keyed on the cities rather than on the slug, so two destinations covering the
 * same towns share the entry, and so a change to a destination's city list
 * cannot serve the previous list's answer.
 */
const sourcesForCities = unstable_cache(
  async (cities: string[]): Promise<VacationSources> => {
    const [attractions, stays, areas] = await Promise.all([
      getAttractionList(cities),
      getStayList(cities),
      getAreaList(cities),
    ]);
    const wanted = new Set(cities);
    return { attractions, stays, areas, eateries: kosherEateries.filter((eatery) => wanted.has(eatery.city)) };
  },
  ["vacation-sources-cities"],
  { tags: [VACATION_SOURCES_TAG], revalidate: REVALIDATE },
);

export async function loadDestinationSources(destination: VacationDestination): Promise<VacationSources> {
  const cities = [...new Set([...destination.cities, ...(destination.kosherBase?.cities ?? [])])].sort();
  return sourcesForCities(cities);
}
