import PartnerWidgetEmbed from "@/components/PartnerWidgetEmbed";
import { localrentWidgetSrc } from "@/lib/partner-widgets";

export const dynamic = "force-dynamic";

/**
 * Localrent car search form for the /book Cars iframe. Same loader as flights.
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

  return (
    <div className="w-full">
      <h1 className="sr-only">Car search</h1>
      <PartnerWidgetEmbed src={src} />
    </div>
  );
}
