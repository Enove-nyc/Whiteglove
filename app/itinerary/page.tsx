import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { headers } from "next/headers";
import Footer from "@/components/Footer";
import ItineraryFooter from "@/components/ItineraryFooter";
import ItineraryBuilder from "@/components/ItineraryBuilder";
import Navbar from "@/components/Navbar";
import SharedWithMe from "@/components/SharedWithMe";
import TravelAssistantBox from "@/components/TravelAssistantBox";
import TravelEssentials from "@/components/TravelEssentials";
import { getActivePromotions } from "@/lib/admin-content";
import { allCrossings } from "@/lib/border-store";
import { readAssumptions } from "@/lib/planner-settings-store";
import { vacationDestinations } from "@/data/vacation-destinations";
import { templatesFrom } from "@/lib/trip-setup";
import { loadVacationSources } from "@/lib/vacation-sources";

export const metadata = pageMetadata({
  title: "Itinerary planner — White Glove Itineraries",
  description: "Build your trip day by day — flights, hotels, and stops — with automatic checks and a printable itinerary.",
  path: "/itinerary",
  noIndex: true,
});

export default async function ItineraryPage() {
  const userAgent = (await headers()).get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const footerPromotions = await getActivePromotions("itinerary-footer", "/itinerary", device);
  // Which crossings are on each border and what was found at them. Read here
  // because the planner runs in the browser and the crossings do not.
  const crossings = await allCrossings();
  // How long a day is, how long a stop takes, how fast the driving goes —
  // /admin/planner. Read here for the same reason the crossings are.
  const assume = await readAssumptions();
  // Somewhere real to start from. Built here rather than in the browser
  // because the places in each template come from the same lists the vacation
  // pages read, owner-added entries included — see lib/vacation-sources.ts.
  const templates = templatesFrom(vacationDestinations, await loadVacationSources());

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="border-b border-[var(--gold-light)] px-5 py-9 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">Itinerary planner</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            Your trip, day by day.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Dates, travelers, flights, hotels and stops — with the driving between them worked out on real roads, a
            warning when a Friday runs late, and a printable copy for the car. Free to use, and yours to change.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            To start from a few answers instead of a blank page,{" "}
            <Link href="/plan" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
              Answer three short steps first
            </Link>{" "}
            and this page opens with your answers already in it.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-4 shadow-[0_8px_26px_rgba(23,45,82,.05)] sm:p-6">
          <TravelAssistantBox />
        </div>

        <div className="itinerary-planner mt-8">
          <SharedWithMe />
          <ItineraryBuilder crossings={crossings} today={new Date().toISOString().slice(0, 10)} assume={assume} templates={templates} />
        </div>

        <ItineraryFooter promotion={footerPromotions[0] ?? null} />
      </section>

      {/* After the planner — not above it — so essentials sit beside a real trip. */}
      <TravelEssentials
        pageType="itinerary"
        heading="Travel essentials for this trip"
        intro="Flights, places to stay, car hire and pre-departure add-ons when a partner hand-off is configured. Nothing appears here until it can actually open."
        placement="itinerary-essentials"
      />

      <Footer />
    </main>
  );
}
