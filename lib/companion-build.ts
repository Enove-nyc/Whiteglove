import "server-only";

import { buildDays, type Itinerary } from "@/data/itinerary";
import { coordinatesToPoint } from "@/data/route-utils";
import { hechsherLabel } from "@/data/hechsherim";
import { allCrossings } from "@/lib/border-store";
import { borderCostForLegs } from "@/lib/border-legs";
import { readAssumptions } from "@/lib/planner-settings-store";
import { curatedKosherPlacesNear } from "@/lib/curated-kosher";
import { zmanimRequestFor } from "@/lib/trip-zmanim";
import { zmanimForDay } from "@/lib/zmanim-day-calculate";
import { itineraryToCompanionTrip } from "@/lib/companion-trip";
import type { CompanionTrip } from "@/data/companion-demo";

/**
 * An itinerary → the app's trip, with the kosher-and-Shabbos layer folded in.
 *
 * The ONE place that turns a planner itinerary into a CompanionTrip for a live
 * page, so /app and the shared /i/<id>/app never drift. It reads the same two
 * things the planner and the printed copy read — the border costs and the
 * planning figures — builds the day-by-day with the same buildDays(), and
 * works out candle-lighting, when Shabbos ends, and the kosher places near the
 * trip, all offline. Returns null when there is nothing to show yet (no dates,
 * or no days), and the caller decides what to say instead.
 */
export async function buildCompanionFromItinerary(
  itin: Itinerary,
  opts: { today: string; advisorName?: string; tripName?: string; client?: string },
): Promise<CompanionTrip | null> {
  if (!itin.startDate || !itin.endDate) return null;

  const [crossings, assume] = await Promise.all([allCrossings().catch(() => []), readAssumptions()]);
  const borderCost = borderCostForLegs(crossings, opts.today, assume.borderAllowanceMins);
  const days = buildDays(itin, borderCost, assume);
  if (days.length === 0) return null;

  const zmanimByDate: Record<string, ReturnType<typeof zmanimForDay>> = {};
  for (const request of zmanimRequestFor(days)) zmanimByDate[request.date] = zmanimForDay(request);

  const centerCoords =
    itin.lodging.find((l) => l.coordinates?.trim())?.coordinates ??
    itin.activities.find((a) => a.coordinates?.trim())?.coordinates;
  const center = coordinatesToPoint(centerCoords);
  const kosher = center
    ? curatedKosherPlacesNear({ lat: center.lat, lng: center.lng }, 25).slice(0, 6).map((k) => ({
        name: k.name,
        city: k.city,
        kind: k.category,
        diet: k.diet,
        hechsher: hechsherLabel(k.hechsher),
        km: k.km,
      }))
    : [];

  return itineraryToCompanionTrip(itin, days, {
    today: opts.today,
    advisorName: opts.advisorName,
    tripName: opts.tripName,
    client: opts.client,
    layer: { zmanimByDate, kosher },
  });
}
