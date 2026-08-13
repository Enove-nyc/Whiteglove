import PartnerWidgetEmbed from "@/components/PartnerWidgetEmbed";
import { aviasalesWidgetSrc } from "@/lib/partner-widgets";

export const dynamic = "force-dynamic";

/**
 * Aviasales search form for the /book Flights iframe.
 *
 * The form is injected next to a real script tag inside PartnerWidgetEmbed.
 * next/script left this iframe empty (and looked like a missing page).
 */
export default async function EmbedFlightsPage({
  searchParams,
}: {
  searchParams: Promise<{
    origin?: string;
    destination?: string;
    depart?: string;
    return?: string;
    one_way?: string;
    adults?: string;
    nonstop?: string;
  }>;
}) {
  const q = await searchParams;
  const src = aviasalesWidgetSrc({
    origin: q.origin,
    destination: q.destination,
    departDate: q.depart,
    returnDate: q.return,
    oneWay: q.one_way === "true",
    adults: q.adults ? Number(q.adults) : undefined,
    nonstop: q.nonstop === "true",
  });

  if (!src) {
    return (
      <p className="p-4 text-sm leading-6 text-stone-600">
        Flight search is not available on this page. Use Search booking partners and open the partner from there.
      </p>
    );
  }

  return (
    <div className="w-full">
      <h1 className="sr-only">Flight search</h1>
      <PartnerWidgetEmbed src={src} />
    </div>
  );
}
