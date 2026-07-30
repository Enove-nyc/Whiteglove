import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SubBrandBanner, { SubBrandCrest } from "@/components/SubBrand";
import SectionHeading from "@/components/SectionHeading";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import SuggestEditButton from "@/components/SuggestEditButton";
import { destinationHaystack, destinations, guidedDestinations, unguidedDestinations } from "@/data/destinations";
import { searchAreas, searchAttractions, searchEateries, searchStays } from "@/lib/attraction-search";
import { getCemeteryList } from "@/lib/cemeteries-view";
import { extraSpellings, fuzzyMatch } from "@/lib/place-search";

export default async function SacredStopsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  // One destination database, shown in two groups: the ones with a researched
  // guide behind them, and the ones still being checked.
  const matchDestination = (d: (typeof destinations)[number]) =>
    fuzzyMatch(query, `${destinationHaystack(d)} ${extraSpellings([d.slug, d.city])}`);
  const matchingGuides = query ? guidedDestinations().filter(matchDestination) : [];
  // Kevarim come from the one cemetery database. They used to come from a
  // second, older list that duplicated the same fifteen places under their
  // modern names — and still carried a Lizhensk coordinate that had already
  // been corrected in the real database.
  const allCemeteries = await getCemeteryList();
  const matchingStops = query
    ? allCemeteries.filter((c) => fuzzyMatch(query, `${c.city} ${c.yiddishCity} ${c.name} ${c.yiddishName} ${c.country} ${extraSpellings([c.slug, c.city])}`))
    : allCemeteries;
  const matchingBulk = query ? unguidedDestinations().filter(matchDestination) : unguidedDestinations();
  // The rest of the trip. Somebody searching "Colosseum" or "Wiedikon" was
  // being told there was no match at all, when the site had both. Shown only
  // for an actual query — this directory is a kevarim directory first, and an
  // unfiltered page should not open with fifty museums.
  const [matchingAttractions, matchingStays, matchingAreas, matchingEateries] = query
    ? await Promise.all([searchAttractions(query, 24), searchStays(query, 24), searchAreas(query, 12), searchEateries(query, 12)])
    : [[], [], [], []];

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <SubBrandBanner />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-12 gap-y-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Kevarim &amp; nesios directory</p>
            <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">Find the destination you are looking for.</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
              Search in English or יידיש for kevarim, cities, and essential locations. Each entry grows into a complete guide as its practical and historical details are verified.
            </p>
          </div>
          <SubBrandCrest className="hidden shrink-0 sm:block" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow={query ? "Search results" : "Destination directory"}
          title={query ? `Results for “${q.trim()}”` : `${allCemeteries.length + destinations.length} destinations available.`}
          description={query ? "Guides and locations matching your search." : "Browse by city, traditional name, country, or tzaddik. Detailed practical information is added only when it has been checked."}
        />

        {matchingGuides.length > 0 && (
          <div className="mt-12">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">Destination guides</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {matchingGuides.map((guide) => (
                <Link key={guide.slug} href={`/${guide.slug}`} className="min-w-0 border border-[var(--gold-light)] bg-[var(--navy)] p-5 text-white transition hover:bg-[var(--gold)] sm:p-7">
                  <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-light)] sm:tracking-[0.18em]">{guide.country}</p>
                  <h2 dir="rtl" className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight">{guide.yiddishCity}</h2>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-slate-300">{guide.city}</p>
                  <p dir="rtl" className="mt-5 text-2xl leading-tight text-slate-100">{guide.guide?.yiddishTzaddik}</p>
                  <p className="mt-2 text-sm text-slate-300">{guide.guide?.tzaddik}</p>
                  <span className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.14em]">Open guide →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchingStops.length > 0 && (
          <div className={matchingGuides.length > 0 ? "mt-14" : "mt-12"}>
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">Kevarim &amp; batei hachaim</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {matchingStops.map((cemetery) => (
                <Link key={cemetery.slug} href={`/cemeteries/${cemetery.slug}`} className="flex min-w-0 flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7">
                  <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.18em]">{cemetery.city} · {cemetery.country}</p>
                  <h2 dir="rtl" className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere] sm:text-4xl">{cemetery.yiddishName}</h2>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{cemetery.name}</p>
                  <p className="mt-4 text-sm leading-6 text-stone-600">{cemetery.burialCount} known {cemetery.burialCount === 1 ? "kever" : "kevarim"} listed</p>
                  <span className="mt-auto pt-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Open beis hachaim →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchingBulk.length > 0 && (
          <div className={matchingGuides.length > 0 || matchingStops.length > 0 ? "mt-14" : "mt-12"}>
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">Destination research queue</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {matchingBulk.map((destination) => (
                <Link key={destination.slug} href={`/destinations/${destination.slug}`} className="flex min-h-64 min-w-0 flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] sm:p-7">
                  <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">{destination.country}</p>
                  <h2 dir="rtl" className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere] sm:text-4xl">{destination.yiddishCity}</h2>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{destination.city}</p>
                  <p className="mt-4 text-sm leading-6 text-stone-600">Practical details are being checked.</p>
                  <span className="mt-auto pt-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Open destination →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchingAttractions.length > 0 && (
          <div className="mt-14">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">Things to do</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {matchingAttractions.map((a) => (
                <Link key={a.slug} href={a.href} className="flex min-w-0 flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7">
                  <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.18em]">{a.city} · {a.country} · {a.kind}</p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere]">{a.name}</h2>
                  <p className="mt-4 text-sm leading-6 text-stone-600">{a.summary}</p>
                  <span className="mt-auto pt-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Open in things to do →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {(matchingStays.length > 0 || matchingAreas.length > 0) && (
          <div className="mt-14">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">Where to stay</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {matchingAreas.map((area) => (
                <Link key={`area-${area.slug}`} href={`/kosher-stays#${area.slug}`} className="flex min-w-0 flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7">
                  <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.18em]">{area.city} · {area.country} · Jewish quarter</p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere]">{area.name}</h2>
                  <p className="mt-4 text-sm leading-6 text-stone-600">{area.note}</p>
                  <span className="mt-auto pt-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Open where to stay →</span>
                </Link>
              ))}
              {matchingStays.map((s) => (
                <Link key={s.slug} href={s.href} className="flex min-w-0 flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7">
                  <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.18em]">{s.city} · {s.country} · {s.kind}</p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere]">{s.name}</h2>
                  <p className="mt-4 text-sm leading-6 text-stone-600">{s.summary}</p>
                  {/* A season is the thing that costs somebody a Shabbos, so it
                      is on the search card and not only on the full listing. */}
                  {s.season && <p className="mt-3 text-sm font-semibold text-amber-800">Seasonal — {s.season}</p>}
                  <span className="mt-auto pt-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Open where to stay →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchingEateries.length > 0 && (
          <div className="mt-14">
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">Somewhere to eat</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {matchingEateries.map((e) => (
                <Link key={e.slug} href={`/kosher#${e.slug}`} className="flex min-w-0 flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 transition hover:border-[var(--gold)] hover:shadow-md sm:p-7">
                  <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.18em]">{e.city} · {e.country} · {e.kind}</p>
                  <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere]">{e.name}</h2>
                  <p className="mt-4 text-sm leading-6 text-stone-600">{e.summary}</p>
                  <span className="mt-auto pt-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Open where to eat →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {query && matchingGuides.length === 0 && matchingStops.length === 0 && matchingBulk.length === 0 && matchingAttractions.length === 0 && matchingStays.length === 0 && matchingAreas.length === 0 && matchingEateries.length === 0 && (
          <div className="mt-12 border border-[var(--gold-light)] bg-[#fcfaf6] p-8 text-stone-600">
            <p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">No match yet.</p>
            <p className="mt-3 leading-7">Try the city name, country, traditional name, or the tzaddik’s name. We are adding more destinations continuously.</p>
          </div>
        )}

        <div className="mt-10">
          <SuggestEditButton
            targetType="site"
            targetId="stops-directory"
            title="Destination directory"
            currentInfo="Use this directory to report missing shomer numbers, access notes, or practical information for any city or cemetery."
          />
        </div>
      </section>
      <Footer />
    </main>
  );
}
