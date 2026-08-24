import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TripActivityFeed from "@/components/TripActivityFeed";
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

// Brand-aware, signed-in only: /activity is one of the itineraries domain's
// own pages, the same as /payments and /pipeline.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Trip activity — White Glove Itineraries" : "Trip activity — White Glove Kosher Travel",
    description: "What actually happened on the trip in your planner right now.",
    path: "/activity",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  await requireSignedIn("/activity");
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountData(cookie);
  const plan = account ? await getPlan(await resolveBusinessOwner(account.email)) : "traveler";
  const allowed = mayServeCompanionClients(plan);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <PageHeader
          eyebrow="Activity"
          title="Trip activity"
          description="A proposal sent, a payment received, an add-on answered, a stage changed — logged automatically as it happens on the trip in your planner right now."
        />

        {allowed ? (
          <div className="mt-8">
            <TripActivityFeed />
          </div>
        ) : (
          <Card className="mt-8 max-w-xl">
            <p className="text-base leading-7 text-stone-600">
              A trip&apos;s activity feed is part of a Business account. You are on {PLAN_LABELS[plan]}. Ask about{" "}
              {PLAN_LABELS.business} from your account, and we will be in touch.
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
