import { redirect } from "next/navigation";
import CompanionApp from "@/components/companion/CompanionApp";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getSharedTraveler } from "@/lib/account-store";
import { emptyItinerary, redactForTraveler } from "@/data/itinerary";
import { buildCompanionFromItinerary } from "@/lib/companion-build";
import { readBrand } from "@/lib/business-brand-store";
import { getAppPrefs } from "@/lib/app-prefs-store";
import { pageMetadata } from "@/lib/seo";

// One traveler's own link, not found. It carries their family's dates and
// stops; it does not belong in a search result.
export const metadata = pageMetadata({
  title: "Your trip",
  description: "The trip in your pocket — a day at a time, with a travel wallet kept for when there is no signal.",
  path: "/t",
  noIndex: true,
});

export const dynamic = "force-dynamic";

/**
 * A trip, opened through ONE TRAVELER'S OWN LINK rather than the one
 * trip-wide link — for a family or group trip where each person (or each
 * family, sharing a `family` label) is handed their own door in. Mirrors
 * app/i/[shareId]/app/page.tsx exactly, with one difference: the itinerary is
 * passed through redactForTraveler (data/itinerary.ts) first, so this
 * traveler's own unit's notes stay, and every other traveler's notes,
 * email and phone are stripped before the trip is even built. Attachments
 * are already stripped for every client link, traveler-scoped or not — see
 * getSharedTraveler in lib/account-store.ts.
 *
 * The chat thread is the trip's own — shared with every traveler on it and
 * the advisor, the same one link opens — a traveler-scoped link changes what
 * is SEEN, not who the conversation is with.
 */
export default async function TravelerAppPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedTraveler(shareId);
  if (!shared) redirect("/");

  const plan = await getPlan(shared.ownerEmail);
  if (!mayServeCompanionClients(plan)) redirect("/");

  const [brand, prefs] = await Promise.all([
    readBrand(shared.ownerEmail).catch(() => null),
    getAppPrefs(shared.ownerEmail).catch(() => ({ kosherFeatures: false })),
  ]);
  const redacted = redactForTraveler({ ...emptyItinerary(), ...shared.itinerary }, shared.traveler.id);
  const trip = await buildCompanionFromItinerary(redacted, {
    today: new Date().toISOString().slice(0, 10),
    advisorName: shared.advisor || (brand?.enabled ? brand.name : undefined) || shared.ownerName,
    client: shared.traveler.family?.trim() || shared.traveler.name,
    kosher: prefs.kosherFeatures,
  });
  if (!trip) redirect("/");

  const chat = {
    shareId: shared.tripShareId ?? shareId,
    side: "client" as const,
    advisorName: trip.contactName ?? "your advisor",
  };

  return (
    <main>
      <CompanionApp trip={trip} chat={chat} />
    </main>
  );
}
