import { aviasalesWidgetSrc } from "@/lib/partner-widgets";

export const dynamic = "force-dynamic";

/**
 * Aviasales search form. A real script tag, not next/script: Travelpayouts
 * inserts the form next to this element. next/script afterInteractive renders
 * null and appends to document.body, so the iframe on /book stayed empty.
 * Iframed from /book. No WordPress attributes.
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

  return <script id="tp-aviasales-search" src={src} async charSet="utf-8" />;
}
