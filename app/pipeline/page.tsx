import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Footer from "@/components/Footer";
import LockedToolCard from "@/components/LockedToolCard";
import Navbar from "@/components/Navbar";
import PipelineDashboard from "@/components/PipelineDashboard";
import { PageHeader } from "@/components/ui/PageHeader";

import { accountCookieName, getCurrentAccountSummary, readSessionEmail, resolveBusinessOwner } from "@/lib/account-store";
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
 * Traveling, Completed. ADVISOR STARTER AND UP, the same door as the client
 * inbox, the proposal builder and client forms — One Trip has the app for
 * its own one trip and no clients to run a pipeline of.
 */
export default async function PipelinePage() {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  const sessionEmail = readSessionEmail(cookie);
  const who = account?.email || sessionEmail || "";
  if (!who) redirect("/login?next=%2Fpipeline");

  // A staff login's plan gate is the business it's linked to, not its own.
  const plan = await getPlan(await resolveBusinessOwner(who));
  if (!mayServeCompanionClients(plan)) {
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
          <PageHeader
            eyebrow="Trip pipeline"
            title="Every client trip, and where it stands."
          />
          <LockedToolCard
            toolLabel="The trip pipeline"
            plan={plan}
            bullets={[
              "Every client trip on one board, from first inquiry through to completed.",
              "See at a glance what needs answering, what is unpaid, and who is traveling now.",
            ]}
          />
        </section>
        <Footer />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar minimal />
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <PageHeader eyebrow="Trip pipeline" title="Every trip, and where it stands." />
        <div className="mt-8">
          <PipelineDashboard />
        </div>
      </section>
      <Footer />
    </main>
  );
}
