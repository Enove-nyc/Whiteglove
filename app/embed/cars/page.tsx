import Script from "next/script";
import { localrentWidgetSrc } from "@/lib/partner-widgets";

export const dynamic = "force-dynamic";

/**
 * Travelpayouts car search form (Localrent), loaded with next/script.
 * Iframed from /book. No WordPress attributes.
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

  return <Script id="tp-cars-search" src={src} strategy="afterInteractive" charSet="utf-8" />;
}
