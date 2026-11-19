import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { SAMPLE_ITINERARIES } from "@/data/sample-itineraries";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { BRAND_NAME } from "@/lib/site-brand-core";

export async function generateMetadata() {
  const brand = await currentBrand();
  return pageMetadata({
    title: `Sample itineraries — day-by-day city trips | ${BRAND_NAME[brand]}`,
    description: "Free day-by-day itineraries for Rome, Paris, London, Barcelona and Lake Como. Copy one into your planner and make it your own.",
    path: "/sample-itineraries",
    brand,
  });
}

/** The index of public sample itineraries (data/sample-itineraries.ts). */
export default function SampleItinerariesPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <section className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-14">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,6vw,3.2rem)] leading-[1.05] text-[var(--navy-deep)]">Sample itineraries</h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-[#3D4766]">
          Day-by-day plans for a few favourite cities. Read one, or copy it into your planner and change it to suit your trip.
        </p>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {SAMPLE_ITINERARIES.map((sample) => (
            <li key={sample.slug}>
              <Link href={`/sample-itineraries/${sample.slug}`} className="block h-full rounded-2xl border border-[#E6DCC8] bg-white p-5 transition hover:shadow-[0_14px_34px_rgba(21,32,74,.12)]">
                <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">{sample.city}, {sample.country}</span>
                <span className="mt-2 block font-[family-name:var(--font-display)] text-2xl text-[var(--navy-deep)]">{sample.title}</span>
                <span className="mt-2 block leading-7 text-stone-700">{sample.summary}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link href="/sample-itinerary" className="block h-full rounded-2xl border border-[#E6DCC8] bg-white p-5 transition hover:shadow-[0_14px_34px_rgba(21,32,74,.12)]">
              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Lake Como, Italy</span>
              <span className="mt-2 block font-[family-name:var(--font-display)] text-2xl text-[var(--navy-deep)]">A week on Lake Como</span>
              <span className="mt-2 block leading-7 text-stone-700">A family week by the lake, shown as the finished itinerary and in the trip app.</span>
            </Link>
          </li>
        </ul>
      </section>
      <Footer />
    </main>
  );
}
