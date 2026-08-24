import { cookies } from "next/headers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ClientFormBuilder from "@/components/ClientFormBuilder";
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

// Brand-aware, signed-in only: /forms is one of the itineraries domain's
// own pages, the same as /itinerary, /app, /proposal and /library.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Client forms — White Glove Itineraries" : "Client forms — White Glove Kosher Travel",
    description: "Send a secure pre-trip form and read back what your client answers.",
    path: "/forms",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function FormsPage() {
  await requireSignedIn("/forms");
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
          eyebrow="Client forms"
          title="Client forms"
          description="Ask for exactly what you need — legal names, passports, preferences — before the trip. Answers come back here, never onto the itinerary itself."
        />

        {allowed ? (
          <div className="mt-8">
            <ClientFormBuilder />
          </div>
        ) : (
          <Card className="mt-8 max-w-xl">
            <p className="text-base leading-7 text-stone-600">
              A client form is part of a Business account. You are on {PLAN_LABELS[plan]}. Ask about{" "}
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
