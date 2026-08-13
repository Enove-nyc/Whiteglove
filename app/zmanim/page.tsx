import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StructuredData from "@/components/StructuredData";
import ZmanimTool from "@/components/ZmanimTool";
import { zmanimPlaces } from "@/lib/zmanim-places";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Zmanim — halachic times for your destination | White Glove Itineraries",
  description:
    "Halachic times calculated for a place and date: alos, sunrise, sof zman Shema, chatzos, mincha, sunset and tzeit. Informational travel aid — confirm with local custom.",
  path: "/zmanim",
});

/**
 * Halachic times for travel planning.
 *
 * WHY A PAGE. Candle-lighting warnings already live in the itinerary planner,
 * but travellers also ask for a day's zmanim at the place they are staying.
 * This page answers that with a library calculation and clear attribution —
 * never as psak.
 */
export default async function ZmanimPage({
  searchParams,
}: {
  searchParams: Promise<{ place?: string; date?: string }>;
}) {
  const params = await searchParams;
  const places = zmanimPlaces();
  const placeHint = params.place?.trim().toLocaleLowerCase("en") ?? "";
  const initial = places.find(
    (place) =>
      place.id === params.place ||
      place.city.toLocaleLowerCase("en") === placeHint ||
      place.label.toLocaleLowerCase("en").includes(placeHint),
  );

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Kosher travel", path: "/kosher-travel" },
          { name: "Zmanim", path: "/zmanim" },
        ])}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kosher travel</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            Zmanim
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
            Halachic times for a place and date. Search a city or enter coordinates.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <ZmanimTool places={places} initialPlaceId={initial?.id} initialDate={params.date} />
      </section>

      <Footer />
    </main>
  );
}
