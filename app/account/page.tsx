import Link from "next/link";
import TravelPreferencesPanel from "@/components/TravelPreferencesPanel";
import RecentPlaces from "@/components/RecentPlaces";
import TripUpdates from "@/components/TripUpdates";
import ForwardingAddress from "@/components/ForwardingAddress";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AccountPlanPanel, { type PlanOffer } from "@/components/AccountPlanPanel";
import BusinessBrandPanel from "@/components/BusinessBrandPanel";
import CompanionSettings from "@/components/companion/CompanionSettings";
import AccountRoutePanel from "@/components/AccountRoutePanel";
import AccountSettings from "@/components/AccountSettings";
import Footer from "@/components/Footer";
import { PageHeader } from "@/components/ui/PageHeader";
import { LinkButton } from "@/components/ui/Button";
import LogoutButton from "@/components/LogoutButton";
import OpenAdminButton from "@/components/OpenAdminButton";
import Navbar from "@/components/Navbar";
import { accountCookieName, getCurrentAccountSummary, readSessionEmail, resolveBusinessOwner } from "@/lib/account-store";
import TeamMembersPanel from "@/components/TeamMembersPanel";
import { getPlan, openRequestFor } from "@/lib/account-plan-store";
import { describeLimits, limitsFor, mayBrandOwnItinerary, mayServeCompanionClients, mayUseCompanionApp } from "@/lib/account-limits";
import { emptyBrand } from "@/lib/business-brand";
import { readBrand } from "@/lib/business-brand-store";
import { isOneTimePlan, offerablePlans, offerLine, periodsFor, priceIdFor, trialEligible } from "@/lib/plan-billing";
import { readPlanOffering, readSubscription } from "@/lib/plan-billing-store";
import { describePrice, readPrice } from "@/lib/stripe";
import { getLimitOverrides, usageLineFor } from "@/lib/account-limits-store";
import { getTrips } from "@/lib/account-store";
import { isAdminAccount } from "@/lib/admin-roles";
import { describeIdentity, isPhoneIdentity } from "@/lib/identity";

import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";

// Private to one person. Nothing here belongs in a search result. Brand-aware
// for the same reason /login is: an itineraries visitor landing here right
// after signing in must not read "White Glove Kosher Travel" in the tab.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Your account | White Glove Itineraries" : "Your account | White Glove Kosher Travel",
    description: "Your saved route, itineraries and account settings.",
    path: "/account",
    noIndex: true,
  });
}

/**
 * Five areas, in reading order: Itineraries, Route, Favorites, Details, Sign
 * out. The page offers rather than explains — each section is the thing
 * itself, not a paragraph about it. Favorites lives here on purpose: it is
 * deliberately absent from the header icons and the mobile bar.
 */
export default async function AccountPage() {
  const siteBrand = await currentBrand();
  const cookieStore = await cookies();
  const cookie = cookieStore.get(accountCookieName())?.value;
  const account = await getCurrentAccountSummary(cookie);
  // A valid signed session means you're signed in, even if the saved record
  // can't be read at this moment.
  const sessionEmail = readSessionEmail(cookie);
  const signedIn = Boolean(account || sessionEmail);
  // Signed out means sign in — the same door the header and the mobile bar
  // use, with the way back to this page carried along.
  if (!signedIn) redirect("/login?next=%2Faccount");
  // Someone who helps run the site gets a way through to the admin from their
  // own account, rather than having to remember a separate address.
  const canAdmin = await isAdminAccount(account?.email || sessionEmail);
  const who = account?.email || sessionEmail || "";
  const [plan, openRequest] = await Promise.all([getPlan(who), openRequestFor(who)]);
  // Whether this login is staff on somebody else's Business account, and
  // whose — see lib/account-store.ts's resolveBusinessOwner. Everything about
  // SERVING CLIENTS (the app, branding, the team itself) reads the business's
  // plan; everything about THIS PERSON's own subscription (below) still
  // reads their own.
  const businessOwnerEmail = await resolveBusinessOwner(who);
  const isTeamMember = businessOwnerEmail !== who;
  const businessPlan = isTeamMember ? await getPlan(businessOwnerEmail) : plan;
  // What this plan limits, and where they stand against it. Worked out here
  // rather than in the panel: saying when the next printable copy is due means
  // reading the clock, and a component may not do that while it renders.
  const overrides = await getLimitOverrides();
  const limits = limitsFor(plan, overrides);
  const trips = await getTrips(who);
  const usageLine = await usageLineFor(who, limits, trips.length);

  // Whether the owner is offering anything, and on what terms. Worked out here
  // because the price has to be read from Stripe when a card is involved, and
  // that is a network call — not something a component may make while it draws.
  const offering = await readPlanOffering();
  const offerChoices: PlanOffer[] = [];
  if (offering.open) {
    // One read, reused for every card — whether this account has EVER had a
    // subscription (any plan, even one now cancelled) is what trialEligible
    // in lib/plan-billing.ts asks, not which plan it is looking at today.
    const hasSubscribedBefore = Boolean(await readSubscription(who));
    for (const paid of offerablePlans(offering)) {
      const periods = await Promise.all(
        periodsFor(offering, paid).map(async (period) => ({
          period,
          line: describePrice(await readPrice(priceIdFor(offering, paid, period))),
        })),
      );
      // In Stripe mode a period whose price cannot be read is left out rather
      // than shown with no number on it. A button that says "Subscribe" and
      // nothing else is asking somebody to agree to an unnamed amount.
      const usable = offering.how === "stripe" ? periods.filter((entry) => entry.line) : [];
      if (offering.how === "stripe" && usable.length === 0) continue;
      // Each offered plan carries its own limits line, so the card can read out
      // everything that plan does — its ceilings alongside the extras it
      // unlocks (whatYouGet), the same as the plan the traveller is already on.
      offerChoices.push({
        plan: paid,
        line: offerLine(offering, paid, usable[0]?.line),
        periods: usable,
        limitsLine: describeLimits(paid, limitsFor(paid, overrides)),
        oneTime: isOneTimePlan(paid),
        trialEligible: offering.how === "stripe" && trialEligible(paid, hasSubscribedBefore),
      });
    }
  }
  const offer = offerChoices.length > 0 ? { how: offering.how, choices: offerChoices } : null;

  // A Business account's own letterhead. Read for nobody else — the panel is
  // not drawn for them, and a locked panel advertising an upgrade has no place
  // on somebody's own account page.
  const canBrand = mayBrandOwnItinerary(businessPlan);
  const brand = canBrand ? await readBrand(businessOwnerEmail) : null;
  // The White Glove app (lib/account-limits.ts). Gold and Business both get the
  // app for their own trips, so both see the door here. Only Business hands a
  // trip to a client, so only Business sees the client-link line inside it.
  // A staff login reads the business's plan for both — the app and the client
  // tools they use are the business's, not their own dormant personal plan.
  const canUseApp = mayUseCompanionApp(businessPlan);
  const canServeClients = mayServeCompanionClients(businessPlan);
  // A phone account has no "@" to cut a name out of, so fall back to the
  // number spelled readably rather than to a blank greeting.
  const identity = account?.email ?? sessionEmail ?? "";
  const displayName =
    account?.name || (isPhoneIdentity(identity) ? describeIdentity(identity) : identity.split("@")[0]) || "Traveler";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
        <PageHeader
          eyebrow="Your account"
          title={`Welcome, ${displayName}.`}
          description={`Signed in as ${describeIdentity(who)}.${account && !account.verifiedAt ? " Still waiting for its verification code." : ""}`}
          action={canAdmin ? <OpenAdminButton /> : undefined}
        />

        {/* WHAT HAS CHANGED SINCE THEY PLANNED IT — above the trips rather
            than below, because a delayed flight or a level-4 advisory is the
            one thing on this page that will not wait. Draws nothing at all
            when nothing has changed, which is most visits. */}
        <TripUpdates email={who} today={new Date().toISOString().slice(0, 10)} />

        {/* Itineraries, Route, Favorites. */}
        <AccountRoutePanel />

        {/* The address to forward a booking to. In the planner it sits inside
            Smart Import, which is where it is least useful — forwarding is
            done in a mail app, so the address has to be somewhere it can be
            copied from. Absent entirely until inbound mail is actually wired. */}
        <ForwardingAddress />

        <section aria-labelledby="account-packing" className="mt-8">
          <h2 id="account-packing" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Packing list</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            An AI-suggested checklist for the trip in your planner right now — destinations, dates and planned stops.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <LinkButton href="/packing">Open packing list</LinkButton>
            <LinkButton href="/optimize" variant="secondary">Review your itinerary</LinkButton>
            <LinkButton href="/translate" variant="secondary">Translate your itinerary</LinkButton>
          </div>
        </section>

        {/* TRAVEL PREFERENCES — the memory, and the screen that makes it one
            rather than a rumour. Above Details on purpose: Details is identity,
            billing and advisor tooling, and this belongs to every account
            including the free one. Deliberately NOT inside the app card, which
            is gated on a paid plan. */}
        {/* Where they had got to, above the preferences: this is the thing
            somebody signs in to continue, and it is deliberately its own list
            with its own forget button — it never feeds the preferences and is
            never sent to an assistant. */}
        <RecentPlaces />

        <section aria-labelledby="account-preferences" className="mt-8">
          <h2 id="account-preferences" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
            Travel preferences
          </h2>
          <TravelPreferencesPanel />
        </section>

        <section aria-labelledby="account-details" className="mt-8">
          <h2 id="account-details" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Details</h2>
          <div className="mt-4">
            <AccountSettings
              initial={{
                name: account?.name,
                email: account?.email ?? sessionEmail ?? "",
                phone: account?.phone,
                avatarMediaId: account?.avatarMediaId,
              }}
            />
          </div>
          <AccountPlanPanel
            plan={plan}
            openRequest={openRequest}
            limitsLine={describeLimits(plan, limits)}
            usageLine={usageLine}
            offer={offer}
          />
          {canBrand && <BusinessBrandPanel brand={brand ?? emptyBrand(who)} siteBrand={siteBrand} />}
          {canBrand && (
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Working with other advisors?{" "}
              <Link href="/agency" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">
                Turn this into an agency
              </Link>{" "}
              — one subscription, one letterhead, a login for each of you.
            </p>
          )}
          {canUseApp && (
            <div className="mt-6 rounded-2xl border border-[var(--gold)]/30 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">The White Glove app</span>
                  <span className="text-sm leading-6 text-stone-600">The trip in your pocket — a day at a time, with a travel wallet kept for when there is no signal. Add it to your home screen.</span>
                </div>
                <LinkButton href="/app">Open the app</LinkButton>
              </div>
              {canServeClients && (
                <div className="mt-4 border-t border-[var(--gold-light)] pt-4">
                  {isTeamMember && (
                    <p className="mb-4 text-sm font-semibold text-[var(--gold-ink)]">
                      You&apos;re staff on {describeIdentity(businessOwnerEmail)}&apos;s account.
                    </p>
                  )}
                  <p className="text-sm leading-6 text-stone-600">
                    Your client tools — also under the account icon above:
                  </p>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {[
                      { href: "/proposal", label: "Proposal", description: "Offer options to compare and approve" },
                      { href: "/library", label: "Content library", description: "Your saved hotels, activities and contacts" },
                      { href: "/forms", label: "Client form", description: "Collect a passport number or emergency contact" },
                      { href: "/pipeline", label: "Trip pipeline", description: "Every client trip and where it stands" },
                      { href: "/addons", label: "Trip add-ons", description: "Optional extras your client accepts or declines" },
                      { href: "/clients", label: "Clients", description: "Everyone you've planned for, and what's noted about them" },
                      { href: "/payments", label: "Payments", description: "Balances, splits, and collection" },
                      { href: "/group", label: "Group trip", description: "Every family on one trip, and what each still owes" },
                      { href: "/commissions", label: "Commissions", description: "What suppliers owe the agency, across every trip" },
                      { href: "/suppliers", label: "Suppliers", description: "Every supplier you've logged a booking with" },
                      { href: "/activity", label: "Trip activity", description: "What actually happened on a trip, logged automatically" },
                    ].map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex flex-col rounded-xl border border-[var(--gold-light)] bg-[#FAF8F3] px-4 py-3 transition hover:border-[var(--gold)]"
                        >
                          <span className="font-semibold text-[var(--navy)]">{item.label}</span>
                          <span className="text-sm text-stone-600">{item.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-sm leading-6 text-stone-600">
                    To hand a client their own trip, open it in the{" "}
                    <Link href="/itinerary" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2">planner</Link>{" "}
                    and use <span className="font-semibold text-[var(--navy)]">Create a client app link</span> — it opens only that one itinerary on the client&apos;s phone.
                  </p>
                  {!isTeamMember && (
                    <div className="mt-6 border-t border-[var(--gold-light)] pt-4">
                      <TeamMembersPanel />
                    </div>
                  )}
                </div>
              )}
              <CompanionSettings />
            </div>
          )}
        </section>

        <section aria-labelledby="account-help" className="mt-10">
          <h2 id="account-help" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Need help?</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-stone-600">
            We support every part of White Glove by email — your account, a payment, a trip, or anything on the site.{" "}
            <Link
              href="/contact?reason=help"
              className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Get help
            </Link>{" "}
            and we’ll get back to you.
          </p>
        </section>

        <section aria-labelledby="account-sign-out" className="mt-10">
          <h2 id="account-sign-out" className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Sign out</h2>
          <div className="mt-4">
            <LogoutButton />
          </div>
        </section>
      </section>
      <Footer />
    </main>
  );
}
