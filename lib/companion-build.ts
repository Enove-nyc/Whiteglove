import "server-only";

import { buildDays, type Itinerary } from "@/data/itinerary";
import { allCrossings } from "@/lib/border-store";
import { borderCostForLegs } from "@/lib/border-legs";
import { readAssumptions } from "@/lib/planner-settings-store";
import { itineraryToCompanionTrip } from "@/lib/companion-trip";
import type { CompanionTrip } from "@/data/companion-demo";

/**
 * An itinerary → the app's trip.
 *
 * The ONE place that turns a planner itinerary into a CompanionTrip for a live
 * page, so /app and the shared /i/<id>/app never drift. It reads the same two
 * things the planner and the printed copy read — the border costs and the
 * planning figures — and builds the day-by-day with the same buildDays().
 * Returns null when there is nothing to show yet (no dates, or no days), and
 * the caller decides what to say instead.
 */
export async function buildCompanionFromItinerary(
  itin: Itinerary,
  opts: {
    today: string;
    advisorName?: string;
    tripName?: string;
    client?: string;
    tripId?: string;
  },
): Promise<CompanionTrip | null> {
  if (!itin.startDate || !itin.endDate) return null;

  const [crossings, assume] = await Promise.all([allCrossings().catch(() => []), readAssumptions()]);
  const borderCost = borderCostForLegs(crossings, opts.today, assume.borderAllowanceMins);
  const days = buildDays(itin, borderCost, assume);
  if (days.length === 0) return null;

  return itineraryToCompanionTrip(itin, days, {
    today: opts.today,
    advisorName: opts.advisorName,
    tripName: opts.tripName,
    client: opts.client,
    tripId: opts.tripId,
  });
}
