import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
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
 * a live food finder, sixty-nine places to stay measured from real quarters, a
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
  detail: string;
}> = [
  {
    title: "What will we eat?",
    href: "/kosher",
    cta: "Open the kosher food finder",
    body: "A live lookup of kosher restaurants, bakeries and groceries anywhere in the world, and the places we hold our own record for.",
    detail:
      "The live results come from OpenStreetMap, which anybody can add to — so they are a lead, not a hechsher. Where we hold a record of our own it says who certifies the place and how far that has been checked.",
  },
  {
    title: "Which part of town do we stay in?",
    href: "/kosher-stays",
    cta: "Compare places to stay",
    body: "Kosher hotels, seasonal programmes, and the Jewish quarters themselves — measured from the shul, not from the middle of the city.",
    detail:
      "The quarter usually matters more than the hotel. Distances here are measured from a quarter's own published position, which is something we can stand behind, rather than from a hotel coordinate we would have had to guess at.",
  },
  {
    title: "What happens on Shabbos?",
    href: "/vacation-ideas",
    cta: "See Shabbos practicality by destination",
    body: "Every vacation destination on the site says whether Shabbos works on foot there, and what has to be arranged if it does not.",
    detail:
      "The planner also warns when a day's driving runs into candle-lighting — computed from the sun rather than fetched, and never a substitute for the town's own zman.",
  },
  {
    title: "Who do we ask locally?",
    href: "/directory",
    cta: "Open the provider directory",
    body: "Drivers who know the roads, guides, agencies and local contacts, with what each is said to do and who says so.",
    detail:
      "Some listings are featured because we have found their service consistently good and some because the placement is sponsored. The directory says so plainly rather than leaving you to guess.",
  },
  {
    title: "What do we need at the border?",
    href: "/travel-guide",
    cta: "Read the travel guide",
    body: "Entry documents, passport validity, and paying for the trip — with each country's own official page rather than rules restated second-hand.",
    detail:
      "Entry rules change constantly and depend on the passport you hold, so this site does not state them. It gives you the official source and the questions to ask it.",
  },
  {
    title: "Whose hechsher is that?",
    href: "/kosher",
    cta: "See how hechsherim are shown on a listing",
    body: `The ${HECHSHERIM.length} certifying bodies the site knows by name, so a mark on a listing means something specific.`,
    detail:
      "Nothing researched from a directory is ever published as certified. That word is reserved for the owner having confirmed it with the certifying body itself.",
  },
];

export default function KosherTravelPage() {
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
            The part of a trip nobody else plans for you.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Food, Shabbos, a minyan, a mikvah, and somebody local to ask. Every travel site can book you a hotel; this
            is the half of the trip that decides whether the hotel was the right one.
          </p>

          <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [`${quarters}`, "Jewish quarters mapped", "Each with the shul or street it is measured from."],
              [`${stays}`, "places to stay on record", `${seasonal} of them seasonal programmes.`],
              [`${eateries}`, "kosher food listings", "Plus a live lookup anywhere in the world."],
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
          eyebrow="Six questions"
          title="What people actually ask before booking."
          description="Each one goes to the tool that answers it. Nothing here is a summary of something you have to find elsewhere."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {questions.map((question) => (
            <article key={question.href} className="wg-card flex h-full flex-col border border-[var(--gold-light)] bg-[var(--surface)] p-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                {question.title}
              </h2>
              <p className="mt-3 leading-7 text-stone-600">{question.body}</p>
              <p className="mt-3 flex-1 border-l-2 border-[var(--gold-light)] pl-4 text-sm leading-6 text-stone-500">
                {question.detail}
              </p>
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
              eyebrow="Plain words"
              title="If a term here is new to you."
              description="This site uses the words its travelers use. None of them is a test — here is what each one means where it appears."
            />
            <dl className="mt-8 space-y-4">
              {[
                ["Hechsher", "The certification that food is kosher, and the body that gives it. A listing here names the body where we know it, and says whether anybody has confirmed it."],
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
              title="Every kosher detail carries a label."
              description="A restaurant changes hands and a hechsher can lapse between the day it was written down and the day you eat there. So nothing here is stated flatly."
            />
            <div className="mt-8 flex flex-wrap gap-3">
              <VerificationBadge descriptor={TRUST_LEVELS.verified} />
              <VerificationBadge descriptor={TRUST_LEVELS.reported} />
              <VerificationBadge descriptor={TRUST_LEVELS["being-checked"]} />
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
              Or let us work the kosher side out for you.
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              Tell us where you are going and what you keep, and we will tell you what is actually available there —
              before you book anything.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/plan"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Start planning a trip
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

      <Footer />
    </main>
  );
}
