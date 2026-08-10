import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PartnerSearchForm from "@/components/PartnerSearchForm";
import SearchMemory from "@/components/SearchMemory";
import SectionHeading from "@/components/SectionHeading";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Flights for a kosher trip — search and compare | White Glove Itineraries",
  description:
    "Search flights for your dates, then plan the rest of the trip around them: which quarter to stay in, what there is to eat, and where Shabbos falls.",
  path: "/flights",
});

/**
 * Flights, as their own page rather than a tab.
 *
 * WHY THIS EXISTS NOW. The navigation names Flights, and a navigation item
 * pointing at nothing is worse than one that is missing. It is deliberately
 * small: a search that hands off to a partner, and the two links that make
 * this site's version of a flight search different from a comparison site's.
 *
 * WHAT IT DOES NOT DO, and must not: it does not sell a ticket. The search
 * opens the partner, who takes the payment and owns the booking. The one
 * integration on this site that issues tickets is at /admin/duffel and is not
 * reachable from here — see lib/booking-partners.ts.
 */
export default function FlightsPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <SearchMemory />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Flights</p>
          <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.08] text-[var(--navy)]">
            Find the flight, then build the trip around it.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            Dates first. Once you have them, every destination page on this site can tell you what there is to eat, which
            quarter makes Shabbos walkable, and whether you will need a car.
          </p>
          <div className="mt-8 max-w-4xl">
            <PartnerSearchForm
              id="flights"
              product="flight"
              fields="journey"
              page="/flights"
              placement="flights-page"
              submitLabel="Search flights"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionHeading
          eyebrow="Before you book the seat"
          title="Two things worth checking first."
          description="Both are answered per destination on this site, and both are easier to change now than after the ticket is issued."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
              What the arrival day does to Shabbos
            </h2>
            <p className="mt-3 leading-7 text-stone-600">
              A Friday landing is the most common way a good trip starts badly. The planner warns when a day runs into
              candle-lighting, and it does it before anything is booked.
            </p>
            <Link
              href="/itinerary"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Open the planner
            </Link>
          </article>
          <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
              Whether the destination works at all
            </h2>
            <p className="mt-3 leading-7 text-stone-600">
              Kosher food and Shabbos, per destination, from records with sources behind them — and an honest &ldquo;not
              checked yet&rdquo; where we hold nothing.
            </p>
            <Link
              href="/destinations"
              className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Browse destinations
            </Link>
          </article>
        </div>
      </section>

      <Footer />
    </main>
  );
}
