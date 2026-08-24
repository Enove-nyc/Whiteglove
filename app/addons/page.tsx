import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AddonsEditor from "@/components/AddonsEditor";
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

// Brand-aware, signed-in only: /addons is one of the itineraries domain's
// own pages, the same as /proposal and /payments.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Trip add-ons — White Glove Itineraries" : "Trip add-ons — White Glove Kosher Travel",
    description: "Offer optional extras on the trip in your planner right now, and see what your client has accepted.",
    path: "/addons",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function AddonsPage() {
  await requireSignedIn("/addons");
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  // A staff login's plan gate is the business it's linked to, not its own.
  const plan = account ? await getPlan(await resolveBusinessOwner(account.email)) : "traveler";
  const allowed = mayServeCompanionClients(plan);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <PageHeader
          eyebrow="Add-ons"
          title="Trip add-ons"
          description="Optional extras on top of the trip in your planner right now — travel insurance, an airport transfer, a private tour. Your client accepts or declines each from its own link."
        />

        {allowed ? (
          <div className="mt-8">
            <AddonsEditor />
          </div>
        ) : (
          <Card className="mt-8 max-w-xl">
            <p className="text-base leading-7 text-stone-600">
              Trip add-ons are part of a Business account. You are on {PLAN_LABELS[plan]}. Ask about {PLAN_LABELS.business}{" "}
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
