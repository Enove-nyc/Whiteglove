import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SavePlaceButtons from "@/components/SavePlaceButtons";
import SectionHeading from "@/components/SectionHeading";
import { cityGuides, getCityGuide } from "@/data/city-guides";

export function generateStaticParams() {
  return cityGuides.map(({ slug }) => ({ city: slug }));
}

export default async function CityGuidePage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const guide = getCityGuide(city);

  if (!guide) notFound();
  const graveMapUrl = guide.graveAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${guide.graveAddress} ${guide.graveCoordinates ?? ""}`)}`
    : undefined;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mx-auto max-w-7xl"><p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">City guide · {guide.country}</p><h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">{guide.city}<span className="mt-2 block text-3xl text-stone-500 sm:text-4xl">{guide.yiddishCity}</span></h1><p className="mt-6 max-w-2xl text-xl leading-8 text-stone-600">A White Glove guide to the journey, the tzaddik, and the practical details that matter most.</p></div>
      </section>
      {guide.safetyNote && <section className="border-b border-amber-200 bg-[#fff8e8] px-5 py-5 sm:px-8"><div className="mx-auto max-w-7xl"><p className="text-sm leading-7 text-stone-700"><strong className="font-semibold text-[var(--navy)]">Current travel notice:</strong> {guide.safetyNote}</p></div></section>}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8"><div className="grid gap-10 lg:grid-cols-[.85fr_1.15fr]"><div><p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold)]">At the kever</p><h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">{guide.tzaddik}<span className="mt-2 block text-2xl text-stone-500">{guide.yiddishTzaddik}</span></h2>{graveMapUrl && <a href={graveMapUrl} target="_blank" rel="noreferrer" className="mt-6 inline-block bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition hover:bg-[var(--gold)]">Open the kever in maps →</a>}<SavePlaceButtons place={{ id: guide.slug, name: guide.city, yiddishName: guide.yiddishCity, address: guide.graveAddress ?? `${guide.city}, ${guide.country}`, coordinates: guide.graveCoordinates, href: `/${guide.slug}` }} />{guide.findingNotes && <div className="mt-8 border-t border-[var(--gold-light)] pt-5"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Finding the kever</p><ol className="mt-4 space-y-3">{guide.findingNotes.map((note, index) => <li key={note} className="flex gap-3 text-sm leading-6 text-stone-600"><span className="font-semibold text-[var(--gold)]">{index + 1}.</span><span>{note}</span></li>)}</ol></div>}</div><div className="border-l border-[var(--gold)] pl-6"><p className="text-lg leading-8 text-stone-600">{guide.overview}</p><div className="mt-8 grid gap-5 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Seforim</p><p className="mt-2 font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{guide.seforim}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Yahrzeit</p><p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{guide.yahrzeit}</p></div><div><p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Niftar</p><p className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{guide.niftar}</p></div></div></div></div></section>
      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-20 sm:px-8"><div className="mx-auto max-w-7xl"><SectionHeading eyebrow="Guide in progress" title="Practical details, gathered carefully." description="We are researching food, minyanim, mikvaos, lodging, drivers, and current local contacts for this destination. Only details that can be checked will be published." /><a href={guide.sourceUrl} target="_blank" rel="noreferrer" className="mt-8 inline-block border border-[var(--gold)] px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white">Read source information</a></div></section>
      <Footer />
    </main>
  );
}
