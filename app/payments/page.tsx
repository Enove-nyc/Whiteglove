import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PaymentsPanel from "@/components/PaymentsPanel";
import { requireSignedIn } from "@/lib/require-signed-in";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
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
  const plan = account ? await getPlan(account.email) : "traveler";
  const allowed = mayServeCompanionClients(plan);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          Trip payments
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Set a total for the trip in your planner right now, split it across the families or travelers on it, and see
          what each has paid. Money goes straight to your own connected Stripe account — never through White Glove.
        </p>

        {allowed ? (
          <div className="mt-8">
            <PaymentsPanel />
          </div>
        ) : (
          <div className="mt-8 max-w-xl rounded-2xl border border-[var(--gold-light)] bg-white p-6">
            <p className="text-base leading-7 text-stone-600">
              Trip payments are part of a Business account. You are on {PLAN_LABELS[plan]}. Ask about {PLAN_LABELS.business}{" "}
              from your account, and we will be in touch.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/account" className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                Ask about {PLAN_LABELS.business}
              </Link>
              <Link href="/itinerary" className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-white">
                Back to the planner
              </Link>
            </div>
          </div>
        )}
      </section>
      <Footer />
    </main>
  );
}
