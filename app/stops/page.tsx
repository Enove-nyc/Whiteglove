import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SubBrandBanner, { SubBrandCrest } from "@/components/SubBrand";
import SectionHeading from "@/components/SectionHeading";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import SuggestEditButton from "@/components/SuggestEditButton";
import { bulkDestinations } from "@/data/bulk-destinations";
import { cityGuides } from "@/data/city-guides";
import { mapsUrl, sacredStops } from "@/data/sacred-stops";
import { extraSpellings, fuzzyMatch } from "@/lib/place-search";

export default async function SacredStopsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const matchingGuides = query ? cityGuides.filter((guide) => fuzzyMatch(query, `${guide.city} ${guide.yiddishCity} ${guide.country} ${guide.tzaddik} ${guide.yiddishTzaddik} ${guide.seforim} ${guide.aliases?.join(" ") ?? ""} ${extraSpellings([guide.slug, guide.city])}`)) : [];
  const matchingStops = query ? sacredStops.filter((stop) => fuzzyMatch(query, `${stop.city} ${stop.traditionalName ?? ""} ${stop.yiddishName} ${stop.country} ${stop.address} ${stop.aliases?.join(" ") ?? ""} ${extraSpellings([stop.city, stop.traditionalName])}`)) : sacredStops;
  const matchingBulk = query ? bulkDestinations.filter((destination) => fuzzyMatch(query, `${destination.city} ${destination.yiddishCity} ${destination.country} ${destination.aliases.join(" ")} ${extraSpellings([destination.slug, destination.city])}`)) : bulkDestinations;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <SubBrandBanner />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-12 gap-y-8">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Kevarim &amp; nesios directory</p>
            <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">Find the destination you are looking for.</h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
              Search in English or יידיש for kevarim, cities, and essential locations. Each entry grows into a complete guide as its practical and historical details are verified.
            </p>
          </div>
          <SubBrandCrest className="hidden shrink-0 sm:block" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <SectionHeading
          eyebrow={query ? "Search results" : "Destination directory"}
          title={query ? `Results for “${q.trim()}”` : `${sacredStops.length + cityGuides.length + bulkDestinations.length} destinations available.`}
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
                  <p dir="rtl" className="mt-5 text-2xl leading-tight text-slate-100">{guide.yiddishTzaddik}</p>
                  <p className="mt-2 text-sm text-slate-300">{guide.tzaddik}</p>
                  <span className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.14em]">Open guide →</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {matchingStops.length > 0 && (
          <div className={matchingGuides.length > 0 ? "mt-14" : "mt-12"}>
            <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">Locations</p>
            <div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {matchingStops.map((stop, index) => (
                <article key={`${stop.city}-${stop.address}`} className="flex min-h-72 min-w-0 flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5 sm:p-7">
                  <p className="break-words text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold)] sm:tracking-[0.2em]">{String(index + 1).padStart(2, "0")} · {stop.country}</p>
                  <h2 dir="rtl" className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] [overflow-wrap:anywhere] sm:text-4xl">{stop.yiddishName}</h2>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-stone-500">{stop.city}</p>
                  {stop.traditionalName && <p className="mt-1 text-base text-stone-500">Also known as {stop.traditionalName}</p>}
                  <p className="mt-4 leading-7 text-stone-600">{stop.address}</p>
                  <p className="mt-4 text-sm leading-6 text-stone-500">{stop.coordinates}</p>
                  {stop.note && <p className="mt-4 border-l border-[var(--gold)] pl-3 text-sm leading-6 text-stone-600">{stop.note}</p>}
                  <SavePlaceButtons place={{ id: `stop-${stop.city}-${stop.address}`, name: stop.city, yiddishName: stop.yiddishName, address: stop.address, coordinates: stop.coordinates }} />
                  <a href={mapsUrl(stop)} target="_blank" rel="noreferrer" className="mt-auto pt-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold)]">Open in maps →</a>
                </article>
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

        {query && matchingGuides.length === 0 && matchingStops.length === 0 && matchingBulk.length === 0 && (
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
