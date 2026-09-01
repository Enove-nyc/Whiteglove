import Link from "next/link";
import { cookies } from "next/headers";
import AppCodeEntry from "@/components/companion/AppCodeEntry";
import TripAppCode from "@/components/companion/TripAppCode";
import CompanionApp from "@/components/companion/CompanionApp";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import {
  accountCookieName,
  checkTripFlightStatus,
  getCurrentAccountSummary,
  getTripAlerts,
  getTripItinerary,
  getTrips,
  readSessionEmail,
  resolveBusinessOwner,
} from "@/lib/account-store";
import { getPlan } from "@/lib/account-plan-store";
import { appCoversEveryTrip, mayServeCompanionClients } from "@/lib/account-limits";
import { mayOpenTripInApp, mayReachTheApp } from "@/lib/companion-access";
import { readTripPasses } from "@/lib/trip-pass-store";
import { tripHasPass } from "@/lib/trip-pass";
import { PLAN_LABELS } from "@/lib/account-plans";
import { emptyItinerary } from "@/data/itinerary";
import { buildCompanionFromItinerary } from "@/lib/companion-build";
import { readBrand } from "@/lib/business-brand-store";
import { getAppPrefs } from "@/lib/app-prefs-store";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";
import { BRAND_NAME } from "@/lib/site-brand-core";

// One person's trip, on one person's phone. Nothing here belongs in a search
// result, and the gate below means most visitors never see it at all.
// Brand-aware: this is the itineraries product's own page, and on that domain
// its tab must not read "White Glove Kosher Travel". The page is already
// force-dynamic below, so reading the brand costs nothing.
export async function generateMetadata() {
  const brand = await currentBrand();
  return pageMetadata({
    title: `The ${BRAND_NAME[brand]} app`,
    description: "The trip in your pocket — a day at a time, with a travel wallet kept for when there is no signal.",
    path: "/app",
    noIndex: true,
    brand,
  });
}

// The plan and the trip are read fresh each time.
export const dynamic = "force-dynamic";

function firstParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

/**
 * The White Glove app — a trip in your pocket.
 *
 * THE GATE IS THE TRIP'S, NOT THE ACCOUNT'S. Advisor Starter and Pro carry the
 * app on every trip they run. Everybody else opens the trip a Trip Pass has
 * been spent on — one trip, the one they are taking. Both questions are asked
 * by mayOpenTripInApp in lib/companion-access.ts, and this page never decides
 * either itself. It used to read mayUseCompanionApp alone, which meant one
 * single purchase opened every trip that account would ever have.
 *
 * Handing a trip to a client stays Advisor Starter and up, behind a separate
 * gate (mayServeCompanionClients) — the Messages inbox below, and the client
 * links, chat and report routes elsewhere.
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
  searchParams: Promise<{ trip?: string | string[]; share_title?: string | string[]; share_text?: string | string[]; share_url?: string | string[] }>;
}) {
  const cookie = (await cookies()).get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  const sessionEmail = readSessionEmail(cookie);
  const signedInAs = account?.email || sessionEmail || "";
  // A staff login opens the business's own trip here, not a personal one —
  // see lib/account-store.ts's resolveBusinessOwner. An account with no
  // team just resolves to itself.
  const who = signedInAs ? await resolveBusinessOwner(signedInAs) : "";
  // Not signed in: the two doors. A client enters the code their adviser sent
  // and opens their one trip with no account; an adviser or a Gold member logs
  // in to their own trips. This replaced a straight redirect to /login, which
  // left a client with a code nowhere to put it.
  if (!who) {
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
          <PageHeader
            eyebrow="The White Glove app"
            title="The trip in your pocket."
            description="A day at a time, with a travel wallet kept on the phone for when there is no signal."
          />

          <div className="rounded-2xl border border-[var(--gold)]/30 bg-white p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
              Have a code from your travel adviser?
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Enter it to open your trip. You do not need an account.
            </p>
            <div className="mt-4">
              <AppCodeEntry />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--gold-light)] bg-white p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
              Travel adviser or Gold member?
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-600">
              Log in to open your own trips in the app.
            </p>
            <div className="mt-4">
              <LinkButton href="/login?next=%2Fapp">Log in</LinkButton>
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  const plan = await getPlan(who);
  if (await mayReachTheApp(who, plan)) {
    // Gold has the app for its own trips; only Business hands it to a client.
    // The copy below turns on this, so a Gold member is never offered a client
    // feature they do not have.
    const servesClients = mayServeCompanionClients(plan);
    const params = await searchParams;
    const wantedId = firstParam(params.trip);
    // A place shared in from outside — Google Maps' own share sheet, say —
    // arrives here as the OS's Web Share Target params (app/manifest.ts).
    // Held as a plain line of text; the advisor picks which client's thread
    // it goes into, the same way any other message does.
    const sharedDraft = [firstParam(params.share_title), firstParam(params.share_text), firstParam(params.share_url)]
      .filter(Boolean)
      .join("\n")
      .trim();
    const trips = await getTrips(who).catch(() => []);
    const selected =
      trips.find((t) => t.id === wantedId) ?? trips.find((t) => t.active) ?? trips[0] ?? null;

    // A trip only opens if the plan covers every trip, or a pass has been
    // spent on THIS one. Asked before the itinerary is even read: there is no
    // point building an app the person may not open.
    const covered = selected ? await mayOpenTripInApp(who, plan, selected.id) : false;

    let companionTrip = null;
    if (selected && covered) {
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
            tripId: selected.id,
            kosher: prefs.kosherFeatures,
          },
        );
        // Best-effort, and throttled server-side — see checkTripFlightStatus.
        // A failure here should never keep the app from opening.
        await checkTripFlightStatus(who, selected.id).catch(() => []);
        if (companionTrip) companionTrip.liveAlerts = await getTripAlerts(who, selected.id).catch(() => []);
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
          <CompanionApp trip={companionTrip} advisorInbox={servesClients} sharedDraft={sharedDraft || undefined} />
        </main>
      );
    }

    // Nothing to show yet — say plainly which of the three reasons it is,
    // rather than pretending with a sample. The trip may not be in the app at
    // all (no pass spent on it), it may have no dates, or there may be no trip.
    const dated = trips.filter((t) => t.startDate && t.endDate);
    // Only trips that would actually open are offered as ready. Listing every
    // dated trip was fine when the app came with the account; with the app
    // bought a trip at a time it would be a list of doors that do not open.
    const passes = await readTripPasses(who);
    const openable = appCoversEveryTrip(plan) ? dated : dated.filter((t) => tripHasPass(passes, t.id));
    const needsPass = Boolean(selected) && !covered;
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-ink)]">The White Glove app</p>
          {needsPass && selected ? (
            // The trip exists and is fine; it simply has no pass on it. This is
            // its own state rather than an error, and the way out of it is one
            // button — see components/companion/TripAppCode.tsx.
            <TripAppCode tripId={selected.id} tripName={selected.name} />
          ) : (
            <EmptyState
              title={selected ? `${selected.name} needs its dates.` : "You don't have a trip yet."}
              description={
                selected
                  ? "The app shows a trip a day at a time, so it needs the trip's start and end dates. Open it in the planner, set the dates, and it fills in here, ready for the phone."
                  : servesClients
                    ? "Build a trip in the planner — its dates, where you are staying, and the stops — and it appears here as the app you can hand your client."
                    : "Build a trip in the planner — its dates, where you are staying, and the stops — and it appears here as the app in your pocket."
              }
              action={<LinkButton href="/itinerary">Open the planner</LinkButton>}
            />
          )}
          {openable.length > 0 && (
            <div className="mt-2 border-t border-[var(--gold-light)] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-stone-500">Trips ready to open</p>
              <ul className="mt-3 flex flex-col gap-2">
                {openable.map((t) => (
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

  // Signed in, with no advisor plan and no pass ever bought — the one state
  // the app is not part of. Say what it is and point at the Trip Pass, which
  // opens one trip. It still takes a client's code, since a client may have
  // their own account and a code from their adviser at once. The itineraries
  // "See the app" link can land here, so this is where that promise has to be
  // true.
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-16 sm:px-8 sm:py-24">
        <PageHeader
          eyebrow="The White Glove app"
          title="The trip in your pocket."
          description="Your itinerary a day at a time, with a travel wallet kept on the phone for when there is no signal. It is the trip you build in here, carried on your phone rather than on paper."
        />

        <div className="rounded-2xl border border-[var(--gold)]/30 bg-white p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
            Have a code from your travel adviser?
          </h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">
            Enter it to open your trip — you do not need the app on your own account for that.
          </p>
          <div className="mt-4">
            <AppCodeEntry />
          </div>
        </div>

        <p className="text-base leading-7 text-stone-600">
          You are on {PLAN_LABELS[plan]}, which builds the trip. A {PLAN_LABELS.one_trip} opens one trip here, on
          your phone; {PLAN_LABELS.starter} and {PLAN_LABELS.pro} open every trip you run.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          {/* Main's newer copy ("Choose a plan" — plans are self-serve now, not
              something to ask about), through this branch's shared LinkButton. */}
          <LinkButton href="/account">Choose a plan</LinkButton>
          <LinkButton href="/itinerary" variant="secondary">Build a trip yourself</LinkButton>
        </div>
      </section>
      <Footer />
    </main>
  );
}
