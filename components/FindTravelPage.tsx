import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TravelSearch, { type TravelSearchPrefill } from "@/components/TravelSearch";
import type { TravelTab } from "@/lib/travel-tabs";

/**
 * One search on its own page: a title and the box, nothing else (owner,
 * 22 November 2026: "the least wording possible … keep the site very, very
 * clean"). Flights, Hotels, Car rentals, Things to do, Transfers, eSIMs and
 * Travel insurance all use it.
 */
export default function FindTravelPage({ tab, title, path, prefill }: { tab: TravelTab; title: string; path: string; prefill?: TravelSearchPrefill }) {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <section className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.8rem,5vw,2.6rem)] leading-tight text-[var(--navy-deep)]">{title}</h1>
        <div className="mt-5">
          <TravelSearch initialTab={tab} prefill={prefill} lockedTab page={path} placement={`find-${path.split("/").pop()}`} />
        </div>
        <p className="mt-5 text-sm text-stone-700">
          <strong className="text-[var(--navy)]">Booked?</strong>{" "}
          <Link href="/itinerary?import=1" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">Add it to your itinerary</Link>
        </p>
      </section>
      <Footer />
    </main>
  );
}
