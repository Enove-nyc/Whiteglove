import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import MapExplorer, { type MapAirport, type MapAttraction, type MapKever, type MapStay } from "@/components/MapExplorer";
import Navbar from "@/components/Navbar";
import { AIRPORTS } from "@/data/airports";
import { cemeteries } from "@/data/cemeteries";
import { getAttractionList, getStayList } from "@/lib/attractions-view";
import { pointFrom } from "@/lib/map-markers";

// Rendered per request, not frozen at build time.
//
// This page reads content the owner adds in the admin. Prerendered, it is
// built once when the site is deployed and never again — a listing added on
// Tuesday is still absent on Friday. The admin saves it, the store holds it,
// and the page keeps serving the snapshot taken at build. The whole point of
// the owner being able to add things is that they appear.
//
// `revalidate` was tried first and measured: with a 60-second window the page
// still never re-read the store, because the reads are `cache: "no-store"`
// fetches that a prerender does not re-run. Per-request is what actually
// works, and it is what /stops and the admin pages already do. These pages are
// small, so the cost is a cheap render rather than a cached file.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Map — everywhere we know, on one map | White Glove Itineraries",
  description: "Every beis hachaim, place worth visiting, kosher hotel and airport the site holds, on one map. Search a town to see what is around it.",
  path: "/map",
});

export default async function MapPage() {
  // Read through the view so anything the owner adds appears here without a
  // redeploy, the same as on the directories.
  const [attractionList, stayList] = await Promise.all([getAttractionList(), getStayList()]);

  const plottableCemeteries = cemeteries.filter((c) => pointFrom(c.coordinates));
  const kevarim: MapKever[] = plottableCemeteries.map((c) => ({
    slug: c.slug,
    name: c.name,
    city: c.city,
    country: c.country,
    coordinates: c.coordinates as string,
    burials: c.burials.length,
  }));

  const attractions: MapAttraction[] = attractionList
    .filter((a) => pointFrom(a.coordinates))
    .map((a) => ({ slug: a.slug, name: a.name, city: a.city, country: a.country, kind: a.kind, coordinates: a.coordinates }));

  // A stay is plotted at its anchor — the shul or quarter it is measured from.
  // That is the coordinate the data actually holds, and the one that answers
  // "can I walk to shul from here".
  const stays: MapStay[] = stayList
    .filter((s) => pointFrom(s.anchor?.coordinates))
    .map((s) => ({ slug: s.slug, name: s.name, city: s.city, country: s.country, kind: s.kind, coordinates: s.anchor.coordinates, season: s.season }));

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
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">
            <GloveMark size="xs" />
            See the area
          </p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            Everywhere we know, on one map
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            Batei hachaim, places worth the half day, kosher hotels and the airports you would fly into — all of it at
            once. Search a town to narrow it down and see what is around that place, kosher food included.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <MapExplorer
            kevarim={kevarim}
            airports={airports}
            attractions={attractions}
            stays={stays}
            unplottedKevarim={cemeteries.length - plottableCemeteries.length}
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
