import type { Metadata } from "next";
import Footer from "@/components/Footer";
import KosherStayDirectory from "@/components/KosherStayDirectory";
import Navbar from "@/components/Navbar";
import SubBrandBanner, { SubBrandCrest } from "@/components/SubBrand";
import SuggestEditButton from "@/components/SuggestEditButton";
import { getAreaList, getStayList } from "@/lib/attractions-view";

export const metadata: Metadata = {
  title: "Where to stay — White Glove Itineraries",
  description:
    "Kosher and kosher-friendly places to stay in Italy, France and Switzerland, and which part of each city to be in for Shabbos.",
};

export default async function KosherStaysPage() {
  // Read through the view so owner-added stays and quarters appear here and in
  // every search without a redeploy.
  const [kosherAreas, kosherStays] = await Promise.all([getAreaList(), getStayList()]);
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <SubBrandBanner />

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
          <SubBrandCrest className="hidden shrink-0 sm:block" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        {/* Answered before the hotels, because it is the earlier question. */}
        <div className="rounded-3xl border border-[var(--gold-light)] bg-[#fcfaf6] p-6 shadow-[0_12px_34px_rgba(23,45,82,.06)] sm:p-8">
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
