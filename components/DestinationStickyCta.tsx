import Link from "next/link";
import { staySearchHref } from "@/lib/stay-search";

/**
 * The one action that follows a destination page, kept in reach.
 *
 * FLIGHTS IS NOT PREFILLED, and that is on purpose. The flight form asks for
 * an airport code, and this site holds no airport code for a vacation
 * destination — several of them are regions with three airports. Passing a
 * city name into a field labelled "Airport code, e.g. FCO" would open the
 * partner on a search they may not understand, which is worse than opening
 * them on an empty one.
 *
 * BOTH QUIET LINKS ARE HANDED IN, NEVER TYPED. They used to point at /flights
 * and /cars, two pages running the same partner searches as the booking page's
 * own tabs; both have since folded into it. The booking path is the
 * replacement, and the owner can lock it from the admin — so the page resolves
 * it and passes it down rather than this component naming it, which is the
 * difference between a link and an access-code screen. See
 * lib/booking-access.ts and tests/booking-link.test.ts.
 *
 * The cars link still carries the destination as the pick-up; that prefill is
 * the one thing /cars did that the booking page did not, and it came across
 * with it rather than being dropped.
 *
 * A DESTINATION PAGE IS LONG — eleven sections, and the practical ones are at
 * the bottom because that is the order somebody decides in. By the time a
 * person has read what Shabbos looks like in Rome and decided they can do it,
 * the button is two thousand pixels above them, and the next thing they do is
 * go back to a comparison site.
 *
 * STICKY, NOT FIXED, and the difference is the whole reason this component is
 * written rather than a class on a div. A fixed bar sits on top of the page for
 * ever: at 200% text it eats a third of a phone screen, it covers the last line
 * of whatever you are reading, and there is no scroll position that gets rid of
 * it. This one is in the flow at the bottom of the article, so it rides the
 * bottom of the viewport while there is article left and then lets go — the
 * footer, the last section and the small print are never underneath it.
 *
 * ONE PRIMARY, TWO QUIET. Flights and cars are real pages with real searches
 * and they belong here, but a bar with three equal buttons has no primary
 * action at all. Places to stay is the one this site can answer better than a
 * comparison site — which quarter, and what is walkable — so it is the one in
 * navy.
 *
 * NO PERSONAL ASSISTANCE. This is the most commercial surface on the site and
 * "have us plan it" here would turn every section above into a sales funnel.
 * The service itself has since been removed from the site outright — see
 * AGENTS.md, "Personal trip planning has been removed".
 */
export default function DestinationStickyCta({
  destination,
  flightsHref,
  carsHref,
}: {
  destination: string;
  /** Resolved by the page: the booking search, or the assistance page when it is locked. */
  flightsHref: string;
  /** The same, on the cars tab, carrying the destination as the pick-up. */
  carsHref: string;
}) {
  return (
    <div className="sticky bottom-0 z-30 -mx-5 mt-6 border-t border-[var(--gold-light)] bg-[var(--surface)]/95 px-5 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/85 sm:-mx-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          href={staySearchHref({ destination })}
          className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
        >
          See places to stay
        </Link>
        <Link
          href={flightsHref}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
        >
          Flights
        </Link>
        <Link
          href={carsHref}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
        >
          Car hire
        </Link>
      </div>
    </div>
  );
}
