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
  title: "Itinerary planner — White Glove Kosher Travel",
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
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            Itinerary planner
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
            Flights, hotels and stops, day by day — see{" "}
            <Link href="/sample-itinerary" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
              a sample itinerary
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <TravelAssistantBox />

        <div className="itinerary-planner mt-6">
          <SharedWithMe />
          <ItineraryBuilder crossings={crossings} today={new Date().toISOString().slice(0, 10)} assume={assume} templates={templates} />
        </div>

        <ItineraryFooter promotion={footerPromotions[0] ?? null} />
      </section>

      {/* After the planner — not above it — so essentials sit beside a real trip. */}
      <TravelEssentials
        pageType="itinerary"
        heading="Travel essentials for this trip"
        intro="Flights, places to stay, car hire and add-ons through our booking partners."
        placement="itinerary-essentials"
      />

      <Footer />
    </main>
  );
}
