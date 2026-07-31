import { pageMetadata } from "@/lib/seo";
import AttractionDirectory from "@/components/AttractionDirectory";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SubBrandBanner, { SubBrandCrest } from "@/components/SubBrand";
import SuggestEditButton from "@/components/SuggestEditButton";
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
  path: "/attractions",
});

export default async function AttractionsPage() {
  // Read through the view, not the data file, so anything the owner adds in the
  // admin appears here and in every search without a redeploy.
  const attractions = await getAttractionList();
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <SubBrandBanner />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-12 gap-y-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">For the days in between</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)] sm:text-6xl">Things to do</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
              Nobody davens for eight hours a day. This is the rest of the trip — with the two things a guidebook never
              tells you: how far it is from the kosher food, and what it does on Shabbos.
            </p>
          </div>
          <SubBrandCrest className="hidden shrink-0 sm:block" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <AttractionDirectory attractions={attractions} />

        <div className="mt-10">
          <SuggestEditButton
            targetType="site"
            targetId="attractions-index"
            title="Things to do"
            currentInfo="Tell us about somewhere worth going, or correct something here — especially anything about kosher food nearby or Shabbos."
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
