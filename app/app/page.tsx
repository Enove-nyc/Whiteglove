import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { currentBrand } from "@/lib/site-brand";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppCodeEntry from "@/components/companion/AppCodeEntry";
import ClientCodeMemory from "@/components/companion/ClientCodeMemory";
import TripCompanionCode from "@/components/companion/TripCompanionCode";
import { accountCookieName, getCurrentAccountSummary, getSharedItineraryByShareId, getTrips } from "@/lib/account-store";
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
  const match = /^\/i\/([A-Za-z0-9_-]+)\/app$/.exec(remembered);
  if (params.enter !== "1" && match && await getSharedItineraryByShareId(match[1])) redirect(remembered);
  const trips = account ? await getTrips(account.email) : [];
  return <><Navbar minimal homeHref="/app" bottomBar={false} /><main className="min-h-screen bg-[#FAF8F3] px-5 pb-16 pt-[calc(2rem+env(safe-area-inset-top))] text-[#15204A]">
    {remembered && !match ? <ClientCodeMemory path={null} /> : null}
    <section className="mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-4xl">Open your trip</h1>
      <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-5">
        <AppCodeEntry />
      </div>
      {account ? <section className="mt-8">
        <h2 className="text-xl font-semibold">Your trips</h2>
        {trips.length ? <ul className="mt-4 space-y-4">{trips.map((trip) => <li key={trip.id} className="rounded-2xl border border-stone-200 bg-white p-5"><h3 className="font-semibold">{trip.name}</h3><TripCompanionCode tripId={trip.id} /></li>)}</ul>
          : <p className="mt-3 text-sm leading-6 text-stone-600">No trips yet.</p>}
      </section> : <p className="mt-6 text-sm"><Link href="/login?next=%2Fapp%3Fenter%3D1" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Log in</Link></p>}
    </section>
  </main><Footer minimal /></>;
}

