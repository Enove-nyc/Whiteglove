import Link from "next/link";
import { cookies } from "next/headers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import ClientFormBuilder from "@/components/ClientFormBuilder";
import { requireSignedIn } from "@/lib/require-signed-in";
import { accountCookieName, getCurrentAccountData } from "@/lib/account-store";
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
  const plan = account ? await getPlan(account.email) : "free";
  const allowed = mayServeCompanionClients(plan);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          Client forms
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Ask for exactly what you need — legal names, passports, preferences — before the trip. Answers come back
          here, never onto the itinerary itself.
        </p>

        {allowed ? (
          <div className="mt-8">
            <ClientFormBuilder />
          </div>
        ) : (
          <div className="mt-8 max-w-xl rounded-2xl border border-[var(--gold-light)] bg-white p-6">
            <p className="text-base leading-7 text-stone-600">
              A client form is part of {PLAN_LABELS.starter} and up. You are on {PLAN_LABELS[plan]}. Ask about{" "}
              {PLAN_LABELS.starter} from your account, and we will be in touch.
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
