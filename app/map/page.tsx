import type { Metadata } from "next";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import MapExplorer, { type MapAirport, type MapKever } from "@/components/MapExplorer";
import Navbar from "@/components/Navbar";
import SubBrandBanner from "@/components/SubBrand";
import { AIRPORTS } from "@/data/airports";
import { cemeteries } from "@/data/cemeteries";

export const metadata: Metadata = {
  title: "Map — what's around any town | White Glove Itineraries",
  description: "Search a town and see the kevarim, kosher food and airports around it on one map.",
};

// Kraków: central to most of the routes this site plans, and a place almost
// everyone recognises, so the map opens somewhere meaningful rather than blank.
const DEFAULT_CENTER = { lat: 50.0619, lng: 19.9369 };

export default function MapPage() {
  const kevarim: MapKever[] = cemeteries
    .filter((c) => c.coordinates && !/pending|to be added/i.test(c.coordinates))
    .map((c) => ({
      slug: c.slug,
      name: c.name,
      city: c.city,
      country: c.country,
      coordinates: c.coordinates as string,
      burials: c.burials.length,
    }));

  const airports: MapAirport[] = AIRPORTS.map((a) => ({
    code: a.code,
    name: a.name,
    city: a.city,
    lat: a.lat,
    lng: a.lng,
    size: a.size,
  }));

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <SubBrandBanner />

      <section className="border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">
            <GloveMark size="xs" />
            See the area
          </p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            What&apos;s around any town
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            Search a place and see it on the map with the kevarim, kosher food and airports around it — so you can tell
            at a glance what else is worth the drive while you are there.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <MapExplorer kevarim={kevarim} airports={airports} initialCenter={DEFAULT_CENTER} initialName="Kraków" />
        </div>
      </section>

      <Footer />
    </main>
  );
}
