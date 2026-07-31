/**
 * Gathering what the site knows about each stop on somebody's trip.
 *
 * Kept apart from lib/command-center.ts, which holds the rules and touches
 * nothing. This is the half that reads — the built-in records, and the
 * database where there is one — so the rules stay testable.
 */

import type { ItinActivity, Itinerary } from "@/data/itinerary";
import { getCemetery } from "@/data/cemeteries";
import { getCemeteryView } from "@/lib/cemeteries-view";
import { optionalRead } from "@/lib/db-optional";
import type { StopFacts } from "@/lib/command-center";

/**
 * Every activity on the itinerary, as facts the rules can judge.
 *
 * A stop picked from the kever directory carries `keverSlug`, so the beis
 * hachaim's own record answers who can let you in and whether the grave has
 * been checked. Anything else — a hotel, a booking, something typed by hand —
 * is taken at face value from what the traveler entered.
 */
export async function stopsForTrip(itinerary: Itinerary): Promise<StopFacts[]> {
  const activities = itinerary.activities ?? [];
  return Promise.all(activities.map(factsFor));
}

async function factsFor(activity: ItinActivity): Promise<StopFacts> {
  const base: StopFacts = {
    id: activity.id,
    name: activity.name,
    yiddishName: activity.yiddishName,
    href: activity.href,
    plannedDate: activity.date,
    coordinates: activity.coordinates,
    address: activity.address,
    contacts: activity.phone ? [{ label: "On the itinerary", phone: activity.phone }] : [],
    isKever: Boolean(activity.keverSlug),
  };

  if (!activity.keverSlug) return base;

  // What the site holds about this beis hachaim, which is more than the
  // itinerary ever carried: the shomer's number, and whether the grave itself
  // has been checked rather than just the street.
  const record = await optionalRead(
    `the beis hachaim ${activity.keverSlug} for the command centre`,
    () => getCemeteryView(activity.keverSlug!),
    getCemetery(activity.keverSlug) ?? null,
  );
  if (!record) return base;

  return {
    ...base,
    name: activity.name || record.name,
    yiddishName: activity.yiddishName || record.yiddishName,
    href: activity.href || `/cemeteries/${record.slug}`,
    coordinates: activity.coordinates || record.coordinates,
    address: activity.address || record.address,
    contacts: [
      ...base.contacts,
      ...(record.accessContacts ?? []).map((c) => ({ label: c.label, phone: c.phone, note: c.note })),
    ],
    isKever: true,
  };
}
