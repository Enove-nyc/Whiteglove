import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import KosherStayDirectory from "@/components/KosherStayDirectory";
import Navbar from "@/components/Navbar";
import PartnerSearchForm from "@/components/PartnerSearchForm";
import StaySearchForm from "@/components/StaySearchForm";
import SuggestEditButton from "@/components/SuggestEditButton";
import { getAreaList, getStayList } from "@/lib/attractions-view";
import { citiesFor, inDestination, isSearch, nights, readStaySearch } from "@/lib/stay-search";

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
//
// It now also answers a search, which is a second reason for the same setting.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Where to stay — White Glove Itineraries",
  description: "Kosher and kosher-friendly places to stay in Italy, France and Switzerland, and which part of each city to be in for Shabbos.",
  path: "/hotels",
});

/**
 * Where a search for somewhere to stay is answered.
 *
 * TWO PAGES IN ONE, and which one you get depends on whether a destination was
 * typed. With nothing typed it is the directory it has always been. With a
 * destination it becomes a result: the quarter to be in, the places on record
 * there, and then the partner search with everything already filled in.
 *
 * THE ORDER IS THE ARGUMENT. The commission is earned at the bottom of this
 * page, and it is at the bottom on purpose — the quarter and the seasonal
 * warnings are the reason somebody searched here instead of on a comparison
 * site, and burying them under a booking widget would leave nothing but a worse
 * comparison site.
 *
 * A DESTINATION WE HOLD NOTHING FOR IS SAID OUT LOUD. It would be easy to show
 * the whole directory under a heading naming a town that is not in it, and
 * somebody would book a hotel in the wrong country. The empty state says the
 * site has no record of the place, and the partner search below still works,
 * because it works for anywhere.
 */
export default async function KosherStaysPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const search = readStaySearch(await searchParams);
  const searching = isSearch(search);
  const resolved = searching ? citiesFor(search.destination) : null;

  // Read through the view so owner-added stays and quarters appear here and in
  // every search without a redeploy.
  const [allAreas, allStays] = await Promise.all([getAreaList(), getStayList()]);
  const kosherAreas = searching ? inDestination(allAreas, search.destination) : allAreas;
  const kosherStays = searching ? inDestination(allStays, search.destination) : allStays;

  const heading = resolved?.label ?? search.destination;
  const stayNights = nights(search);
  const party = [
    `${search.adults} adult${search.adults === 1 ? "" : "s"}`,
    search.children > 0 ? `${search.children} child${search.children === 1 ? "" : "ren"}` : null,
    `${search.rooms} room${search.rooms === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Where to sleep</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)] sm:text-6xl">
            {searching ? `Where to stay in ${heading}` : "Where to stay"}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            Which part of a city to be in, and what is within walking distance of it. Most alpine kosher hotels are
            seasons rather than places — every entry here says which, because arriving in the wrong month gets you a
            room and nothing to eat.
          </p>
          {searching && (
            <p className="mt-4 text-sm font-semibold text-[var(--navy)]">
              {stayNights ? `${stayNights} night${stayNights === 1 ? "" : "s"}` : "Dates not set"} · {party}
            </p>
          )}

          {/* Editable in place. A search that cannot be corrected without going
              back to the front page is a search somebody abandons. */}
          <div className="mt-8 max-w-5xl">
            <StaySearchForm
              id="stay-search"
              search={search}
              submitLabel={searching ? "Update search" : "Find somewhere to stay"}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        {searching && kosherAreas.length === 0 && kosherStays.length === 0 ? (
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
            <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
              Nothing on record for {heading}
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-stone-600">
              Nobody here has written up the kosher side of {heading} yet, so there is no quarter to point you at and no
              stay to stand behind. The search below covers everywhere, and it is the same search — it just arrives
              without the part of this that is ours.
            </p>
            <p className="mt-4 max-w-2xl leading-7 text-stone-600">
              <a
                href="#everywhere"
                className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Browse everywhere we do hold records for
              </a>
            </p>
          </div>
        ) : (
          <>
            {/* Answered before the hotels, because it is the earlier question. */}
            {kosherAreas.length > 0 && (
              <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6 sm:p-8">
                <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Which part of town</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                  Before a hotel is chosen, the question is really which neighbourhood. These are where the shuls, the
                  kosher food and the eruv are.
                </p>
                <ul className="mt-6 divide-y divide-[var(--gold-light)] border-t border-[var(--gold-light)]">
                  {kosherAreas.map((area) => (
                    <li key={area.slug} id={area.slug} className="scroll-mt-24 py-4">
                      <p className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">
                        {area.city}, {area.country}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[var(--gold-ink)]">{area.name}</p>
                      <p className="mt-1 text-sm leading-6 text-stone-600">{area.note}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {kosherStays.length > 0 && (
              <div id="everywhere" className="mt-10 scroll-mt-24">
                <KosherStayDirectory stays={kosherStays} />
              </div>
            )}
          </>
        )}

        {/* The commercial action, under the reason to trust it rather than
            over it. Everything typed on the front page arrives here already
            filled in; nothing is asked for twice. */}
        <div className="mt-12">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
            Check prices and availability
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {searching
              ? `Rooms, dates and prices come from our booking partner — this site holds no prices of its own.`
              : `Rooms, dates and prices come from our booking partner. Type where and when, and it opens on your search.`}
          </p>
          <div className="mt-6">
            <PartnerSearchForm
              id="hotels-partner"
              product="hotel"
              fields="stay"
              page="/hotels"
              placement="results"
              submitLabel="Check availability"
              destinationValue={search.destination}
              prefill={{
                checkIn: search.checkIn,
                checkOut: search.checkOut,
                adults: search.adults,
                children: search.children,
                rooms: search.rooms,
              }}
            />
          </div>
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
