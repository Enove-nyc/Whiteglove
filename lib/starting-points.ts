/**
 * The four ways in, named once.
 *
 * THE PROBLEM. /plan, /itinerary, /services and /book are four different front
 * doors, and a first-time visitor meets all four in the navigation without
 * being told which one answers their question. Worse, each was described in
 * different words on every page that linked to it — "start planning", "trip
 * planner", "itinerary planner", "My Trips", "travel services", "flights,
 * hotels & cars", "book" — so the same four doors looked like seven.
 *
 * So each door gets ONE customer-facing name and ONE line, here, and the pages
 * link to them through this list. A door renamed here is renamed everywhere,
 * which is the only way a small site with four overlapping entry points stays
 * legible.
 *
 * WHAT EACH LINE HAD TO BE ACCURATE ABOUT:
 *
 *   /plan       — three short STEPS, not three questions. Step two holds four
 *                 fields, and app/plan/page.tsx already refuses to call the
 *                 whole thing three questions for exactly that reason.
 *   /itinerary  — free, and usable without an account. An account is what puts
 *                 the trip on another device.
 *   /services   — paid, and quoted before any work starts. No figure: there is
 *                 no price list on this site to stand behind one.
 *   /book       — the search hands off to a partner. Nothing is booked here,
 *                 and the partner takes the payment.
 */

export type StartingPoint = {
  href: "/plan" | "/itinerary" | "/services" | "/book";
  /** The name this door is called by everywhere on the site. */
  label: string;
  /** What you do there, in one line. */
  body: string;
  /** The words on the link. Never "learn more". */
  cta: string;
  /** Free to use, or paid work. Printed as a small tag on the card. */
  cost: "Free" | "Paid";
};

export const STARTING_POINTS: readonly StartingPoint[] = [
  {
    href: "/plan",
    label: "Get recommendations",
    body: "Three short steps — the kind of holiday, roughly where and when.",
    cta: "Start a trip",
    cost: "Free",
  },
  {
    href: "/itinerary",
    label: "Build the trip yourself",
    body: "Days, stops, driving times, Shabbos, and a printable copy.",
    cta: "Open the itinerary planner",
    cost: "Free",
  },
  {
    href: "/book",
    label: "Search booking partners",
    body: "Flights, hotels and cars. You pay the partner directly.",
    cta: "Search flights, hotels and cars",
    cost: "Free",
  },
  {
    href: "/services",
    label: "Have White Glove plan it",
    body: "Quoted before any work starts.",
    cta: "See what we do",
    cost: "Paid",
  },
];

/** The four, minus any door that is the page you are already on. */
export function startingPointsExcept(...hrefs: string[]): StartingPoint[] {
  return STARTING_POINTS.filter((point) => !hrefs.includes(point.href));
}

/** The one name a page should use when it links to one of the four. */
export function labelFor(href: StartingPoint["href"]): string {
  return STARTING_POINTS.find((point) => point.href === href)!.label;
}
