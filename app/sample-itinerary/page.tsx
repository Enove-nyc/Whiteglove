import Link from "next/link";
import Footer from "@/components/Footer";
import GloveMark, { GloveList } from "@/components/GloveMark";
import Navbar from "@/components/Navbar";
import PrintableItinerary from "@/components/PrintableItinerary";
import SectionHeading from "@/components/SectionHeading";
import StructuredData from "@/components/StructuredData";
import { SAMPLE_ITINERARY, SAMPLE_NOTICE, WHAT_IS_IN_IT } from "@/data/sample-itinerary";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "A sample itinerary — what you actually receive | White Glove Itineraries",
  description:
    "A whole week in Rome for a family of five, as the itinerary is delivered: a day per page, real walking and driving times, the kosher side per day, and a Shabbos with nothing scheduled on it.",
  path: "/sample-itinerary",
});

/**
 * The proof that was missing.
 *
 * A visitor could read the services page and understand the process perfectly
 * — send us the answers, we come back with directions, you pick one, we build
 * it — and still have no idea what arrives at the end of it. "A written
 * day-by-day itinerary" is a description of a deliverable, and the decision
 * somebody is making is about the deliverable.
 *
 * SO THIS SHOWS THE DOCUMENT, not a picture of one. It is rendered by
 * components/PrintableItinerary.tsx, the same component that prints a real
 * trip, from a trip object that goes through the same buildDays() as everybody
 * else's — so the times, the driving between stops and the evening entries are
 * computed here exactly as they are for a customer. If the printed itinerary
 * changes, this page changes with it, which is the only way a sample stays
 * true.
 *
 * WHAT IS NOT HERE, and why the page says so twice: a hotel name, an airline, a
 * flight number, a confirmation code, a price. Every one of those would be a
 * claim about something that has not happened, on a site whose argument is that
 * what it prints has been checked. The places ARE real — they are the Rome
 * records this site already publishes with sources — and the rest is marked as
 * the shape of the thing rather than dressed up as a booking.
 *
 * AND WHAT IS STILL NOT HERE: a testimonial. There is no real one to print and
 * this page does not invent one. What it offers instead is the strongest proof
 * available, which is the work itself.
 */
export default function SampleItineraryPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Travel services", path: "/services" },
          { name: "A sample itinerary", path: "/sample-itinerary" },
        ])}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">What you receive</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            This is the itinerary, not a picture of one.
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
            A whole week in Rome for a family of five, rendered by the same planner that builds a real trip — the same
            day-by-day, the same driving times between stops, the same printable copy for the car.
          </p>
          <p className="mt-4 max-w-3xl rounded-lg border-l-4 border-[var(--gold)] bg-[#fcf6e9] px-5 py-3 leading-7 text-stone-700">
            <span className="font-semibold text-[var(--navy)]">{SAMPLE_NOTICE}</span>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <SectionHeading
          eyebrow="What is in it"
          title="Six things an ordinary travel itinerary does not have."
          description="Each of these is visible in the document below rather than described in it."
        />
        <dl className="mt-10 grid gap-x-10 gap-y-6 md:grid-cols-2 lg:grid-cols-3">
          {WHAT_IS_IN_IT.map(([term, detail]) => (
            <div key={term} className="border-t border-[var(--gold-light)] pt-4">
              <dt className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">{term}</dt>
              <dd className="mt-2 leading-7 text-stone-600">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
            The document
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-stone-600">
            Below is the printable itinerary exactly as it comes out — a cover, then a page per day. On a real trip it
            also arrives in your account here, where you can move a day, drop a stop, and print it again.
          </p>

          {/* Framed rather than dropped straight onto the page, so it reads as
              a document being shown rather than as this page's own layout. The
              horizontal scroll is on this container and never on the body: the
              printed page has a fixed width and a phone does not. */}
          <div className="mt-8 overflow-x-auto rounded-2xl border border-[var(--gold-light)] bg-white p-3 shadow-[0_18px_45px_rgba(23,45,82,.09)] sm:p-6">
            <div className="min-w-[42rem]">
              <PrintableItinerary itin={SAMPLE_ITINERARY} burials={{}} embedded />
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-stone-500">
            Shown at document width. On a phone this panel scrolls sideways on its own — the page behind it does not.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
          <div>
            <SectionHeading
              eyebrow="What is deliberately absent"
              title="Everything on it that would have been a claim."
              description="The places are records this site publishes with sources. The rest is left blank on purpose."
            />
            <GloveList
              items={[
                "No hotel named. A real itinerary names the property, the address and the confirmation number; this one says where they sit.",
                "No airline and no flight number, for the same reason.",
                "No price, anywhere. There is no price list on this site to stand behind one.",
                "No opening hours. They change by season, and a stale one sends a family to a locked door.",
                "No testimonial. There is not a real one to print, so there is not one here.",
              ]}
              className="mt-8 space-y-3 leading-7 text-stone-600"
            />
            <p className="mt-8">
              <Link
                href="/verification"
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
              >
                How we check what goes on these pages
              </Link>
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-7">
            <div className="flex items-center gap-3">
              <GloveMark size="lg" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Two ways to get one</p>
            </div>
            <p className="mt-4 leading-7 text-stone-600">
              The planner that produced this is free and open to everybody — you can build the same document yourself,
              for your own dates, without an account. Or answer the three short steps and we will build it for you.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/plan"
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
              >
                Have us plan mine
              </Link>
              <Link
                href="/itinerary"
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
              >
                Build one myself, free
              </Link>
            </div>
            <p className="mt-6 text-sm leading-6 text-stone-500">
              What a planned trip costs, and what is free:{" "}
              <Link
                href="/services#pricing"
                className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-2"
              >
                what to expect about price
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
