import type { Metadata } from "next";
import { headers } from "next/headers";
import Footer from "@/components/Footer";
import ItineraryFooter from "@/components/ItineraryFooter";
import GloveMark from "@/components/GloveMark";
import ItineraryBuilder from "@/components/ItineraryBuilder";
import Navbar from "@/components/Navbar";
import SharedWithMe from "@/components/SharedWithMe";
import TravelAssistantBox from "@/components/TravelAssistantBox";
import { getActivePromotions } from "@/lib/admin-content";

export const metadata: Metadata = {
  title: "Itinerary planner — White Glove Itineraries",
  description: "Build your trip day by day — flights, hotels, and stops — with automatic checks and a printable itinerary.",
};

const plannerSteps = [
  ["1", "Set the trip", "Name your journey and choose the start and end dates."],
  ["2", "Add the details", "Enter flights, places to sleep, and every stop you want to make."],
  ["3", "Plan the route", "Let the planner arrange the days, then adjust and print your itinerary."],
];

export default async function ItineraryPage() {
  const userAgent = (await headers()).get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const footerPromotions = await getActivePromotions("itinerary-footer", "/itinerary", device);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_.75fr] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                <GloveMark size="xs" /> White Glove planner
              </p>
              <h1 className="mt-4 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">
                Build your whole trip, one clear step at a time.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-stone-600 sm:text-lg">
                Keep flights, hotels, stops, driving times, and every day of the journey together in one organized itinerary.
              </p>
            </div>
            <div className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5 shadow-[0_8px_26px_rgba(23,45,82,.06)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">What the planner checks</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-stone-600">
                <li>• Nights without lodging</li>
                <li>• Driving time between stops</li>
                <li>• Empty or over-packed days</li>
                <li>• A clean printable itinerary</li>
              </ul>
            </div>
          </div>

          <ol className="mt-9 grid gap-3 sm:grid-cols-3">
            {plannerSteps.map(([number, title, description]) => (
              <li key={number} className="flex gap-3 rounded-xl border border-[var(--gold-light)] bg-[rgba(255,253,249,.72)] p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--navy)] text-xs font-bold text-white">{number}</span>
                <span>
                  <span className="block text-sm font-bold text-[var(--navy)]">{title}</span>
                  <span className="mt-1 block text-xs leading-5 text-stone-500">{description}</span>
                </span>
              </li>
            ))}
          </ol>
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
