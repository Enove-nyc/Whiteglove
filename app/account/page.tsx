import Link from "next/link";
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
import { offerablePlans, offerLine, periodsFor, priceIdFor } from "@/lib/plan-billing";
import { readPlanOffering } from "@/lib/plan-billing-store";
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

        {/* Itineraries, Route, Favorites. */}
        <AccountRoutePanel />

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
                    To hand a client their own trip, open it in the planner and use{" "}
                    <span className="font-semibold text-[var(--navy)]">Create a client app link</span> — each link opens
                    only that one itinerary on the client&apos;s phone.
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
                      { href: "/commissions", label: "Commissions", description: "What suppliers owe the agency, across every trip" },
                      { href: "/activity", label: "Trip activity", description: "What actually happened on a trip, logged automatically" },
                    ].map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex flex-col rounded-xl border border-[var(--gold-light)] bg-[#fcfaf6] px-4 py-3 transition hover:border-[var(--gold)]"
                        >
                          <span className="font-semibold text-[var(--navy)]">{item.label}</span>
                          <span className="text-sm text-stone-600">{item.description}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
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
