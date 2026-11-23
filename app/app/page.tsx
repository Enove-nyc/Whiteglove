import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { currentBrand } from "@/lib/site-brand";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppCodeEntry from "@/components/companion/AppCodeEntry";
import ClientCodeMemory from "@/components/companion/ClientCodeMemory";
import TripCompanionCode from "@/components/companion/TripCompanionCode";
import { accountCookieName, getCurrentAccountSummary, getSharedItineraryByShareId, getSharedTraveler, getTrips } from "@/lib/account-store";
import { SAMPLE_TRIP_CODE } from "@/data/sample-itinerary";
import { pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  const brand = await currentBrand();
  return pageMetadata({ title: brand === "itineraries" ? "Your trip companion — White Glove Itineraries" : "Your trip companion — White Glove Kosher Travel", description: "Your itinerary, personal travel wallet and trip group chat.", path: "/app", noIndex: true });
}

export default async function AppPage({ searchParams }: { searchParams: Promise<{ enter?: string }> }) {
  const params = await searchParams;
  const jar = await cookies();
  const account = await getCurrentAccountSummary(jar.get(accountCookieName())?.value);
  const remembered = jar.get("wg-app-path")?.value ?? "";
  const match = /^\/(i|t)\/([A-Za-z0-9_-]+)\/app$/.exec(remembered);
  const rememberedTrip = match && (match[1] === "t"
    ? await getSharedTraveler(match[2])
    : await getSharedItineraryByShareId(match[2]));
  if (params.enter !== "1" && rememberedTrip) redirect(remembered);
  const trips = account ? await getTrips(account.email) : [];
  return (
    <>
      <Navbar minimal homeHref="/app?enter=1" bottomBar={false} />
      <main className="flex-1 bg-[#FAF8F3] px-5 pb-16 pt-[calc(2rem+env(safe-area-inset-top))] text-[#15204A] sm:px-8">
        {remembered && !rememberedTrip && <ClientCodeMemory path={null} />}
        <div className="mx-auto max-w-5xl">
          <h1 className="font-[family-name:var(--font-display)] text-4xl sm:text-5xl">Open your trip</h1>
          <p className="mt-3 text-base text-stone-700">View your itinerary, travel wallet, and trip chat in your browser.</p>

          <div className="mt-8 grid items-start gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
            <section aria-labelledby="your-trips" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <h2 id="your-trips" className="text-xl font-semibold">Your trips</h2>
              {!account ? (
                <>
                  <p className="mt-2 text-stone-600">Sign in to see your saved itineraries.</p>
                  <Link href="/login?next=%2Fapp%3Fenter%3D1" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#15204A] px-5 font-semibold text-white">Sign in</Link>
                </>
              ) : trips.length ? (
                <ul className="mt-3 divide-y divide-stone-200">
                  {trips.map((trip) => (
                    <li key={trip.id} className="py-4">
                      <h3 className="font-semibold">{trip.name}</h3>
                      <TripCompanionCode tripId={trip.id} openDirectly />
                    </li>
                  ))}
                </ul>
              ) : (
                <>
                  <p className="mt-2 text-stone-600">You don’t have any saved trips yet.</p>
                  <Link href="/itinerary" className="mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Start an itinerary</Link>
                </>
              )}
            </section>

            <div className="space-y-6">
              <section aria-labelledby="trip-code-title" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                <h2 id="trip-code-title" className="text-xl font-semibold">Have a trip code or link?</h2>
                <p className="mb-4 mt-2 text-stone-600">Paste what you were given to open the itinerary.</p>
                <AppCodeEntry />
              </section>
              <Link href={`/i/${SAMPLE_TRIP_CODE}/app`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Try the app with a sample trip</Link>
            </div>
          </div>
        </div>
      </main>
      <Footer inApp />
    </>
  );
}
