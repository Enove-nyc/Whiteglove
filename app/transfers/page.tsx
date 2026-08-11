import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import TransferBooking from "@/components/TransferBooking";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Airport transfers for a kosher trip | White Glove Itineraries",
  description:
    "When a booked airport transfer is the better answer than a hire car, what to settle before you book one, and where to find a driver who knows a heritage route.",
  path: "/transfers",
});

/**
 * Airport transfers.
 *
 * THIS USED TO BE HALF OF /cars, AND THAT WAS THE PROBLEM. The page was titled
 * "Cars and transfers", the booking page linked to it under the same words, and
 * the transfers half of it said "we do not book transfers yet". So every route
 * a visitor could take towards a transfer landed on car hire and a sentence
 * explaining that transfers were not on offer — which was true when it was
 * written and stopped being true the day a transfer programme was joined.
 *
 * Two products that are chosen INSTEAD OF each other should not share a page.
 * Somebody deciding between them is the whole audience for both, and a page
 * that offers one and apologises for the other cannot help them decide.
 *
 * WHAT THIS PAGE WILL NOT SAY. Payment terms are the transfer company's, not
 * ours, and they differ by operator and by country — so the one thing a
 * traveler landing before Shabbos most needs to know is the one thing this page
 * tells them to confirm themselves rather than guessing at on their behalf. The
 * need is real and is named; the promise is not made.
 *
 * The booking card comes from Travel Essentials (`pageType="transfers"`) and
 * renders only when the owner has a real tracked hand-off saved and enabled.
 * With none, the page is what it should be anyway: how to decide, and who to
 * ask. Nothing is invented to fill it.
 */

/** When a booked transfer is the better answer. Each one is a real situation. */
const WHEN_TRANSFER: Array<[string, string]> = [
  [
    "Landing close to Shabbos or Yom Tov",
    "A driver who is already booked, already has the flight number and is already waiting is one less thing to arrange in the hours you have least of. Confirm how the company takes payment before you book — that part is theirs, not ours, and it is the detail that matters most on a Friday.",
  ],
  [
    "A city you were not going to drive in anyway",
    "Rome, Paris, Vienna, London. If the quarter is walkable and the week has no day trip in it, a car is a parking problem you paid for — and a transfer at each end is usually the cheaper half of that decision.",
  ],
  [
    "Arriving as a family, with the luggage to match",
    "Seats for children, and a boot that fits a fortnight. Both are things to specify when booking rather than discover at the kerb.",
  ],
];

export default async function TransfersPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Getting there</p>
          <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.08] text-[var(--navy)]">
            Airport transfers
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            A transfer is booked before you travel and meets you at arrivals. It is the better answer than a hire car
            more often than people expect — and on the days either side of Shabbos it is worth arranging early.
          </p>
        </div>
      </section>

      {/* The hand-off, as a panel rather than a card in a row — on this page it
          is the point rather than an add-on. Renders nothing when the owner has
          not enabled and configured it. See components/TransferBooking.tsx for
          why it is not a search form. */}
      <TransferBooking />

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionHeading
          eyebrow="Choosing"
          title="When a transfer beats a hire car"
          description="Most trips want one or the other, not both. This is how the choice usually falls."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {WHEN_TRANSFER.map(([heading, body]) => (
            <article key={heading} className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                {heading}
              </h2>
              <p className="mt-3 leading-7 text-stone-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="The other two answers" title="When a transfer is not what you want" />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                A week that needs a car
              </h2>
              <p className="mt-3 leading-7 text-stone-600">
                An alpine valley, a route between towns, anywhere the days are spent somewhere other than where you
                sleep. Each destination page says which of the two it is before you book either.
              </p>
              {/* The car search is the Cars tab on the booking page — /cars
                  folded into it and is a redirect now, so linking the real
                  address saves the visitor a hop. */}
              <Link
                href="/book?type=cars"
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Search car hire
              </Link>
            </article>
            <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                Drivers on a heritage route
              </h2>
              <p className="mt-3 leading-7 text-stone-600">
                A driver who knows the roads and the gates is a person, not a booking engine. They are in the provider
                directory, with what we know about each.
              </p>
              <Link
                href="/directory"
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Open the provider directory
              </Link>
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
