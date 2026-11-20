import Link from "next/link";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TravelSearch from "@/components/TravelSearch";
import type { TravelTab } from "@/lib/travel-tabs";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { BRAND_NAME } from "@/lib/site-brand-core";

/**
 * One search on its own page (owner, 20 November 2026: on a phone "everything
 * by Find Travel with a separate page", not tabs). The home page lists these on
 * a phone and the Find travel menu opens them; on a computer the home page
 * still carries all of them as tabs. Transfers, eSIMs and Travel insurance keep
 * the pages they already had (/transfers, /esim, /travel-insurance).
 */
const PAGES: Record<string, { tab: TravelTab; title: string; lead: string }> = {
  flights: { tab: "flights", title: "Flights", lead: "Compare airlines and fares, then book with our travel partner." },
  hotels: { tab: "hotels", title: "Hotels", lead: "Hotels, apartments and guesthouses, compared across booking sites." },
  "car-rentals": { tab: "cars", title: "Car rentals", lead: "Compare rental companies, with a different drop-off place if you need one." },
  "things-to-do": { tab: "activities", title: "Things to do", lead: "Tours, tickets and day trips for wherever you are going." },
};

export function generateStaticParams() {
  return Object.keys(PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const page = PAGES[(await params).slug];
  if (!page) return {};
  const brand = await currentBrand();
  return pageMetadata({
    title: `${page.title} | ${BRAND_NAME[brand]}`,
    description: page.lead,
    path: `/find/${(await params).slug}`,
    brand,
  });
}

export default async function FindPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = PAGES[slug];
  if (!page) notFound();
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,5vw,2.6rem)] leading-tight text-[var(--navy-deep)]">{page.title}</h1>
        <p className="mt-2 text-[15px] leading-7 text-stone-600">{page.lead}</p>
        <div className="mt-5">
          <TravelSearch initialTab={page.tab} lockedTab page={`/find/${slug}`} placement={`find-${slug}`} />
        </div>
        <p className="mt-5 text-sm leading-6 text-stone-700">
          <strong className="text-[var(--navy)]">Booked?</strong> Paste or forward the confirmation email into{" "}
          <Link href="/itinerary?import=1" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">your itinerary</Link>
          {" "}and it is added for you.
        </p>
      </section>
      <Footer />
    </main>
  );
}
