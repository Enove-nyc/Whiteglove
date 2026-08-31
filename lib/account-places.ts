import type { AccountPlan } from "@/lib/account-plans";
import { mayBrandOwnItinerary, mayServeCompanionClients } from "@/lib/account-limits";

/**
 * Where an account can go, as data — deliberately not in a component file.
 *
 * THIS LIVED IN components/AccountMenu.tsx AND TOOK A PAGE DOWN IN THE OTHER
 * REPOSITORY. That file is "use client", and Next turns every export of a
 * client module into a client reference: importing one on the server gives a
 * marker object, not the function. The itineraries site has a server-rendered
 * /advisor page that called `advisorPlacesFor(plan)`, so it threw on every
 * request —
 *
 *   Attempted to call advisorPlacesFor() from the server but
 *   advisorPlacesFor is on the client.
 *
 * — and the advisor's own dashboard served the error page to anybody who had
 * paid for it. Nothing about the function was ever client-only: no hooks, no
 * browser, just a plan and a filter. It was in that file because that is where
 * the menu using it happened to be.
 *
 * This site has no page that calls it from the server today, so nothing here
 * was broken. It is moved anyway: the two repositories share this component,
 * and leaving the trap set on one side is how it gets ported back. The build
 * does not catch it — it is a runtime error on render, on a page behind a
 * login. tests/server-client-boundary.test.ts is what catches it now.
 */

export const ACCOUNT_PLACES = [
  { label: "Itineraries", href: "/itinerary" },
  { label: "Routes", href: "/my-route" },
  { label: "Favorites", href: "/account#account-favorites" },
  { label: "My info", href: "/account" },
] as const;

/**
 * The advisor tools — Pipeline, Proposal, Library, Forms, Payments, Agency —
 * had no home in navigation anywhere: a Starter or Pro advisor reached them
 * only by remembering the address or scrolling a long paragraph on /account.
 * Named here, gated by the same lib/account-limits functions the pages
 * themselves check, so this list can never offer a door a plan doesn't open.
 */
const ADVISOR_PLACES = [
  /* NO "Dashboard" ROW HERE, and that is not an oversight. The itineraries
     repository has one, pointing at its /advisor page; this site has no such
     page, and a menu entry for it would be a link to a 404 in the one menu a
     paying advisor uses. The two lists are otherwise the same. */
  { label: "Trip pipeline", href: "/pipeline", need: "clients" },
  { label: "Proposals", href: "/proposal", need: "clients" },
  { label: "Content library", href: "/library", need: "clients" },
  { label: "Client forms", href: "/forms", need: "clients" },
  { label: "Payments", href: "/payments", need: "clients" },
  { label: "Group trip", href: "/group", need: "clients" },
  { label: "Agency", href: "/agency", need: "brand" },
] as const;

export function advisorPlacesFor(plan: AccountPlan | undefined) {
  if (!plan) return [];
  const clients = mayServeCompanionClients(plan);
  const brand = mayBrandOwnItinerary(plan);
  return ADVISOR_PLACES.filter((place) => (place.need === "brand" ? brand : clients));
}

/**
 * THE SCREENS THAT ARE ABOUT ONE TRIP, as opposed to the tools above.
 *
 * The advisor's work on a trip is spread across separate top-level pages —
 * /itinerary, /proposal, /addons, /forms, /payments, /group — and each of them
 * is a standalone screen that operates on whichever trip is currently open on
 * the account. There was nothing anywhere saying WHICH trip that is, and no way
 * to get from Payments to Proposals except back out through the global menu.
 *
 * So an advisor with twenty clients, halfway through the Harpers' Rome trip,
 * had to hold "the open trip is the Harpers" in their head across every screen
 * — and the one screen that names a trip, the pipeline, is the one they had to
 * leave to get anywhere.
 *
 * Split out from ADVISOR_PLACES rather than duplicated: Pipeline, Library and
 * Agency are tools that span every trip and have no business in a bar about
 * one, while /addons is trip work that was in no menu at all — reachable only
 * by typing the address. Labels are the ones already in use above, so nothing
 * here gains a second name.
 */
export const TRIP_PLACES = [
  // Open to any signed-in account, unlike the five below it — a traveller
  // planning their own trip has an itinerary and no clients.
  { label: "Itinerary", href: "/itinerary", need: "any" },
  { label: "Proposals", href: "/proposal", need: "clients" },
  { label: "Extras", href: "/addons", need: "clients" },
  { label: "Client forms", href: "/forms", need: "clients" },
  { label: "Payments", href: "/payments", need: "clients" },
  { label: "Group trip", href: "/group", need: "clients" },
] as const;

export type TripPlace = (typeof TRIP_PLACES)[number];

/**
 * The trip screens this plan can actually open.
 *
 * Gated by the same lib/account-limits function the pages themselves check, so
 * the bar can never offer a door the plan does not open — the same rule
 * advisorPlacesFor follows, for the same reason.
 */
export function tripPlacesFor(plan: AccountPlan | undefined): TripPlace[] {
  if (!plan) return [];
  const clients = mayServeCompanionClients(plan);
  return TRIP_PLACES.filter((place) => place.need === "any" || clients);
}
