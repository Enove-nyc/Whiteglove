import { buildDays, type Itinerary } from "@/data/itinerary";
import type { borderCostForLegs } from "@/lib/border-legs";
import type { readAssumptions } from "@/lib/planner-settings-store";
import type { FollowStop } from "@/lib/trip-progress";

/** One day of a traveling trip — enough to say where a client is right now. */
export type TravelDay = { date: string; activities: FollowStop[]; lodging?: { name: string; address?: string } };

/**
 * The day-by-day shape "traveling now" needs, for one trip. Shared between
 * the planner's own pipeline (app/api/account/pipeline/route.ts) and the
 * agency-wide owner view (app/api/account/agency/traveling/route.ts) so the
 * two never compute "where is this trip right now" two different ways.
 */
export function travelDaysFor(
  itin: Itinerary,
  borderCost: ReturnType<typeof borderCostForLegs>,
  assume: Awaited<ReturnType<typeof readAssumptions>>,
): TravelDay[] {
  if (!itin.startDate || !itin.endDate) return [];
  return buildDays(itin, borderCost, assume).map((day) => ({
    date: day.date,
    activities: day.activities.map((a) => ({
      id: a.id,
      name: a.name,
      address: a.address,
      coordinates: a.coordinates,
      arrivalTime: a.arrivalTime,
      departureTime: a.departureTime,
    })),
    ...(day.lodging ? { lodging: { name: day.lodging.name, address: day.lodging.address } } : {}),
  }));
}
