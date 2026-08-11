import { pageMetadata } from "@/lib/seo";
import AttractionDirectory from "@/components/AttractionDirectory";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TourBooking from "@/components/TourBooking";
import TravelEssentials from "@/components/TravelEssentials";
import { getAttractionList } from "@/lib/attractions-view";

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
  title: "Things to do — White Glove Itineraries",
  description: "What to do on a kosher trip to Italy, France and Switzerland, with what is near the kosher food and what happens on Shabbos.",
  path: "/things-to-do",
});

export default async function AttractionsPage() {
  // Read through the view, not the data file, so anything the owner adds in the
  // admin appears here and in every search without a redeploy.
  const attractions = await getAttractionList();
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-12 gap-y-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">For the days in between</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)] sm:text-6xl">Things to do</h1>
            {/* IT OPENED "Nobody davens for eight hours a day", which is a joke
                between people who already know each other and reads as a dig at
                the reader's religious life to everybody else — including the
                family this page is written for. The point it was making is
                worth keeping and is made below it. */}
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
              A meaningful trip still leaves plenty of time to explore. This is the rest of it — with the two things a
              guidebook never tells you: how far it is from the kosher food, and what it does on Shabbos.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <AttractionDirectory attractions={attractions} />

      </section>

      {/* UNDER THE LIST, NOT OVER IT. Somebody who has read what a place is,
          how long to give it and what it does on Shabbos is the person ready to
          buy a ticket for it; the same block above the directory would be an
          advert in front of the thing they came for. Renders nothing until the
          owner has a tours hand-off enabled and configured. */}
      {/* The search, when the pasted link is a Stay22 tours desk — it carries
          the city, so the partner opens on somewhere rather than on their front
          page. Renders nothing otherwise, and the row below covers that case. */}
      <TourBooking />

      {/* Everything else the owner has enabled for this page, and the tours
          card itself when it cannot be made into a search. */}
      <TravelEssentials
        pageType="things-to-do"
        heading="Before you go"
        intro="Practical add-ons for the days above. Prices, availability and terms are the provider's."
        placement="things-to-do-essentials"
      />

      <Footer />
    </main>
  );
}
