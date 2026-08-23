import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ProposalBuilder from "@/components/ProposalBuilder";
import { requireSignedIn } from "@/lib/require-signed-in";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
import { mayServeCompanionClients } from "@/lib/account-limits";
import { getPlan } from "@/lib/account-plan-store";
import { PLAN_LABELS } from "@/lib/account-plans";
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
  const plan = account ? await getPlan(account.email) : "free";
  const allowed = mayServeCompanionClients(plan);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          Build a proposal
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          One or more options for the trip in your planner right now — hotels, flights, activities, a price. Send it, and
          your client compares and approves before it becomes the itinerary.
        </p>

        {allowed ? (
          <div className="mt-8">
            <ProposalBuilder />
          </div>
        ) : (
          <div className="mt-8 max-w-xl rounded-2xl border border-[var(--gold-light)] bg-white p-6">
            <p className="text-base leading-7 text-stone-600">
              Proposals are part of {PLAN_LABELS.starter} and up. You are on {PLAN_LABELS[plan]}. Ask about {PLAN_LABELS.starter} from
              your account, and we will be in touch.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/account" className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                Ask about {PLAN_LABELS.starter}
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
