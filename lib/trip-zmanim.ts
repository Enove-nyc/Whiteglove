/**
 * Where each day of a trip should have its zmanim worked out for.
 *
 * Kept apart from lib/zmanim-day.ts, which does the calculating: that module
 * carries the KosherJava port and belongs on the server, and this one only
 * reads the plan and asks. The planner is a client component, so anything it
 * imports is in the browser bundle of every traveller — including the ones who
 * never turn the times on.
 *
 * WHERE A DAY IS, IS TWO ANSWERS. The traveller wakes where they slept last
 * night and goes to sleep where tonight's hotel is, and on a day that drives
 * from Warsaw to Kraków those are not the same clock. Both are sent; the
 * server collapses them back into one when they agree, which is most days.
 */

import type { ItineraryDay } from "@/data/itinerary";
import type { ZmanimDay } from "@/lib/zmanim-day";

export type TripZmanim = Record<string, ZmanimDay>;

type DayPlace = { coordinates?: string; country?: string };

function firstLocated(day: ItineraryDay | undefined): DayPlace | undefined {
  const stop = day?.activities.find((activity) => activity.coordinates?.trim());
  return stop ? { coordinates: stop.coordinates, country: stop.country } : undefined;
}

function lastLocated(day: ItineraryDay | undefined): DayPlace | undefined {
  const located = day?.activities.filter((activity) => activity.coordinates?.trim()) ?? [];
  const stop = located[located.length - 1];
  return stop ? { coordinates: stop.coordinates, country: stop.country } : undefined;
}

/**
 * A hotel carries no country — only an address — so the country of the day's
 * stops is lent to it. Both ends of the same day are almost always the same
 * country, and where they are not, the server falls back to the nearest city
 * it holds a timezone for rather than trusting this.
 */
function bed(day: ItineraryDay | undefined, country?: string): DayPlace | undefined {
  const coordinates = day?.lodging?.coordinates?.trim();
  return coordinates ? { coordinates, country } : undefined;
}

/** What to ask the server for, one entry per day of the trip. */
export function zmanimRequestFor(days: ItineraryDay[]) {
  return days.map((day, index) => {
    const countryToday = firstLocated(day)?.country ?? lastLocated(day)?.country;
    const previous = index > 0 ? days[index - 1] : undefined;

    // Woke where last night's bed was; failing that, the day's first stop.
    const morning =
      bed(previous, firstLocated(previous)?.country ?? countryToday) ?? firstLocated(day) ?? bed(day, countryToday);
    // Sleeps at tonight's hotel; failing that, wherever the day ends up.
    const evening = bed(day, countryToday) ?? lastLocated(day) ?? morning;

    return { date: day.date, morning, evening };
  });
}

/**
 * Ask for the trip's times. Returns {} on any failure — the times are a help
 * on top of the itinerary, and a planner that will not render because a fetch
 * failed would be a worse trade than a day without them.
 */
export async function fetchTripZmanim(days: ItineraryDay[]): Promise<TripZmanim> {
  const wanted = zmanimRequestFor(days);
  if (!wanted.length) return {};
  try {
    const response = await fetch("/api/zmanim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: wanted }),
    });
    if (!response.ok) return {};
    const data = (await response.json()) as { days?: ZmanimDay[] };
    const out: TripZmanim = {};
    for (const day of data.days ?? []) out[day.date] = day;
    return out;
  } catch {
    return {};
  }
}
