import Link from "next/link";
import EsimOffers from "@/components/EsimOffers";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "eSIMs and data abroad for a kosher trip | White Glove Kosher Travel",
  description:
    "What an eSIM is, what to check before you buy one, and where to get a data plan for the country you are going to.",
  path: "/esim",
});

/**
 * Data abroad.
 *
 * WHY THIS PAGE EXISTS. The eSIM hand-off was live for weeks and reachable
 * only by scrolling past a search on /book, a planner, or a destination guide.
 * There was no page, nothing in the menu, nothing in the footer, and no
 * mention of data anywhere a person could look for it — so somebody who wanted
 * a data plan could only stumble on one while doing something else. The owner
 * put it plainly: there is no path, and if he could not find it nobody would.
 *
 * ONE NAME: eSIM. The address is what people type and search for, the heading
 * says the same word, and every link to it uses it. "Connectivity" describes
 * the category better and is not a word anybody types.
 *
 * WHAT IT IS CAREFUL ABOUT. The two things that actually stop an eSIM working
 * are named before the buying, not after: a phone that cannot take one, and a
 * plan bought for the wrong country. Both are the traveller's to check, both
 * are cheap to check, and both are expensive to discover at an airport.
 *
 * NOT A PROMISE ABOUT PRICE OR COVERAGE. Those are the provider's and change
 * constantly. This page says what to look at; it does not compare on the
 * traveller's behalf, because it has no data with which to do so honestly.
 */

/** What decides whether an eSIM will work for somebody. Checked before buying. */
const BEFORE_YOU_BUY: Array<[string, string]> = [
  [
    "Your phone has to support one",
    "Most phones from the last few years do, and most older ones do not. Search your model and “eSIM” before you buy a plan — the plan is not much use otherwise, and a refund is a conversation you do not want at an airport.",
  ],
  [
    "Buy for the country, not the continent",
    "Plans are sold per country or per region, and the regions are not always the ones you would guess. Check the exact country is listed, and check any country you are only changing planes in if you need data there.",
  ],
  [
    "Install before you fly, switch on when you land",
    "An eSIM is installed over wi-fi, which you have at home and may not have on arrival. Install it before you leave and turn it on once you are there.",
  ],
];

export default async function EsimPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Before you travel</p>
          <h1 className="mt-5 max-w-3xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.5rem)] leading-[1.08] text-[var(--navy)]">
            eSIMs and data abroad
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            A data plan on your phone before you fly, instead of roaming.
          </p>
        </div>
      </section>

      {/* The providers, side by side. Renders nothing until one is configured. */}
      <EsimOffers />

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionHeading
          eyebrow="Worth checking"
          title="Three things before you buy"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {BEFORE_YOU_BUY.map(([heading, body]) => (
            <article key={heading} className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                {heading}
              </h2>
              <p className="mt-3 leading-7 text-stone-600">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeading eyebrow="The rest of it" title="Landing somewhere new" />
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                Getting from the airport
              </h2>
              <p className="mt-3 leading-7 text-stone-600">
                A transfer booked in advance meets you at arrivals, which matters most on the days either side of
                Shabbos.
              </p>
              <Link
                href="/transfers"
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Airport transfers
              </Link>
            </article>
            <article className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                Documents and entry rules
              </h2>
              <p className="mt-3 leading-7 text-stone-600">
                What each country asks for, with the official source for every rule — because they change without
                warning.
              </p>
              <Link
                href="/travel-guide"
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Open the travel guide
              </Link>
            </article>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
