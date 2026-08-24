import { cookies } from "next/headers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import LibraryManager from "@/components/LibraryManager";
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

// Brand-aware, signed-in only: /library is one of the itineraries domain's
// own pages, the same as /itinerary, /app and /proposal.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Your content library — White Glove Itineraries" : "Your content library — White Glove Kosher Travel",
    description: "Save hotels, activities, tours and contacts once, and reuse them on any proposal or trip.",
    path: "/library",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  await requireSignedIn("/library");
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
          eyebrow="Content library"
          title="Your content library"
          description="Hotels, activities, tours and contacts, saved once and ready to drop into any proposal instead of retyping them — group them into a destination pack, like Rome Family Trip, to add several at once."
        />

        {allowed ? (
          <div className="mt-8">
            <LibraryManager />
          </div>
        ) : (
          <Card className="mt-8 max-w-xl">
            <p className="text-base leading-7 text-stone-600">
              A content library is part of a Business account. You are on {PLAN_LABELS[plan]}. Ask about{" "}
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
