import Link from "next/link";
import PrintableItinerary from "@/components/PrintableItinerary";
import { emptyItinerary } from "@/data/itinerary";
import { getSharedItineraryByShareId } from "@/lib/account-store";
import { burialsForSlugs } from "@/lib/kever-search";

export const dynamic = "force-dynamic";

// Printing a trip somebody shared with you.
//
// The same document the owner gets — cover, header, one page per day — because
// the person handed the itinerary is usually the one who actually wants it on
// paper. It used to print whatever the web page looked like: navigation bar,
// footer, advertisement and all.
export default async function SharedItineraryPrintPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedItineraryByShareId(shareId);

  if (!shared) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-20 text-center">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">This trip isn&apos;t available</h1>
        <p className="mt-4 text-stone-600">The link may have been turned off. Ask the person who shared it for a fresh one.</p>
        <Link href="/" className="mt-8 inline-block border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white">
          Back to White Glove
        </Link>
      </main>
    );
  }

  const itin = { ...emptyItinerary(), ...shared.itinerary };
  // Rendered on the server, so the burials are read straight from the data
  // rather than fetched the way the planner has to.
  const burials = burialsForSlugs(itin.activities.map((a) => a.keverSlug ?? ""));

  return <PrintableItinerary itin={itin} burials={burials} sharedBy={shared.ownerName || shared.ownerEmail} />;
}
