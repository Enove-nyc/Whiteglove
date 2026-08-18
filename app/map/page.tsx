import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import MapExplorer, { type MapAirport, type MapAttraction, type MapKever, type MapShul, type MapStay } from "@/components/MapExplorer";
import Navbar from "@/components/Navbar";
import { AIRPORTS } from "@/data/airports";
import { cemeteries } from "@/data/cemeteries";
import { heritageCemeteries } from "@/data/heritage-cemeteries";
import { getAttractionList, getStayList } from "@/lib/attractions-view";
import { listPublishedShuls } from "@/lib/shuls";
import { pointFrom } from "@/lib/map-markers";

// Not force-dynamic. getAttractionList/getStayList (lib/attractions-view.ts)
// are a tagged unstable_cache now, busted the moment an attraction or stay is
// actually written, rather than this page running three real reads (this one
// plots both lists plus static airports and cemeteries) on every visit.
export const metadata = pageMetadata({
  title: "Map | White Glove Kosher Travel",
  description: "Batei hachaim, shuls, things to do, places to stay and airports on one map. Search a town to see what is around it.",
  path: "/map",
});

export default async function MapPage() {
  // Read through the view so anything the owner adds appears here without a
  // redeploy, the same as on the directories.
  const [attractionList, stayList, shulList] = await Promise.all([getAttractionList(), getStayList(), listPublishedShuls()]);

  const plottableCemeteries = cemeteries.filter((c) => pointFrom(c.coordinates));
  const kevarim: MapKever[] = [
    ...plottableCemeteries.map((c) => ({
      slug: c.slug,
      name: c.name,
      city: c.city,
      country: c.country,
      coordinates: c.coordinates as string,
    })),
    // The Nesiya Tova locator set — batei hachaim with a coordinate but no rich
    // page of their own, so the marker links out to Nesiya Tova for details.
    ...heritageCemeteries.map((c) => ({
      slug: c.slug,
      name: c.name,
      city: c.city,
      country: c.country,
      coordinates: c.coordinates,
      href: c.sourceUrl,
    })),
  ];

  const attractions: MapAttraction[] = attractionList
    .filter((a) => pointFrom(a.coordinates))
    .map((a) => ({ slug: a.slug, name: a.name, city: a.city, country: a.country, kind: a.kind, coordinates: a.coordinates }));

  // A stay is plotted at its anchor — the shul or quarter it is measured from.
  // That is the coordinate the data actually holds, and the one that answers
  // "can I walk to shul from here".
  const stays: MapStay[] = stayList
    .filter((s) => pointFrom(s.anchor?.coordinates))
    .map((s) => ({ slug: s.slug, name: s.name, city: s.city, country: s.country, kind: s.kind, coordinates: s.anchor.coordinates, season: s.season }));

  // A shul is plotted where the listing itself is. Many carry no coordinate
  // yet; those simply do not appear, the same as a cemetery with none.
  const shuls: MapShul[] = shulList
    .filter((s) => pointFrom(s.coordinates))
    .map((s) => ({ id: s.id, name: s.name, city: s.city, country: s.country, href: s.href, coordinates: s.coordinates }));

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

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-5xl">
          <h1 className="flex items-center gap-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            <GloveMark size="xs" />
            Map
          </h1>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <MapExplorer
            kevarim={kevarim}
            airports={airports}
            attractions={attractions}
            stays={stays}
            shuls={shuls}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
