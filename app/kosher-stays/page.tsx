import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import KosherStayDirectory from "@/components/KosherStayDirectory";
import Navbar from "@/components/Navbar";
import SuggestEditButton from "@/components/SuggestEditButton";
import { getAreaList, getStayList } from "@/lib/attractions-view";

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
  title: "Where to stay — White Glove Itineraries",
  description: "Kosher and kosher-friendly places to stay in Italy, France and Switzerland, and which part of each city to be in for Shabbos.",
  path: "/kosher-stays",
});

export default async function KosherStaysPage() {
  // Read through the view so owner-added stays and quarters appear here and in
  // every search without a redeploy.
  const [kosherAreas, kosherStays] = await Promise.all([getAreaList(), getStayList()]);
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-12 gap-y-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Where to sleep</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)] sm:text-6xl">Where to stay</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
              Which part of a city to be in, and what is within walking distance of it. Most alpine kosher hotels are
              seasons rather than places — every entry here says which, because arriving in the wrong month gets you a
              room and nothing to eat.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        {/* Answered before the hotels, because it is the earlier question. */}
        <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Which part of town</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Before a hotel is chosen, the question is really which neighbourhood. These are where the shuls, the kosher
            food and the eruv are.
          </p>
          <ul className="mt-6 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
            {kosherAreas.map((area) => (
              <li key={area.slug} id={area.slug} className="scroll-mt-24 py-4">
                <p className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
                  {area.city}, {area.country}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--gold)]">{area.name}</p>
                <p className="mt-1 text-sm leading-6 text-stone-600">{area.note}</p>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <KosherStayDirectory stays={kosherStays} />
        </div>

        <div className="mt-10">
          <SuggestEditButton
            targetType="site"
            targetId="kosher-stays-index"
            title="Where to stay"
            currentInfo="Tell us about a kosher hotel or programme we are missing, or correct a season or a hechsher here — especially if a programme's dates have changed."
          />
        </div>
      </section>

      <Footer />
    </main>
  );
}
