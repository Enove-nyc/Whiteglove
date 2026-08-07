import { readWords } from "@/lib/site-words-store";
import { readTravelpayoutsLinks } from "@/lib/travelpayouts-store";
import BookPartners from "@/components/BookPartners";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import Navbar from "@/components/Navbar";
import { flightsVia, hotelsVia } from "@/lib/booking-partners";
import { pageMetadata } from "@/lib/seo";

// The one booking page. `/booking` was a second one — same job, different
// heading, a different search component and its own idea of the flow — and it
// now redirects here (see next.config.ts). Everything it could do lives on
// this page: the Duffel flight search, the Duffel Stays hotel search, and the
// three steps that tie a booking back to the rest of the trip.
export const metadata = pageMetadata({
  title: "Book Flights, Hotels & Cars with Cash or Miles | White Glove",
  description:
    "Search and book flights, hotels and rental cars for your kosher-travel journey — paying with cash, or with your miles and points — then keep the whole trip together in White Glove.",
  path: "/book",
});

const COMPARISON: Array<[string, string, string]> = [
  [
    "Flights",
    "Compare airlines and routes to the towns your trip is built around, and pay by card.",
    "Search award seats across programs, then confirm the cents-per-point before you transfer anything.",
  ],
  [
    "Hotels",
    "Find kosher-friendly stays near the kever or in the city, for your dates.",
    "See which chains have a property in town, and whether the points beat the cash rate for that stay.",
  ],
  [
    "Cars",
    "Arrange a rental for getting between towns and kevarim at your own pace.",
    "Card portals will take points for a rental — usually poor value, and the calculator will tell you so.",
  ],
];

// Carried over from the old /booking page, which was the only place that said
// how a booking connects to the rest of the trip.
const STEPS: Array<[string, string]> = [
  ["Choose your travel", "Search the flight, hotel or car that suits your dates — with cash, or with your own miles and points."],
  ["Build your route", "Save it to your trip, alongside the kevarim and destinations the journey is actually built around."],
  ["Travel prepared", "Keep the address, access guidance and available local contacts with the booking, in one itinerary."],
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
  const clean = (v?: string) => (typeof v === "string" ? v.slice(0, 60) : undefined);
  const prefill = {
    from: clean(q.from),
    to: clean(q.to),
    depart: clean(q.depart),
    ret: clean(q.return),
  };
  // Affiliate slots — set these env vars once you join the partner programs and
  // the Book links start carrying your tracking IDs (no code change needed).
  const affiliate = {
    bookingAid: process.env.BOOKING_AFFILIATE_ID?.trim() || "",
    kayakParams: process.env.KAYAK_AFFILIATE_PARAMS?.trim() || "",
    // Travelpayouts: one account covering flights, hotels and cars. The marker
    // alone earns nothing — the searches have to be sent THROUGH Travelpayouts,
    // which is what these links do. /admin/settings/earnings.
    travelpayoutsMarker: process.env.TRAVELPAYOUTS_MARKER?.trim() || "",
    travelpayouts: await readTravelpayoutsLinks(),
  };
  // Flights go to Kayak and hotels to Booking.com unless somebody has said
  // otherwise, in as many words. The rule used to be "a Duffel token is
  // present", which meant adding a token to try a search quietly moved every
  // flight on the site onto it. See lib/booking-partners.ts.
  // Each variable named rather than handing over process.env: Next substitutes
  // these by name at build time, so a whole-object read is not the same thing.
  const via = {
    flights: flightsVia({
      DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN,
      DUFFEL_FLIGHTS: process.env.DUFFEL_FLIGHTS,
    }),
    hotels: hotelsVia({
      DUFFEL_ACCESS_TOKEN: process.env.DUFFEL_ACCESS_TOKEN,
      DUFFEL_STAYS: process.env.DUFFEL_STAYS,
    }),
  };

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      {/* The search panel is the page. Putting it beside the copy left a
          column of dead space under the paragraph and squeezed the fields;
          the heading now sits above it and the panel runs the full width. */}
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(2.5rem,6vw,4rem)] leading-[1.08] text-[var(--navy)]">Book with cash, or with miles</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">{words.bookingNotice}</p>
          </div>
          <div className="mt-10"><BookPartners affiliate={affiliate} prefill={prefill} flightsVia={via.flights} hotelsVia={via.hotels} /></div>
        </div>
      </section>

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
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold)] sm:hidden">With cash</span>
                {cash}
              </p>
              <p className="text-sm leading-6 text-stone-600">
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--gold)] sm:hidden">With miles &amp; points</span>
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
            The travel side and the rest of the journey — kevarim, shomer details, practical guidance — stay in one itinerary.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map(([heading, body], index) => (
              <article key={heading} className="rounded-3xl border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold)]">0{index + 1}</p>
                <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{heading}</h3>
                <p className="mt-3 text-sm leading-6 text-stone-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
