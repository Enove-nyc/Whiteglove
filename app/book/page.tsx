import Link from "next/link";
import { readWords } from "@/lib/site-words-store";
import { readAffiliateConfig } from "@/lib/affiliate/config";
import { flightPartnerDoesMultiCity } from "@/lib/affiliate/partners";
import { readExtras } from "@/lib/travel-extras-store";
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
    "Hire a car where the destination needs one — and each destination page says whether it does.",
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
 * No programme is joined for either, and lib/affiliate/partners.ts refuses to
 * build a link for a product that has none — so the honest thing is a sentence
 * about each rather than a tab that takes somebody's dates and gives them
 * nothing. These become searches the day there is something behind them.
 */
const NOT_YET: Array<[string, string]> = [
  [
    "Airport transfers",
    "We do not book transfers yet. For most trips the car search above covers it, and where a transfer is the better answer the destination page will say so.",
  ],
  [
    "Things to do",
    "We do not sell tickets yet. What each place is, how long to give it and what it does on Shabbos is on the Things to Do pages.",
  ],
];

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; depart?: string; return?: string }>;
}) {
  // The planner links here with the trip's dates already worked out, so nobody
  // has to type them a second time.
  const q = await searchParams;
  // The paragraph under the heading. /admin/settings/words.
  const words = await readWords();
  const extras = await readExtras();
  const clean = (v?: string) => (typeof v === "string" ? v.slice(0, 60) : undefined);
  const prefill = {
    from: clean(q.from),
    to: clean(q.to),
    depart: clean(q.depart),
    ret: clean(q.return),
  };
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
            <BookPartners prefill={prefill} multiCity={multiCity} />
          </div>
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

      {/* Once the flights are booked: eSIM, insurance, transfers. Under the
          search rather than above it — the same cards at the top would be a row
          of adverts in front of the thing they came for. */}
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
          gives them nothing is worse than a sentence saying so. */}
      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">The rest of the trip</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
            Two things people ask us for that we do not book, and where to go for each of them.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {NOT_YET.map(([heading, body]) => (
              <article key={heading} className="rounded-3xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
                <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{heading}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{body}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/cars"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)]"
            >
              Cars and transfers
            </Link>
            <Link
              href="/things-to-do"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)]"
            >
              Things to do
            </Link>
          </div>
        </div>
      </section>

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
