import Link from "next/link";
import { getAppPrefs } from "@/lib/app-prefs-store";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { pageMetadata } from "@/lib/seo";
import { cookies, headers } from "next/headers";
import Footer from "@/components/Footer";
import ItineraryFooter from "@/components/ItineraryFooter";
import ItineraryBuilder from "@/components/ItineraryBuilder";
import Navbar from "@/components/Navbar";
import SharedWithMe from "@/components/SharedWithMe";
import TravelEssentials from "@/components/TravelEssentials";
import { PageHeader } from "@/components/ui/PageHeader";
import { getActivePromotions } from "@/lib/admin-content";
import { allCrossings } from "@/lib/border-store";
import { readAssumptions } from "@/lib/planner-settings-store";
import { currentBrand } from "@/lib/site-brand";
import TripContextBar from "@/components/TripContextBar";

// Brand-aware: /itinerary is one of the itineraries domain's own pages too.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Itinerary planner — White Glove Itineraries" : "Itinerary planner — White Glove Kosher Travel",
    description: "Build your trip day by day — flights, hotels, and stops — with automatic checks and a printable itinerary.",
    path: "/itinerary",
    noIndex: true,
  });
}

// The `ask` hand-off used to arrive here, because the travel assistant lived on
// this page. It has its own page now — app/assistant — and this one is the
// planner again, so there is no question to read out of the address.
export default async function ItineraryPage() {
  // Open to everyone (AGENTS.md, 18 November 2026). A signed-in traveller's
  // trips are saved to their account as before; anybody else builds a trip
  // that lives only in their own browser — nothing stored on our side.
  const account = await getCurrentAccountData((await cookies()).get(accountCookieName())?.value);
  const guest = !account?.email;
  // Itineraries is not a kosher product — the builder hides kosher/heritage-
  // specific tools (kevarim, zmanim, kosher food nearby) on that brand.
  const itineraries = (await currentBrand()) === "itineraries";
  /**
   * Whether this account asked for the kosher & Shabbos layer — the switch on
   * /account (AppPrefs.kosherFeatures). It decides whether the planner offers
   * zmanim at all on this brand. Read here rather than in the builder: a
   * component may not go to a store while it renders, and the answer is the
   * same for the whole page.
   */
  const kosher = itineraries
    ? await (async () => {
        if (!account?.email) return false;
        return (await getAppPrefs(account.email).catch(() => ({ kosherFeatures: false }))).kosherFeatures;
      })()
    : true;
  const userAgent = (await headers()).get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const footerPromotions = await getActivePromotions("itinerary-footer", "/itinerary", device);
  // Which crossings are on each border and what was found at them. Read here
  // because the planner runs in the browser and the crossings do not.
  const crossings = await allCrossings();
  // How long a day is, how long a stop takes, how fast the driving goes —
  // /admin/planner. Read here for the same reason the crossings are.
  const assume = await readAssumptions();
  // No starting templates: they were built from the directory, which is the
  // owner's alone now (lib/public-access.ts).
  const templates: never[] = [];

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      {/* Which trip this is, and the trip's other screens. Renders nothing
          for a plan that can only reach one of them. */}
      {!guest && <TripContextBar current="/itinerary" />}

      <section className="border-b border-[var(--gold-light)] px-5 py-9 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-7xl">
          <PageHeader
            eyebrow="Planner"
            title="Itinerary planner"
            description={
              <>
                Build and manage your own trip here, with flights, hotels and stops, day by day — see{" "}
                <Link href="/sample-itinerary" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">
                  a sample itinerary
                </Link>
                .
                {guest && (
                  <>
                    {" "}Your trip is kept in this browser, on this device only — use Preview to print it or save it as a PDF.
                  </>
                )}
              </>
            }
          />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <div className="itinerary-planner mt-6">
          {!guest && <SharedWithMe />}
          <ItineraryBuilder crossings={crossings} today={new Date().toISOString().slice(0, 10)} assume={assume} templates={templates} itineraries={itineraries} kosher={kosher} guest={guest} />
        </div>

        <ItineraryFooter promotion={footerPromotions[0] ?? null} />
      </section>

      {/* Booking partners remain on this site, after the traveller’s planner. */}
      <TravelEssentials
        pageType="itinerary"
        heading="Travel essentials for this trip"
        intro="Flights, places to stay, car hire and add-ons through our booking partners."
        placement="itinerary-essentials"
      />

      <Footer minimal={itineraries} />
    </main>
  );
}

