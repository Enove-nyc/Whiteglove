import Footer from "@/components/Footer";
import LockedToolCard from "@/components/LockedToolCard";
import Navbar from "@/components/Navbar";
import PaymentsPanel from "@/components/PaymentsPanel";
import { TripCommissionEditor } from "@/components/CommissionsPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSignedIn } from "@/lib/require-signed-in";
import { accountCookieName, getCurrentAccountData, resolveBusinessOwner } from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import TripContextBar from "@/components/TripContextBar";
import { cookies } from "next/headers";

// Brand-aware, signed-in only: /payments is one of the itineraries domain's
// own pages, the same as /proposal and /pipeline.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Trip payments — White Glove Itineraries" : "Trip payments — White Glove Kosher Travel",
    description: "Set a trip's balance, split it across families, and see what's been collected.",
    path: "/payments",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  await requireSignedIn("/payments");
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  // A staff login's plan gate is the business it's linked to, not its own.
  const plan = account ? await getPlan(await resolveBusinessOwner(account.email)) : "free";
  const allowed = mayServeCompanionClients(plan);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar minimal />
      {/* Which trip this is, and the trip's other screens. Renders nothing
          for a plan that can only reach one of them. */}
      <TripContextBar current="/payments" />
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <PageHeader
          eyebrow="Payments"
          title="Trip payments"
          description="Set a total for the trip in your planner right now, split it across the families or travelers on it, and see what each has paid. Money goes straight to your own connected Stripe account — never through White Glove."
        />

        {allowed ? (
          <div className="mt-8 flex flex-col gap-10">
            <PaymentsPanel />
            <div className="border-t border-[var(--gold-light)] pt-8">
              <PageHeader
                eyebrow="Commission"
                title="Supplier commission"
                description="What this trip's suppliers — a hotel, a tour operator — owe the agency back for the business. A different money from the balance above."
              />
              <div className="mt-6">
                <TripCommissionEditor />
              </div>
            </div>
          </div>
        ) : (
          <LockedToolCard
            toolLabel="Trip payments"
            plan={plan}
            bullets={[
              "Set one total for a trip and split it across families or travelers.",
              "See what each person has paid and what's outstanding.",
              "Money goes straight to your own connected Stripe account.",
            ]}
          />
        )}
      </section>
      <Footer />
    </main>
  );
}
