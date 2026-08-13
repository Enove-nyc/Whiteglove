import { pageMetadata } from "@/lib/seo";
import AttractionDirectory from "@/components/AttractionDirectory";
import Footer from "@/components/Footer";
import ListingAudienceNote from "@/components/ListingAudienceNote";
import Navbar from "@/components/Navbar";
import TourBooking from "@/components/TourBooking";
import TravelEssentials from "@/components/TravelEssentials";
import { getAttractionList } from "@/lib/attractions-view";

// Not force-dynamic. getAttractionList (lib/attractions-view.ts) is a tagged
// unstable_cache now, busted the moment an attraction is actually written,
// rather than this page running a real database read on every visit.
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
              How far it is from the kosher food, and what it does on Shabbos.
            </p>
            <ListingAudienceNote />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <AttractionDirectory attractions={attractions} />
      </section>


      {/* UNDER THE LIST, NOT OVER IT. Somebody who has read what a place is,
          how long to give it and what it does on Shabbos is the person ready to
          buy a ticket for it; the same block above the directory would be an
          advert in front of the thing they came for. A tracked link, not a
          form — this site cannot show tour results, so a city picker here
          would be typed twice. Renders nothing until the owner has a tours
          hand-off enabled and configured. */}
      <TourBooking />

      {/* Everything else the owner has enabled for this page. Tours themselves
          are the panel above, so they are not repeated in this row. */}
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
