import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PipelineDashboard from "@/components/PipelineDashboard";
import { accountCookieName, getCurrentAccountSummary, readSessionEmail } from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";

// A planner's own client list and where each trip stands. Nothing here is a
// visitor's business, and the gate below means most accounts never reach it.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Trip pipeline | White Glove Itineraries" : "Trip pipeline | White Glove Kosher Travel",
    description: "Every client trip, and where it stands.",
    path: "/pipeline",
    noIndex: true,
  });
}

/**
 * Planner CRM / Trip Pipeline — every client trip, one row each, grouped by
 * where it stands: Inquiry, Planning, Proposal, Awaiting approval, Confirmed,
 * Traveling, Completed. BUSINESS-ONLY, the same door as the client inbox, the
 * proposal builder and client forms — a Gold account has the app for its own
 * trips and no clients to run a pipeline of.
 */
export default async function PipelinePage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  const sessionEmail = readSessionEmail(cookie);
  const who = account?.email || sessionEmail || "";
  if (!who) redirect("/login?next=%2Fpipeline");

  const plan = await getPlan(who);
  if (!mayServeCompanionClients(plan)) {
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">Trip pipeline</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            Part of a Business account.
          </h1>
          <p className="text-base leading-7 text-stone-600">
            The trip pipeline is where a Business account sees every client trip and where each one stands — from a first
            inquiry through to a completed trip.
          </p>
          <Link href="/account" className="w-fit rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
            Ask about Business
          </Link>
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">Trip pipeline</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          Every trip, and where it stands.
        </h1>
        <div className="mt-8">
          <PipelineDashboard />
        </div>
      </section>
      <Footer />
    </main>
  );
}
