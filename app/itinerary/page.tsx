import type { Metadata } from "next";
import { headers } from "next/headers";
import Footer from "@/components/Footer";
import ItineraryFooter from "@/components/ItineraryFooter";
import ItineraryBuilder from "@/components/ItineraryBuilder";
import Navbar from "@/components/Navbar";
import SharedWithMe from "@/components/SharedWithMe";
import TravelAssistantBox from "@/components/TravelAssistantBox";
import { getActivePromotions } from "@/lib/admin-content";

export const metadata: Metadata = {
  title: "Itinerary planner — White Glove Itineraries",
  description: "Build your trip day by day — flights, hotels, and stops — with automatic checks and a printable itinerary.",
};

export default async function ItineraryPage() {
  const userAgent = (await headers()).get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const footerPromotions = await getActivePromotions("itinerary-footer", "/itinerary", device);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-9 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold)]">Itinerary planner</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            Plan your trip.
          </h1>
          <p className="mt-3 text-sm text-stone-600">Add your dates and stops. We’ll organize the route.</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-4 shadow-[0_8px_26px_rgba(23,45,82,.05)] sm:p-6">
          <TravelAssistantBox />
        </div>

        <div className="itinerary-planner mt-8">
          <SharedWithMe />
          <ItineraryBuilder />
        </div>

        <ItineraryFooter promotion={footerPromotions[0] ?? null} />
      </section>

      <Footer />
    </main>
  );
}
