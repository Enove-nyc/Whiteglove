import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CompanionApp from "@/components/companion/CompanionApp";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { accountCookieName, getCurrentAccountSummary, readSessionEmail } from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { mayUseCompanionApp } from "@/lib/account-limits";
import { PLAN_LABELS } from "@/lib/account-plans";
import { pageMetadata } from "@/lib/seo";

// One person's trip, on one person's phone. Nothing here belongs in a search
// result, and the gate below means most visitors never see it at all.
export const metadata = pageMetadata({
  title: "The White Glove app",
  description: "The trip in your pocket — a day at a time, the kosher side of each day, and the Shabbos that stops early.",
  path: "/app",
  noIndex: true,
});

// The plan and the trip are read fresh each time.
export const dynamic = "force-dynamic";

/**
 * The White Glove app — a trip in your pocket.
 *
 * BUSINESS-ONLY, on purpose and in one place. The gate is mayUseCompanionApp in
 * lib/account-limits.ts, the same file that holds every other plan entitlement;
 * this page is the only door that reads it, and the account page says what
 * Business gets in the same breath. A signed-out visitor is sent to sign in; a
 * signed-in traveller who is not on Business is told what this is and where to
 * ask for it, rather than being shown a wall.
 */
export default async function AppPage() {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  const sessionEmail = readSessionEmail(cookie);
  const who = account?.email || sessionEmail || "";
  if (!who) redirect("/login?next=%2Fapp");

  const plan = await getPlan(who);
  if (mayUseCompanionApp(plan)) {
    // The app fills the screen — its own header, tabs and chrome, no site
    // furniture around it. On a phone it is the whole window; installed to the
    // home screen it is the whole app.
    return (
      <main>
        <CompanionApp />
      </main>
    );
  }

  // Signed in, but not on Business. Say what it is and where it is, once.
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">The White Glove app</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          The trip in your pocket.
        </h1>
        <p className="text-base leading-7 text-stone-600">
          A day at a time, the kosher side of each day, the Shabbos that stops early, and a travel
          wallet kept on the phone for when there is no signal. It is the itinerary you build in
          here, handed to your traveller on their phone rather than on paper.
        </p>
        <p className="text-base leading-7 text-stone-600">
          The app is part of {PLAN_LABELS.business} — the plan for an agency or an office planning
          trips for other people. You are on {PLAN_LABELS[plan]}. Ask about {PLAN_LABELS.business}{" "}
          from your account, and we will be in touch.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/account"
            className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Ask about {PLAN_LABELS.business}
          </Link>
          <Link
            href="/itinerary"
            className="rounded-full border border-stone-300 px-6 py-3 text-sm font-semibold text-[var(--navy)] transition hover:bg-white"
          >
            Build a trip yourself
          </Link>
        </div>
      </section>
      <Footer />
    </main>
  );
}
