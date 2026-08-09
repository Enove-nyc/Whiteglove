// Reading the three lists a vacation page is built from, in one place.
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

import { kosherEateries } from "@/data/kosher-eateries";
import { getAreaList, getAttractionList, getStayList } from "@/lib/attractions-view";
import type { VacationSources } from "@/lib/vacation-ideas";

export async function loadVacationSources(): Promise<VacationSources> {
  const [attractions, stays, areas] = await Promise.all([getAttractionList(), getStayList(), getAreaList()]);
  return { attractions, stays, areas, eateries: kosherEateries };
}
