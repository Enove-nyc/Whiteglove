import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import { cityGuides } from "@/data/city-guides";
import { mapsUrl, sacredStops } from "@/data/sacred-stops";

export default async function SacredStopsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const matchingGuides = query
    ? cityGuides.filter((guide) => `${guide.city} ${guide.yiddishCity} ${guide.country} ${guide.tzaddik} ${guide.yiddishTzaddik} ${guide.seforim} ${guide.aliases?.join(" ") ?? ""}`.toLowerCase().includes(query))
    : [];
  const matchingStops = query
    ? sacredStops.filter((stop) => `${stop.city} ${stop.traditionalName ?? ""} ${stop.yiddishName} ${stop.country} ${stop.address} ${stop.aliases?.join(" ") ?? ""}`.toLowerCase().includes(query))
    : sacredStops;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28"><div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">White Glove directory</p><h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">Find the destination you are looking for.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">Search in English or ייִדיש for kevarim, cities, and essential locations. Each entry grows into a complete White Glove guide as its practical and historical details are verified.</p></div></section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><SectionHeading eyebrow={query ? "Search results" : "Destination directory"} title={query ? `Results for “${q.trim()}”` : `${sacredStops.length} locations available.`} description={query ? "Guides and locations matching your search." : "Browse by city, traditional name, country, or tzaddik. Open any location in maps before traveling."} />
        {matchingGuides.length > 0 && <div className="mt-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Destination guides</p><div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{matchingGuides.map((guide) => <Link key={guide.slug} href={`/${guide.slug}`} className="border border-[var(--gold-light)] bg-[var(--navy)] p-7 text-white transition hover:bg-[var(--gold)]"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-light)]">{guide.country}</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl">{guide.city}<span className="mt-1 block text-xl text-slate-300">{guide.yiddishCity}</span></h2><p className="mt-3 text-slate-200">{guide.tzaddik}<span className="mt-1 block text-slate-300">{guide.yiddishTzaddik}</span></p><span className="mt-6 inline-block text-xs font-bold uppercase tracking-[0.14em]">Open guide →</span></Link>)}</div></div>}
        {matchingStops.length > 0 && <div className={matchingGuides.length > 0 ? "mt-14" : "mt-12"}><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Locations</p><div className="mt-5 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{matchingStops.map((stop, index) => <article key={`${stop.city}-${stop.address}`} className="flex min-h-72 flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-7"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">{String(index + 1).padStart(2, "0")} · {stop.country}</p><h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{stop.city}<span className="mt-1 block text-xl text-stone-500">{stop.yiddishName}</span>{stop.traditionalName && <span className="mt-1 block text-base text-stone-500">Also known as {stop.traditionalName}</span>}</h2><p className="mt-4 leading-7 text-stone-600">{stop.address}</p><p className="mt-4 text-sm leading-6 text-stone-500">{stop.coordinates}</p>{stop.note && <p className="mt-4 border-l border-[var(--gold)] pl-3 text-sm leading-6 text-stone-600">{stop.note}</p>}<a href={mapsUrl(stop)} target="_blank" rel="noreferrer" className="mt-auto pt-7 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold)]">Open in maps →</a></article>)}</div></div>}
        {query && matchingGuides.length === 0 && matchingStops.length === 0 && <div className="mt-12 border border-[var(--gold-light)] bg-[#fcfaf6] p-8 text-stone-600"><p className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">No match yet.</p><p className="mt-3 leading-7">Try the city name, country, traditional name, or the tzaddik’s name. We are adding more destinations continuously.</p></div>}
      </section>
      <Footer />
    </main>
  );
}
