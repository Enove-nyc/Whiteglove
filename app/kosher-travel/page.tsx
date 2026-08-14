import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import TravelExtras from "@/components/TravelExtras";
import { readExtras } from "@/lib/travel-extras-store";
import SectionHeading from "@/components/SectionHeading";
import StructuredData from "@/components/StructuredData";
import VerificationBadge from "@/components/VerificationBadge";
import { HECHSHERIM } from "@/data/hechsherim";
import { kosherEateries } from "@/data/kosher-eateries";
import { kosherAreas, kosherStays } from "@/data/kosher-stays";
import { CANDLE_LIGHTING_MINUTES } from "@/lib/shabbos";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";
import { TRUST_LEVELS } from "@/lib/trust-status";

export const metadata = pageMetadata({
  title: "Kosher travel — food, Shabbos, minyanim and mikvaos | White Glove Itineraries",
  description:
    "The practical side of travelling kosher: finding food anywhere, choosing the quarter to stay in, planning Shabbos away, hechsherim, and who to ask locally.",
  path: "/kosher-travel",
});

/**
 * The practical side of travelling kosher, in one place.
 *
 * WHY A HUB RATHER THAN SIX LINKS IN A MENU. The site had the answers —
 * a curated kosher food finder, sixty-nine places to stay measured from real quarters, a
 * provider directory, entry documents, hechsherim — spread across six pages
 * that a visitor met one at a time and never as a whole. The one thing a
 * kosher traveler wants to know about a trip is whether the kosher side of it
 * is solvable, and no page said "here is how we solve it".
 *
 * Everything here links out to the tool that does the work. Nothing is
 * duplicated: the counts are read from the same data the pages themselves
 * render, so a hub card cannot claim a directory has more in it than it does.
 */

const questions: Array<{
  title: string;
  href: string;
  cta: string;
  body: string;
}> = [
  {
    title: "Kosher food",
    href: "/kosher",
    cta: "Open the kosher food finder",
    body: "Restaurants, bakeries and groceries, by place or name.",
  },
  {
    title: "Where to stay",
    href: "/hotels",
    cta: "Compare places to stay",
    body: "Kosher hotels, seasonal programmes, and the Jewish quarters.",
  },
  {
    title: "Shabbos away from home",
    href: "/destinations",
    cta: "See Shabbos by destination",
    body: "Whether Shabbos works on foot, and what to arrange if it does not.",
  },
  {
    title: "Drivers, guides and contacts",
    href: "/directory",
    cta: "Open the provider directory",
    body: "Local services, with what each is said to do.",
  },
  {
    title: "Documents and borders",
    href: "/travel-guide",
    cta: "Read the travel guide",
    body: "Entry documents, insurance, transfers and eSIMs.",
  },
  {
    title: "Mikvaos",
    href: "/mikvaos",
    cta: "Browse mikvah listings",
    body: "Address, contact and the source behind each listing.",
  },
  {
    title: "Zmanim",
    href: "/zmanim",
    cta: "Open zmanim",
    body: "Halachic times for a destination or coordinates.",
  },
  {
    title: "Hechsherim",
    href: "/hechsherim",
    cta: "See the certification marks",
    body: `The ${HECHSHERIM.length} certifying bodies the site knows by name.`,
  },
];

export default async function KosherTravelPage() {
  const extras = await readExtras();
  const quarters = kosherAreas.length;
  const stays = kosherStays.length;
  const seasonal = kosherStays.filter((stay) => stay.season).length;
  const eateries = kosherEateries.length;

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Kosher travel", path: "/kosher-travel" },
        ])}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kosher travel</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            Practical kosher travel.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Food, Shabbos, a minyan, a mikvah, and somebody local to ask.
          </p>

          <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [`${quarters}`, "Jewish quarters mapped", "Each with the shul or street it is measured from."],
              [`${stays}`, "places to stay", `${seasonal} of them seasonal programmes.`],
              [`${eateries}`, "curated kosher food listings", "Search the White Glove collection by place or name."],
              [`${CANDLE_LIGHTING_MINUTES} min`, "before sunset", "What the planner allows for candle-lighting."],
            ].map(([figure, label, note]) => (
              <div key={label} className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
                <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">{label}</dt>
                <dd>
                  <span className="mt-1 block font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
                    {figure}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-stone-600">{note}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionHeading
          eyebrow="The practical side"
          title="Things to have settled before you book"
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {questions.map((question) => (
            <article key={question.href} className="wg-card flex h-full flex-col border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                {question.title}
              </h2>
              <p className="mt-3 leading-7 text-stone-600">{question.body}</p>
              <span className="flex-1" />
              <Link
                href={question.href}
                className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                {question.cta} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <SectionHeading
              eyebrow="Glossary"
              title="What these words mean"
            />
            <dl className="mt-8 space-y-4">
              {[
                ["Hechsher", "The certification that food is kosher, and the body that gives it. A listing names the body when White Glove has a recorded status."],
                ["Eruv", "A boundary around a neighbourhood that allows carrying on Shabbos within it. Where a quarter has one, it changes what a Shabbos there looks like with children."],
                ["Minyan", "A quorum for communal prayer. “Walking distance to a minyan” is the single most common request on a trip like this."],
                ["Mikvah", "A ritual bath. Availability and hours vary a great deal outside large communities, which is why we say to confirm before travelling."],
                ["Kever / kevarim", "A grave, and graves — usually of a tzaddik, a righteous person whose resting place people travel to. The heritage section of the site is built around them."],
                ["Shomer", "The person who holds the key to a cemetery or looks after it. Whether you can get in often depends on reaching them."],
              ].map(([term, meaning]) => (
                <div key={term} className="border-t border-[var(--gold-light)] pt-4">
                  <dt className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{term}</dt>
                  <dd className="mt-1 leading-7 text-stone-600">{meaning}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <SectionHeading
              eyebrow="How far it has been checked"
              title="Use current details with care."
              description="A restaurant changes hands and a hechsher can lapse between the day it was written down and the day you eat there. Confirm current details directly before you go."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <VerificationBadge descriptor={TRUST_LEVELS.verified} />
              <VerificationBadge descriptor={TRUST_LEVELS.reported} />
              <VerificationBadge descriptor={TRUST_LEVELS.reconfirm} />
            </div>
            <p className="mt-6 leading-7 text-stone-600">
              No opening hours and no prices are published anywhere on this site, for the same reason: a stale hour
              sends a family across a city to a locked door on erev Shabbos. Every listing links to the place&apos;s own
              page, which is where the current answer lives.
            </p>
            <p className="mt-6">
              <Link
                href="/verification"
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
              >
                What each label means
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <div className="grid gap-8 rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-8 sm:p-12 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
              Pick a destination
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              Get destinations that fit, or ask about a place.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/plan"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Get recommendations
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
            >
              Ask about a destination
            </Link>
          </div>
        </div>
      </section>

      {/* WHAT SOMEBODY TAKES WITH THEM, under the guidance about keeping
          Shabbos away from home — which is the page where a travel blech or a
          set of candlesticks is actually the next thought. Renders nothing
          until the owner has added something. */}
      <TravelExtras
        extras={extras}
        heading="Worth taking with you"
        intro="Bought from the seller, not from us. Nothing here is a recommendation about which to choose."
      />
      <p className="px-5 pb-12 text-center text-sm sm:px-8">
        <Link href="/travel-gear" className="font-semibold text-[var(--gold-ink)] underline">
          See the full travel gear shelf →
        </Link>
      </p>

      <Footer />
    </main>
  );
}
