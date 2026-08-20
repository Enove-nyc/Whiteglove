import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import CompanionApp from "@/components/companion/CompanionApp";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import {
  accountCookieName,
  getCurrentAccountSummary,
  getTripItinerary,
  getTrips,
  readSessionEmail,
} from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { mayServeCompanionClients, mayUseCompanionApp } from "@/lib/account-limits";
import { PLAN_LABELS } from "@/lib/account-plans";
import { emptyItinerary } from "@/data/itinerary";
import { buildCompanionFromItinerary } from "@/lib/companion-build";
import { readBrand } from "@/lib/business-brand-store";
import { getAppPrefs } from "@/lib/app-prefs-store";
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

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * The White Glove app — a trip in your pocket.
 *
 * GOLD AND BUSINESS, in one place. The gate is mayUseCompanionApp in
 * lib/account-limits.ts, and this page is the only door that reads it. Handing a
 * trip to a client stays Business-only behind a separate gate
 * (mayServeCompanionClients) — the Messages inbox below, and the client links,
 * chat and report routes elsewhere.
 *
 * IT SHOWS THE OWNER'S OWN TRIP, never a sample. `?trip=<id>` opens a specific
 * one (that is what the "Open the app" links carry); otherwise it opens the
 * trip that is open in the planner. A trip with no dates yet is not padded with
 * a demo — the page says, plainly, that its dates need setting in the planner,
 * and lists the account's other trips to switch to.
 */
export default async function AppPage({
  searchParams,
}: {
  searchParams: Promise<{ trip?: string | string[] }>;
}) {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  const sessionEmail = readSessionEmail(cookie);
  const who = account?.email || sessionEmail || "";
  if (!who) redirect("/login?next=%2Fapp");

  const plan = await getPlan(who);
  if (mayUseCompanionApp(plan)) {
    // Gold has the app for its own trips; only Business hands it to a client.
    // The copy below turns on this, so a Gold member is never offered a client
    // feature they do not have.
    const servesClients = mayServeCompanionClients(plan);
    const wantedId = firstParam((await searchParams).trip);
    const trips = await getTrips(who).catch(() => []);
    const selected =
      trips.find((t) => t.id === wantedId) ?? trips.find((t) => t.active) ?? trips[0] ?? null;

    let companionTrip = null;
    if (selected) {
      const chosen = await getTripItinerary(who, selected.id).catch(() => null);
      if (chosen) {
        const [brand, prefs] = await Promise.all([
          readBrand(who).catch(() => null),
          getAppPrefs(who).catch(() => ({ kosherFeatures: false })),
        ]);
        const advisorName = chosen.advisor || (brand?.enabled ? brand.name : undefined);
        companionTrip = await buildCompanionFromItinerary(
          { ...emptyItinerary(), ...chosen.itinerary },
          {
            today: new Date().toISOString().slice(0, 10),
            advisorName,
            tripName: chosen.tripName,
            client: chosen.client,
            kosher: prefs.kosherFeatures,
          },
        );
      }
    }

    if (companionTrip) {
      // The app fills the screen — its own header, tabs and chrome, no site
      // furniture around it. On a phone it is the whole window; installed to the
      // home screen it is the whole app.
      //
      // Business hands the app to clients, so it gets the Messages inbox — every
      // client they have shared a trip with. Gold has the app for its own trips
      // and no inbox; the tab simply is not there.
      return (
        <main>
          <CompanionApp trip={companionTrip} advisorInbox={servesClients} />
        </main>
      );
    }

    // A Gold or Business account with no trip to show yet — say so plainly, and
    // offer the way to fix it, rather than pretending with a sample.
    const dated = trips.filter((t) => t.startDate && t.endDate);
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">The White Glove app</p>
          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            {selected ? `${selected.name} needs its dates.` : "You don't have a trip yet."}
          </h1>
          <p className="text-base leading-7 text-stone-600">
            {selected
              ? "The app shows a trip a day at a time, so it needs the trip's start and end dates. Open it in the planner, set the dates, and it fills in here, ready for the phone."
              : servesClients
                ? "Build a trip in the planner — its dates, where you are staying, and the stops — and it appears here as the app you can hand your client."
                : "Build a trip in the planner — its dates, where you are staying, and the stops — and it appears here as the app in your pocket."}
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link href="/itinerary" className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90">
              Open the planner
            </Link>
          </div>
          {dated.length > 0 && (
            <div className="mt-2 border-t border-[var(--gold-light)] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Trips ready to open</p>
              <ul className="mt-3 flex flex-col gap-2">
                {dated.map((t) => (
                  <li key={t.id}>
                    <Link href={`/app?trip=${t.id}`} className="text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
                      {t.name}
                      {t.client ? ` — for ${t.client}` : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
        <Footer />
      </main>
    );
  }

  // Signed in on Traveler — the only plan the app is not part of (Gold and
  // Business both cleared the gate above). Say what it is, and point at Gold,
  // the first plan that includes it, not Business. The itineraries "See the
  // app" link can land here, so this is where that promise has to be true.
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">The White Glove app</p>
        <h1 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
          The trip in your pocket.
        </h1>
        <p className="text-base leading-7 text-stone-600">
          Your itinerary a day at a time, with a travel wallet kept on the phone for when there is
          no signal. It is the trip you build in here, carried on your phone rather than on paper.
        </p>
        <p className="text-base leading-7 text-stone-600">
          The app comes with {PLAN_LABELS.pro} and {PLAN_LABELS.business}. You are on{" "}
          {PLAN_LABELS[plan]}. Ask about {PLAN_LABELS.pro} from your account, and we will be in touch.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/account"
            className="rounded-full bg-[var(--navy)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Ask about {PLAN_LABELS.pro}
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
