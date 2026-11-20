import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SampleCopyButton from "@/components/SampleCopyButton";
import StructuredData from "@/components/StructuredData";
import { SAMPLE_ITINERARIES, sampleBySlug } from "@/data/sample-itineraries";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { BRAND_NAME } from "@/lib/site-brand-core";
import { breadcrumbs } from "@/lib/structured-data";

/**
 * One public sample itinerary (owner, 19 November 2026). The days are written
 * out as ordinary text, so a search engine reads the whole plan, and the trip
 * can be copied into the planner or booked through the partners beside it.
 * See data/sample-itineraries.ts for what is and is not named, and why.
 */
export function generateStaticParams() {
  return SAMPLE_ITINERARIES.map((sample) => ({ slug: sample.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const sample = sampleBySlug((await params).slug);
  if (!sample) return {};
  const brand = await currentBrand();
  return pageMetadata({
    title: `${sample.title} — a day-by-day itinerary | ${BRAND_NAME[brand]}`,
    description: `${sample.summary} A free sample itinerary you can copy into your own planner and change.`,
    path: `/sample-itineraries/${sample.slug}`,
    brand,
  });
}

const time = (value?: string) => value ?? "";
const length = (minutes?: number) => {
  if (!minutes) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h && m ? `${h} h ${m} min` : h ? `${h} h` : `${m} min`;
};

function partner(product: string, slug: string, extra: Record<string, string>) {
  const query = new URLSearchParams({ product, page: `/sample-itineraries/${slug}`, placement: "sample-itinerary", ...extra });
  return `/go?${query.toString()}`;
}

export default async function SampleItineraryPage({ params }: { params: Promise<{ slug: string }> }) {
  const sample = sampleBySlug((await params).slug);
  if (!sample) notFound();
  const { itinerary } = sample;
  const dates = Array.from(new Set(itinerary.activities.map((stop) => stop.date))).sort();
  const stay = itinerary.lodging[0];
  const nights = dates.length - 1;

  const linkButton =
    "inline-flex min-h-11 items-center justify-center rounded-lg border border-[#D9D2C4] bg-white px-4 text-sm font-semibold text-[var(--navy)] transition hover:border-[var(--navy)]";

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <StructuredData
        data={breadcrumbs([
          { name: "Sample itineraries", path: "/sample-itineraries" },
          { name: sample.title, path: `/sample-itineraries/${sample.slug}` },
        ])}
      />
      <article className="mx-auto max-w-3xl px-5 py-8 sm:px-8 sm:py-14">
        <p className="text-sm">
          <Link href="/sample-itineraries" className="font-semibold text-[var(--navy)] underline underline-offset-4">Sample itineraries</Link>
          <span className="text-stone-500"> · {sample.city}, {sample.country}</span>
        </p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,3.2rem)] leading-[1.05] text-[var(--navy-deep)]">{sample.title}</h1>
        <p className="mt-4 text-lg leading-8 text-[#3D4766]">{sample.intro}</p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <SampleCopyButton itinerary={itinerary} />
          <span className="text-sm text-stone-600">Change anything once it is yours: days, times, stops.</span>
        </div>

        <section aria-labelledby="book-heading" className="mt-8 rounded-2xl border border-[#E6DCC8] bg-white p-5">
          <h2 id="book-heading" className="text-lg font-semibold text-[var(--navy)]">Book this trip</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Link href={`/?type=flights&to=${encodeURIComponent(sample.airport)}#search`} className={linkButton}>Flights to {sample.city}</Link>
            <a href={partner("hotel", sample.slug, { destination: sample.stayArea })} target="_blank" rel="noopener sponsored" className={linkButton}>Hotels in {sample.stayArea.split(",")[0]}</a>
            <a href={partner("activity", sample.slug, { destination: sample.city })} target="_blank" rel="noopener sponsored" className={linkButton}>Tours and tickets</a>
          </div>
        </section>

        {stay ? (
          <section aria-labelledby="stay-heading" className="mt-10">
            <h2 id="stay-heading" className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Where to stay</h2>
            <p className="mt-2 leading-7 text-stone-700">
              <strong className="text-[var(--navy)]">{sample.stayArea.split(",")[0]}</strong> — {nights} {nights === 1 ? "night" : "nights"}. {stay.notes?.replace(/ Your own itinerary names.*$/, "")}
            </p>
          </section>
        ) : null}

        <section aria-labelledby="days-heading" className="mt-10">
          <h2 id="days-heading" className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Day by day</h2>
          <ol className="mt-4 space-y-6">
            {dates.map((date, index) => {
              const day = itinerary.activities.filter((stop) => stop.date === date).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
              return (
                <li key={date} className="rounded-2xl border border-[#E6DCC8] bg-white p-5">
                  <h3 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy-deep)]">
                    Day {index + 1}{index === dates.length - 1 ? " — last morning" : ""}
                  </h3>
                  <ul className="mt-3 divide-y divide-[#EDE6D8]">
                    {day.map((stop) => (
                      <li key={stop.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-3 py-3">
                        <span className="pt-0.5 text-sm font-semibold tabular-nums text-[var(--gold-ink)]">{time(stop.startTime)}</span>
                        <span>
                          <span className="block font-semibold text-[var(--navy)]">{stop.name}</span>
                          <span className="block text-xs text-stone-500">{[stop.address, length(stop.durationMins)].filter(Boolean).join(" · ")}</span>
                          {stop.notes ? <span className="mt-1 block text-sm leading-6 text-stone-700">{stop.notes}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="mt-10 rounded-2xl bg-[var(--cream-deep)] p-5">
          <h2 className="text-lg font-semibold text-[var(--navy)]">Make it your own</h2>
          <p className="mt-2 leading-7 text-stone-700">
            Copy it into the planner and it becomes your trip: move stops between days, add your flights and hotel, and see the free time left in each day.
          </p>
          <div className="mt-4"><SampleCopyButton itinerary={itinerary} /></div>
          <p className="mt-4 text-xs leading-5 text-stone-600">Opening hours and ticketing change; check each place before you go.</p>
        </section>
      </article>
      <Footer />
    </main>
  );
}
