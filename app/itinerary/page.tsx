import type { Metadata } from "next";
import Footer from "@/components/Footer";
import ItineraryBuilder from "@/components/ItineraryBuilder";
import Navbar from "@/components/Navbar";
import SharedWithMe from "@/components/SharedWithMe";
import TravelAssistantBox from "@/components/TravelAssistantBox";

export const metadata: Metadata = {
  title: "Itinerary planner — White Glove Itineraries",
  description: "Build your trip day by day — flights, hotels, and stops — with automatic checks and a printable itinerary.",
};

export default function ItineraryPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">White Glove planner</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)] sm:text-6xl">Build your whole trip, day by day.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Add your flights, hotels, and stops — even ones you booked elsewhere — and we&apos;ll lay out each day, flag any night with nowhere to sleep, show how far each place is from the next, spot free hours, and print a beautiful itinerary.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <TravelAssistantBox />
        <div className="mt-10">
          <SharedWithMe />
          <ItineraryBuilder />
        </div>
      </section>
      <Footer />
    </main>
  );
}
