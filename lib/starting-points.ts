/**
 * The three ways in, named once.
 *
 * THE PROBLEM. /plan, /itinerary and /book are three different front doors,
 * and a first-time visitor meets all three in the navigation without being
 * told which one answers their question. Worse, each was described in
 * different words on every page that linked to it — "start planning", "trip
 * planner", "itinerary planner", "My Trips", "flights, hotels & cars", "book"
 * — so the same three doors looked like six.
 *
 * So each door gets ONE customer-facing name and ONE line, here, and the pages
 * link to them through this list. A door renamed here is renamed everywhere,
 * which is the only way a small site with three overlapping entry points
 * stays legible.
 *
 * A fourth door — personal planning — was removed at the owner's word rather
 * than kept as a fourth option here: it is not one of the site's ways to
 * start, in any form.
 *
 * WHAT EACH LINE HAD TO BE ACCURATE ABOUT:
 *
 *   /plan       — three short STEPS, not three questions. Step two holds four
 *                 fields, and app/plan/page.tsx already refuses to call the
 *                 whole thing three questions for exactly that reason.
 *   /plan       — public and self-service: the visitor planning their own
 *                 trip. Open and crawlable, unlike building and saving one.
 *   /itinerary  — free, but signed-in only, at the owner's word (as is
 *                 /my-route). Signing in is what starts it and what puts the
 *                 trip on another device.
 *   /book       — the search hands off to a partner. Nothing is booked here,
 *                 and the partner takes the payment.
 */

export type StartingPoint = {
  href: "/plan" | "/itinerary" | "/book";
  /** The name this door is called by everywhere on the site. */
  label: string;
  /** What you do there, in one line. */
  body: string;
  /** The words on the link. Never "learn more". */
  cta: string;
};

export const STARTING_POINTS: readonly StartingPoint[] = [
  {
    href: "/plan",
    label: "Get recommendations",
    body: "The kind of trip, roughly where and when.",
    cta: "Start a trip",
  },
  {
    href: "/itinerary",
    label: "Build the trip yourself",
    body: "Days, stops, driving times, Shabbos.",
    cta: "Open the itinerary planner",
  },
  {
    href: "/book",
    label: "Search booking partners",
    body: "Flights, hotels and cars. You pay the partner directly.",
    cta: "Search flights, hotels and cars",
  },
];

/** The three, minus any door that is the page you are already on. */
export function startingPointsExcept(...hrefs: string[]): StartingPoint[] {
  return STARTING_POINTS.filter((point) => !hrefs.includes(point.href));
}

/** The one name a page should use when it links to one of the three. */
export function labelFor(href: StartingPoint["href"]): string {
  return STARTING_POINTS.find((point) => point.href === href)!.label;
}
