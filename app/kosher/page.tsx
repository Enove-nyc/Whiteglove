import type { Metadata } from "next";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import KosherFinder from "@/components/KosherFinder";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Kosher food finder — White Glove Itineraries",
  description: "Find kosher restaurants, bakeries, and groceries anywhere in the world — live from OpenStreetMap — and add them straight to your trip.",
};

export default function KosherPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-5xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]"><GloveMark size="xs" />Kosher, everywhere you go</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">Find kosher food anywhere.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Search any city and see kosher restaurants, bakeries, butchers, and groceries nearby — pulled live from OpenStreetMap&apos;s worldwide map data. Open any one straight to its exact spot in Maps, call it, or add it to your trip.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <KosherFinder />
        <p className="mt-8 max-w-2xl text-sm leading-6 text-stone-500">
          Listings come from OpenStreetMap, a free community-maintained map of the world. Coverage is strong in many cities and thinner in others — if a place isn&apos;t listed, it doesn&apos;t mean there&apos;s nothing kosher there. Always confirm kosher status, supervision (hashgacha), and hours directly before you rely on it.
        </p>
      </section>
      <Footer />
    </main>
  );
}
