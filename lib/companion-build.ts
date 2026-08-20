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
  opts: {
    today: string;
    advisorName?: string;
    tripName?: string;
    client?: string;
    /** Whether the kosher-and-Shabbos layer is worked out and shown. Off by default. */
    kosher?: boolean;
  },
): Promise<CompanionTrip | null> {
  if (!itin.startDate || !itin.endDate) return null;

  const [crossings, assume] = await Promise.all([allCrossings().catch(() => []), readAssumptions()]);
  const borderCost = borderCostForLegs(crossings, opts.today, assume.borderAllowanceMins);
  const days = buildDays(itin, borderCost, assume);
  if (days.length === 0) return null;

  // Only work the layer out when it will be shown — no zmanim, no kosher lookup
  // for an account that keeps the app a plain planner.
  const kosherOn = opts.kosher === true;
  const zmanimByDate: Record<string, ReturnType<typeof zmanimForDay>> = {};
  let kosher: {
    name: string;
    city: string;
    kind: string;
    diet?: string;
    hechsher: string;
    km: number;
  }[] = [];
  if (kosherOn) {
    for (const request of zmanimRequestFor(days)) zmanimByDate[request.date] = zmanimForDay(request);
    const centerCoords =
      itin.lodging.find((l) => l.coordinates?.trim())?.coordinates ??
      itin.activities.find((a) => a.coordinates?.trim())?.coordinates;
    const center = coordinatesToPoint(centerCoords);
    kosher = center
      ? curatedKosherPlacesNear({ lat: center.lat, lng: center.lng }, 25).slice(0, 6).map((k) => ({
          name: k.name,
          city: k.city,
          kind: k.category,
          diet: k.diet,
          hechsher: hechsherLabel(k.hechsher),
          km: k.km,
        }))
      : [];
  }

  return itineraryToCompanionTrip(itin, days, {
    today: opts.today,
    advisorName: opts.advisorName,
    tripName: opts.tripName,
    client: opts.client,
    kosher: kosherOn,
    layer: { zmanimByDate, kosher },
  });
}
