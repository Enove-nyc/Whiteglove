import Link from "next/link";
import { readWords } from "@/lib/site-words-store";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { flightPartnerDoesMultiCity } from "@/lib/affiliate/partners";
import { readExtras } from "@/lib/travel-extras-store";
import { essentialIsBookable, type EssentialServiceId } from "@/lib/travel-essentials";
import { readTravelEssentials } from "@/lib/travel-essentials-store";
import TravelEssentials from "@/components/TravelEssentials";
import TravelExtras from "@/components/TravelExtras";
import BookPartners from "@/components/BookPartners";
import StartingPoints from "@/components/StartingPoints";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import Navbar from "@/components/Navbar";
import { pageMetadata } from "@/lib/seo";

// The one booking page.
//
// REWRITTEN AROUND A HOLIDAY, not around a kevarim route. It used to compare
// "airlines and routes to the towns your trip is built around", offer "stays
// near the kever or in the city", and explain how a booking sits "alongside
// the kevarim and destinations the journey is actually built around". Every
// one of those sentences was written when the site was a heritage database
// with a travel page attached, and a family booking a week in Rome read them
// as evidence that this page was not for them.
//
// The heritage side is not diminished by that and is not meant to be: it has
// its own section, and one line here says these tools work for it too. What
// changed is that the general booking page is now general.
//
// HOTELS OPENS. Accommodation is the one product this site knows something a
// comparison site does not — which quarter makes Shabbos walkable — so it is
// the tab that earns the visit.
export const metadata = pageMetadata({
  title: "Book Flights, Hotels & Cars with Cash or Miles | White Glove",
  description:
    "Search and book flights, hotels and rental cars for your kosher-travel journey — paying with cash, or with your miles and points — then keep the whole trip together in White Glove.",
  path: "/book",
});

const COMPARISON: Array<[string, string, string]> = [
  [
    "Hotels",
    "Compare places to stay for your dates — and check which quarter they are in before you book one.",
    "See which chains have a property in town, and whether the points beat the cash rate for that stay.",
  ],
  [
    "Flights",
    "Compare airlines and routes for your dates, and pay by card.",
    "Search award seats across programs, then confirm the cents-per-point before you transfer anything.",
  ],
  [
    "Cars",
    // The cross-border line came off /cars when that page folded into this
    // one. It is the single most expensive thing to find out late: several
    // hire companies forbid taking the car over a border outright, and a
    // heritage route crosses two or three.
    "Hire a car where the destination needs one — and each destination page says whether it does. Check the cross-border rules first if the trip crosses one; several hire companies forbid it outright.",
    "Card portals will take points for a rental — usually poor value, and the calculator will tell you so.",
  ],
];

// How a booking connects to the rest of the trip. The three steps are the
// reason to search here rather than on the partner's own site.
const STEPS: Array<[string, string]> = [
  ["Search for your dates", "Hotels, flights or a car — with cash, or with your own miles and points."],
  ["Save it to the trip", "It goes into your itinerary with the rest of the days, and the planner works out the driving between them."],
  ["Travel with it in one place", "Confirmation numbers, addresses and the kosher and Shabbos notes for each place, on one printable page."],
];

/**
 * What is not bookable here, said plainly.
 *
 * The brief names transfers and activities alongside hotels, flights and cars.
 * lib/affiliate/partners.ts refuses to build a link for a product with no
 * programme behind it — so the honest thing is a sentence about each rather
 * than a tab that takes somebody's dates and gives them nothing.
 *
 * DRIVERS JOINED THE LIST when /cars folded into this page. That page named
 * three ways of getting around — hire, transfers, drivers — and only the first
 * was ever bookable. A driver is the honest sentence it always was, and it
 * belongs wherever the car search is.
 *
 * AIRPORT TRANSFERS HAVE LEFT IT, and that is the rule this list lives by:
 * each entry becomes a search the day there is something behind it, and must
 * leave on that day. An entry left here after its product launches is the site
 * contradicting itself on the screen where somebody is deciding whether to
 * trust it — which is exactly what happened with transfers, and was found by a
 * person clicking the card and reading the apology beside it.
 *
 * SO IT IS NOT A HAND-EDITED LIST ANY MORE. An entry carrying `needs` names the
 * hand-off that would replace it, and drops out of the list the moment that
 * hand-off is enabled and configured. Turning the programme off puts the
 * sentence back. Nobody has to remember, and the page cannot disagree with the
 * settings screen. An entry with no `needs` is a standing truth rather than a
 * pending launch — a driver on a heritage route is a person, and no programme
 * is going to change that.
 */
const NOT_YET: Array<[string, string, { href: string; label: string }?, EssentialServiceId?]> = [
  [
    "Drivers on a heritage route",
    "A driver who knows the roads and the gates is a person, not a booking engine. They are in the provider directory, with what we know about each.",
    { href: "/directory", label: "Open the provider directory" },
  ],
  [
    "Things to do",
    "We do not sell tickets yet. What each place is, how long to give it and what it does on Shabbos is on the Things to Do pages.",
    { href: "/things-to-do", label: "Browse things to do" },
    "activity",
  ],
];

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    depart?: string;
    return?: string;
    type?: string;
    destination?: string | string[];
  }>;
}) {
  // The planner links here with the trip's dates already worked out, so nobody
  // has to type them a second time.
  const q = await searchParams;
  // The paragraph under the heading. /admin/settings/words.
  const words = await readWords();
  const extras = await readExtras();
  // The not-bookable list, minus anything that has since become bookable. See
  // the comment on NOT_YET: this is the reason it cannot be left behind again.
  const essentials = await readTravelEssentials();
  const notYet = NOT_YET.filter(([, , , needs]) => !needs || !essentialIsBookable(needs, essentials));
  const clean = (v?: string) => (typeof v === "string" ? v.slice(0, 60) : undefined);
  // Trimmed and capped rather than printed as given: it lands in a text field
  // as though the visitor had typed it, and a link is not a trustworthy author.
  // A repeated ?destination= arrives as an array, which would render as one.
  const rawDestination = Array.isArray(q.destination) ? q.destination[0] : q.destination;
  const destination = (rawDestination ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const prefill = {
    from: clean(q.from),
    to: clean(q.to),
    depart: clean(q.depart),
    ret: clean(q.return),
    destination: destination || undefined,
  };
  // Which tab opens. Resolved here so the link lands on the right search
  // painted correctly, rather than on Hotels for a frame — see BookPartners.
  const initialKind = q.type === "flights" || q.type === "cars" || q.type === "hotels" ? q.type : "hotels";
  // Whether a multi-city flight search can be opened at all. A boolean, and
  // nothing else commercial — see flightPartnerDoesMultiCity. Without it the
  // form would hand off a five-leg search, /go would rightly decline to build
  // a wrong link, and the traveller would watch a new tab bounce back with no
  // explanation.
  const multiCity = flightPartnerDoesMultiCity(await readAffiliateConfig());

  // THE ACCOUNT NUMBERS ARE NOT READ HERE ANY MORE, and that is the point.
  //
  // This page used to gather the Stay22 ID, the Travelpayouts marker, the
  // Booking.com affiliate ID and the pasted redirect links, and hand them to
  // BookPartners so it could build partner URLs in the browser. BookPartners
  // is a client component, so all of it was serialised into the page and
  // readable in view-source. The searches now post to /go, which resolves the
  // partner on the server — so there is nothing commercial left to pass down,
  // and nothing to leak.

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      {/* THE FIELDS COME FIRST. A headline, the owner's notice and a
          heritage aside used to sit above the panel: three blocks of reading
          before anybody could type a city. Somebody arriving here has already
          decided to search — the page's job is to let them, and everything
          worth saying still gets said underneath. */}
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-10 sm:px-8 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3rem)] leading-[1.1] text-[var(--navy)]">
            Flights, hotels and cars
          </h1>
          <div className="mt-6">
            <BookPartners prefill={prefill} multiCity={multiCity} initialKind={initialKind} />
          </div>
          {/*
            One line, under the searches, always.
            It used to be here, then moved to Terms and to each partner action.
            That left /book itself covered only by accident: the disclosure a
            visitor saw came from the Travel Essentials block below, so on a
            deployment where that block is empty all three earning searches sat
            on the page with nothing said. This does not depend on anything
            else being filled in. Kept as small as it can be and still be read
            — the owner's sentence, no heading, no panel.
          */}
          <p className="mt-3 max-w-2xl text-[11px] leading-4 text-stone-500">{words.affiliateDisclosure}</p>
          {/* Under the search, where it is read by somebody who has finished
              typing. The owner's line: /admin/settings/words. */}
          <p className="mt-6 max-w-2xl leading-7 text-stone-600">{words.bookingNotice}</p>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
            Planning a heritage journey?{" "}
            <Link
              href="/heritage"
              className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4"
            >
              These booking tools work for that too
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Structured Travel Essentials first; free-form custom extras after. */}
      <TravelEssentials pageType="book" placement="book-essentials" />
      <TravelExtras extras={extras} />

      {/* Cash and points, set side by side per category. Two independent
          columns of cards never lined up — each card sized to its own text —
          so the comparison is one grid, where a row is a row by construction. */}
      {/* Same padding-then-centre order as the hero above, so both sections
          share one left edge. Putting the padding inside max-w-5xl instead
          shifted this block 32px in from the panel. */}
      <section className="px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Cash or points, side by side</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
          What each route actually gets you, so you can tell which is worth using before you spend either.
        </p>

        <div className="mt-8 grid gap-px overflow-hidden rounded-3xl border border-[var(--gold-light)] bg-[var(--gold-light)] shadow-[0_18px_45px_rgba(23,45,82,.07)]">
          <div className="hidden bg-[var(--navy)] px-5 py-3 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--gold-light)] sm:grid sm:grid-cols-[8rem_1fr_1fr] sm:gap-5">
            <span />
            <span>With cash</span>
            <span>With miles &amp; points</span>
          </div>
          {COMPARISON.map(([category, cash, points]) => (
            <div key={category} className="grid gap-4 bg-[#fcfaf6] px-5 py-6 sm:grid-cols-[8rem_1fr_1fr] sm:gap-6 sm:px-6">
              <h3 className="flex items-center gap-2 font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                <GloveMark size="sm" />
                {category}
              </h3>
              <p className="text-sm leading-6 text-stone-600">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)] sm:hidden">With cash</span>
                {cash}
              </p>
              <p className="text-sm leading-6 text-stone-600">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)] sm:hidden">With miles &amp; points</span>
                {points}
              </p>
            </div>
          ))}
        </div>
        </div>
      </section>

      {/* How a booking joins the rest of the trip. From the old /booking page,
          which was the only page that said it. */}
      <section className="border-t border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Booked here, planned here</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            The travel and the rest of the trip — where you are eating, where Shabbos falls, what to see between — stay
            in one itinerary.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map(([heading, body], index) => (
              <article key={heading} className="rounded-3xl border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">0{index + 1}</p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{heading}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      {/* What is NOT bookable here. A tab that takes somebody's dates and
          gives them nothing is worse than a sentence saying so.

          The whole section goes when there is nothing left in it — a heading
          called "The rest of the trip" over an empty space is worse than no
          heading, and the day everything here is bookable is a day worth
          reaching without a deploy. */}
      {notYet.length > 0 && (
      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">The rest of the trip</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            {/* Counted rather than typed. "Two things" was written when there
                were two, and stayed while the list changed underneath it. */}
            {notYet.length === 1 ? "One thing people" : `${notYet.length} things people`} ask us for that we do not
            book, and where to go for {notYet.length === 1 ? "it" : "each of them"}.
          </p>
          {/* The link sits on the card it belongs to, rather than in a row of
              buttons underneath. That row used to lead with "Cars and
              transfers" pointing at /cars — a page whose search is now the Cars
              tab at the top of this one, which made the button a link back up
              the page it was already on. */}
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {notYet.map(([heading, body, link]) => (
              <article key={heading} className="rounded-3xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{heading}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{body}</p>
                {link && (
                  <Link
                    href={link.href}
                    className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                  >
                    {link.label}
                  </Link>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Which of the four doors this one is, for somebody who arrived here
          from the navigation and is not sure a partner search is what they
          wanted. lib/starting-points.ts. */}
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <StartingPoints omit={["/book"]} heading="If a search is not what you came for" />
      </section>

      <Footer />
    </main>
  );
}
