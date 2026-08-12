import Script from "next/script";
import { aviasalesWidgetSrc } from "@/lib/partner-widgets";

export const dynamic = "force-dynamic";

/**
 * Aviasales search form, loaded with next/script so Travelpayouts can insert
 * the form next to the tag. Iframed from /book. No WordPress attributes.
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

  return <Script id="tp-aviasales-search" src={src} strategy="afterInteractive" charSet="utf-8" />;
}
