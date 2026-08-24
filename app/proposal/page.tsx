import Footer from "@/components/Footer";
import LockedToolCard from "@/components/LockedToolCard";
import Navbar from "@/components/Navbar";
import ProposalBuilder from "@/components/ProposalBuilder";
import AdvisorWelcomeUploader from "@/components/AdvisorWelcomeUploader";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSignedIn } from "@/lib/require-signed-in";
import { accountCookieName, getCurrentAccountData, resolveBusinessOwner } from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { cookies } from "next/headers";

// Brand-aware, signed-in only: /proposal is one of the itineraries domain's
// own pages, the same as /itinerary and /app.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Build a proposal — White Glove Itineraries" : "Build a proposal — White Glove Kosher Travel",
    description: "Offer a client one or more trip options to compare and approve before it becomes the itinerary.",
    path: "/proposal",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function ProposalPage() {
  await requireSignedIn("/proposal");
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  // A staff login's plan gate is the business it's linked to, not its own.
  const plan = account ? await getPlan(await resolveBusinessOwner(account.email)) : "free";
  const allowed = mayServeCompanionClients(plan);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar minimal />
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <PageHeader
          eyebrow="Proposal"
          title="Build a proposal"
          description="One or more options for the trip in your planner right now — hotels, flights, activities, a price. Send it, and your client compares and approves before it becomes the itinerary."
        />

        {allowed ? (
          <div className="mt-8 flex flex-col gap-10">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Welcome video</h2>
              <p className="mt-1 text-sm text-stone-600">A short hello from you, shown at the top of the proposal before your client even opens it.</p>
              <div className="mt-4">
                <AdvisorWelcomeUploader />
              </div>
            </div>
            <div className="border-t border-[var(--gold-light)] pt-8">
              <ProposalBuilder />
            </div>
          </div>
        ) : (
          <LockedToolCard
            toolLabel="Proposals"
            plan={plan}
            bullets={[
              "Compare hotels, flights and activities side by side, with a price.",
              "A client approves it with one tap — no back-and-forth over email.",
              "Once approved, it becomes the itinerary automatically.",
            ]}
          />
        )}
      </section>
      <Footer />
    </main>
  );
}
