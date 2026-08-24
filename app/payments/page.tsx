import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PaymentsPanel from "@/components/PaymentsPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { LinkButton } from "@/components/ui/Button";
import { requireSignedIn } from "@/lib/require-signed-in";
import { accountCookieName, getCurrentAccountData, resolveBusinessOwner } from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { PLAN_LABELS } from "@/lib/account-plans";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
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
  const plan = account ? await getPlan(await resolveBusinessOwner(account.email)) : "traveler";
  const allowed = mayServeCompanionClients(plan);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <PageHeader
          eyebrow="Payments"
          title="Trip payments"
          description="Set a total for the trip in your planner right now, split it across the families or travelers on it, and see what each has paid. Money goes straight to your own connected Stripe account — never through White Glove."
        />

        {allowed ? (
          <div className="mt-8">
            <PaymentsPanel />
          </div>
        ) : (
          <Card className="mt-8 max-w-xl">
            <p className="text-base leading-7 text-stone-600">
              Trip payments are part of a Business account. You are on {PLAN_LABELS[plan]}. Ask about {PLAN_LABELS.business}{" "}
              from your account, and we will be in touch.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <LinkButton href="/account">Ask about {PLAN_LABELS.business}</LinkButton>
              <LinkButton href="/itinerary" variant="secondary">Back to the planner</LinkButton>
            </div>
          </Card>
        )}
      </section>
      <Footer />
    </main>
  );
}
