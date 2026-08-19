import { redirect } from "next/navigation";
import CompanionApp from "@/components/companion/CompanionApp";
import { getPlan } from "@/lib/account-plan-store";
import { mayUseCompanionApp } from "@/lib/account-limits";
import { getSharedItineraryByShareId } from "@/lib/account-store";
import { buildDays, emptyItinerary } from "@/data/itinerary";
import { coordinatesToPoint } from "@/data/route-utils";
import { itineraryToCompanionTrip } from "@/lib/companion-trip";
import { allCrossings } from "@/lib/border-store";
import { borderCostForLegs } from "@/lib/border-legs";
import { readAssumptions } from "@/lib/planner-settings-store";
import { readBrand } from "@/lib/business-brand-store";
import { zmanimRequestFor } from "@/lib/trip-zmanim";
import { zmanimForDay } from "@/lib/zmanim-day-calculate";
import { curatedKosherPlacesNear } from "@/lib/curated-kosher";
import { hechsherLabel } from "@/data/hechsherim";
import { pageMetadata } from "@/lib/seo";

// A link given to a client, not found. It carries somebody's dates and stops;
// it does not belong in a search result.
export const metadata = pageMetadata({
  title: "Your trip",
  description: "The trip in your pocket — a day at a time, the kosher side of each day, and the Shabbos that stops early.",
  path: "/i",
  noIndex: true,
});

export const dynamic = "force-dynamic";

/**
 * A shared trip, opened as the White Glove app.
 *
 * This is how a Business account hands a client their trip on a phone: the same
 * share token the printed copy uses (lib/account-store.ts), rendered as the app
 * rather than the document. The client needs no account and no plan — they were
 * given the link.
 *
 * THE APP STAYS A BUSINESS CAPABILITY. Only a trip whose OWNER is on Business
 * can be opened this way; anyone else's share link falls back to the ordinary
 * read-only itinerary at /i/[shareId]. So turning a trip into an app is
 * something Business does, even though the person reading it is not.
 */
export default async function SharedAppPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedItineraryByShareId(shareId);
  if (!shared) redirect(`/i/${shareId}`); // the shared view shows the "not available" notice

  // The app is a Business capability; a non-Business owner's link is still a
  // real shared trip, just as the document rather than the app.
  const plan = await getPlan(shared.ownerEmail);
  if (!mayUseCompanionApp(plan)) redirect(`/i/${shareId}`);

  const itin = { ...emptyItinerary(), ...shared.itinerary };
  if (!itin.startDate || !itin.endDate) redirect(`/i/${shareId}`);

  const [crossings, assume, brand] = await Promise.all([
    allCrossings().catch(() => []),
    readAssumptions(),
    readBrand(shared.ownerEmail).catch(() => null),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const borderCost = borderCostForLegs(crossings, today, assume.borderAllowanceMins);
  const days = buildDays(itin, borderCost, assume);
  if (days.length === 0) redirect(`/i/${shareId}`);

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

  const trip = itineraryToCompanionTrip(itin, days, {
    today,
    advisorName: brand?.enabled ? brand.name : shared.ownerName,
    client: shared.client,
    layer: { zmanimByDate, kosher },
  });

  return (
    <main>
      <CompanionApp trip={trip} />
    </main>
  );
}
