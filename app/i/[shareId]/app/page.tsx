import { redirect } from "next/navigation";
import CompanionApp from "@/components/companion/CompanionApp";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getSharedItineraryByShareIdWithAttachments } from "@/lib/account-store";
import { emptyItinerary } from "@/data/itinerary";
import { buildCompanionFromItinerary } from "@/lib/companion-build";
import { readBrand } from "@/lib/business-brand-store";
import { pageMetadata } from "@/lib/seo";

// A link given to a client, not found. It carries somebody's dates and stops;
// it does not belong in a search result.
export const metadata = pageMetadata({
  title: "Your trip",
  description: "The trip in your pocket — a day at a time, with a travel wallet kept for when there is no signal.",
  path: "/i",
  noIndex: true,
});

export const dynamic = "force-dynamic";

/**
 * A shared trip, opened as the White Glove app.
 *
 * This is how a Business account hands a client their trip on a phone: the
 * per-trip share token (lib/account-store.ts), rendered as the app rather than
 * the document. The client needs no account and no plan — they were given the
 * link, and it opens THIS trip and no other of the agency's.
 *
 * HANDING THE APP TO A CLIENT IS BUSINESS-ONLY. Gold has the app for its own
 * trips, but only a trip whose OWNER is on Business opens this way for a client;
 * anyone else's share link falls back to the ordinary read-only itinerary at
 * /i/[shareId]. The gate is mayServeCompanionClients, the client-facing half.
 */
export default async function SharedAppPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedItineraryByShareIdWithAttachments(shareId);
  if (!shared) redirect(`/i/${shareId}`); // the shared view shows the "not available" notice

  // Handing the app to a client is Business-only; a non-Business owner's link
  // is still a real shared trip, just as the document rather than the app.
  const plan = await getPlan(shared.ownerEmail);
  if (!mayServeCompanionClients(plan)) redirect(`/i/${shareId}`);

  const brand = await readBrand(shared.ownerEmail).catch(() => null);
  const trip = await buildCompanionFromItinerary(
    { ...emptyItinerary(), ...shared.itinerary },
    {
      today: new Date().toISOString().slice(0, 10),
      advisorName: shared.advisor || (brand?.enabled ? brand.name : undefined) || shared.ownerName,
      client: shared.client,
    },
  );
  if (!trip) redirect(`/i/${shareId}`); // no dates / no days — the document still reads

  // The client's side of the thread: this link IS the channel to their advisor.
  const chat = {
    shareId,
    side: "client" as const,
    advisorName: trip.contactName ?? "your advisor",
  };

  return (
    <main>
      <CompanionApp trip={trip} chat={chat} />
    </main>
  );
}
