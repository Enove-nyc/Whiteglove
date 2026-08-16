import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Travel information | White Glove Kosher Travel",
  description: "A practical guide to checking the travel details that can change before your vacation.",
  path: "/verification",
});

/**
 * What to confirm before you travel — and what "Verified" means when you see it.
 *
 * WHAT THIS PAGE WAS. Four labels explained at length (Verified, Reported,
 * Being checked, Reconfirm before travel), how the checking is done, and a
 * list of what we will not print. All of it true, and all of it a page about
 * our editorial process rather than about anybody's trip. AGENTS.md is
 * explicit: do not expose internal workflows or content status to customers.
 *
 * WHAT SURVIVED, AND WHY IT HAD TO. Two things.
 *
 * First, the list of what a traveler should confirm themselves. That is the
 * genuinely useful half — a certificate changes when a restaurant changes
 * hands, and a family that rings ahead does not lose an erev Shabbos.
 *
 * Second, the definition of "Verified". A badge is a claim, and an
 * unexplained claim is marketing. The site is about to carry advertising, and
 * the rule there is that no advertiser can buy that label — a promise which
 * means nothing if the word is never defined anywhere a customer can read it.
 * So the one label a customer still meets is still defined, in a sentence,
 * without walking anybody through the queue behind it.
 */

const CHECK_BEFORE_YOU_GO: Array<[string, string]> = [
  [
    "Kosher certification",
    "Check the current teudah or the certifying agency directly, especially if a restaurant has recently changed hands.",
  ],
  [
    "Hours and reservations",
    "Confirm opening hours, whether you need to book, and yom tov schedules with the business before making the journey.",
  ],
  [
    "Shabbos arrangements",
    "Ask the local shul or your host about minyan times, the eruv, mikvah access and anything that needs arranging for your stay.",
  ],
  [
    "Entry requirements",
    "Use the official government site for your passport and your destination. Visa and passport rules change.",
  ],
  [
    "Routes and transportation",
    "Recheck driving times, public transport and road closures close to your travel date.",
  ],
];

export default function VerificationPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Travel information</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            A few details are always worth checking twice.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Confirm hours, certification and Shabbos arrangements directly before you travel.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="Before you go"
          title="Five things to confirm yourself."
          description="None of these takes long, and each one is the sort of thing that changes between a page being written and a family arriving."
        />
        <dl className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {CHECK_BEFORE_YOU_GO.map(([term, detail]) => (
            <div key={term} className="border-t border-[var(--gold-light)] pt-5">
              <dt className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                {term}
              </dt>
              <dd className="mt-2 leading-7 text-stone-600">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
            What &ldquo;Verified&rdquo; means here.
          </h2>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-600">
            A detail marked Verified has been confirmed against the place itself — a call, an email, or the
            establishment&rsquo;s own published page — and the date it was confirmed is printed beside it. Whether
            somewhere is kosher is the certifying body&rsquo;s statement rather than ours, so every kashrus detail names
            its source.
          </p>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-600">
            Advertising never touches it. A business cannot buy the label, buy a ranking, or change what a page says
            about its kashrus.
          </p>
          <p className="mt-6">
            <Link
              href="/contact?reason=correction"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Tell us if something here is out of date →
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
