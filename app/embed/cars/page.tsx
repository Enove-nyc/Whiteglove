import { localrentWidgetSrc } from "@/lib/partner-widgets";

export const dynamic = "force-dynamic";

/**
 * Travelpayouts car search form (Localrent). Native script tag — same reason
 * as /embed/flights: next/script left the iframe empty. Iframed from /book.
 */
export default async function EmbedCarsPage() {
  const src = localrentWidgetSrc();

  if (!src) {
    return (
      <p className="p-4 text-sm leading-6 text-stone-600">
        Car search is not available on this page. Use Search booking partners and open the partner from there.
      </p>
    );
  }

  return <script id="tp-cars-search" src={src} async charSet="utf-8" />;
}
