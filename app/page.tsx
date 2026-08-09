import { readWords } from "@/lib/site-words-store";
import Footer from "@/components/Footer";
import GloveMark, { GloveList } from "@/components/GloveMark";
import Navbar from "@/components/Navbar";
import PromotionBanner from "@/components/PromotionBanner";
import SectionHeading from "@/components/SectionHeading";
import TravelAssistantBox from "@/components/TravelAssistantBox";
import VacationCard from "@/components/VacationCard";
import VerificationBadge from "@/components/VerificationBadge";
import { getActivePromotions } from "@/lib/admin-content";
import { getTopVisitedPaths } from "@/lib/site-analytics";
import { headers } from "next/headers";
import Link from "next/link";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { website } from "@/lib/structured-data";
import { TRIP_THEMES, vacationDestinations } from "@/data/vacation-destinations";
import { TRIP_KINDS } from "@/lib/trip-plan";
import { cardModels, destinationHref } from "@/lib/vacation-ideas";
import { loadVacationSources } from "@/lib/vacation-sources";
import { TRUST_LEVELS, TRUST_ORDER } from "@/lib/trust-status";
import { SUB_BRAND_HEBREW } from "@/components/SubBrand";
import { guidedDestinations } from "@/data/destinations";
import { allTzaddikim } from "@/lib/tzaddikim";

export const metadata = pageMetadata({
  title: "Kosher Vacation Planning — Where to Go and How to Plan It | White Glove Itineraries",
  description:
    "Plan a kosher vacation with every detail in place: where to go, what to do, kosher food, Shabbos, minyanim and mikvaos — build the itinerary yourself or have White Glove arrange it.",
  path: "/",
});

/**
 * The front page.
 *
 * WHAT IT USED TO SAY, AND WHY THAT WAS THE PROBLEM. "Two kinds of journeys.
 * One standard of care." Then two cards side by side: heritage nesios first,
 * destination planning second. Then six kevarim. A first-time visitor had to
 * get about a third of the way down before meeting anything that looked like a
 * holiday, and the largest words on the page were about graves.
 *
 * Every one of those was a reasonable decision when the site was a kevarim
 * database. None of them is right for a business that plans kosher vacations
 * and also has a heritage section.
 *
 * THE ORDER HERE IS THE ORDER A VISITOR DECIDES IN. What is this (hero), does
 * it fit me (trip-type selector), how does it work (three steps), what sort of
 * trips (categories), show me some (destinations), how much do I want to do
 * myself (the two paths), what about the kosher side (resources), do you do
 * the heritage thing too (yes, its own section), can I believe any of this
 * (verification), and then the one action again.
 *
 * WHAT IS NOT HERE: testimonials. There is no real testimonial on this site
 * and there is nowhere to read one from, so the section the brief asked for
 * "if real data is available" is absent rather than invented.
 *
 * AND WHAT IS NO LONGER HERE: the explaining. This page had six destination
 * cards each carrying its kosher answer, its Shabbos answer, what is on record
 * and two buttons; a four-line promise about coordinates and road routing; and
 * a trust section that set out how the checking works before the visitor had
 * asked. All of it true, all of it in the wrong place — a front page is where
 * somebody decides whether to keep reading, and every one of those paragraphs
 * is on the page it belongs to.
 *
 * So: three destinations rather than six, on the short card; the heritage and
 * verification sections cut to the one sentence each that a stranger needs;
 * and the four labels named in a single line that links to the page which
 * explains them. Nothing was deleted from the site, only from this page.
 */

// "What you keep" was the phrase here and in three other places. It is a
// perfectly good phrase inside the community and it means nothing to somebody
// meeting the site for the first time, which is exactly who reads step one.
const HOW_IT_WORKS: Array<[string, string]> = [
  [
    "Tell us the shape of it",
    "Where, when, who is coming, and your kosher standards and religious needs. Three short steps, nothing required.",
  ],
  [
    "We show you what is actually there",
    "Destinations that suit the dates and the ages, with the kosher food and the Shabbos situation on the same page.",
  ],
  [
    "Build it yourself, or hand it over",
    "The planner is free and holds the whole trip. Or send us the answers and we will arrange it.",
  ],
];

const RESOURCES: Array<{ title: string; href: string; body: string; cta: string }> = [
  {
    title: "Kosher food, anywhere",
    href: "/kosher",
    body: "Restaurants, bakeries and groceries, live, anywhere in the world.",
    cta: "Open the food finder",
  },
  {
    title: "Where to stay",
    href: "/hotels",
    body: "Kosher hotels, seasonal programmes and which quarter to book in.",
    cta: "Compare places to stay",
  },
  {
    title: "Things to do",
    href: "/things-to-do",
    body: "What to do on the days between — and what each one does on Shabbos.",
    cta: "Browse things to do",
  },
  {
    title: "The whole kosher side",
    href: "/kosher-travel",
    body: "Shabbos away from home, minyanim, mikvaos, hechsherim and documents.",
    cta: "Open the kosher travel guide",
  },
];

/**
 * The one sentence about verification that belongs on a front page.
 *
 * There were four bullets and a two-paragraph panel here, explaining how the
 * checking is done to somebody who had not yet asked whether it was. All of it
 * is on /verification, which is written for the moment a person is actually
 * deciding whether to rely on something.
 */
const VERIFICATION_LINE =
  "Every practical detail is labeled Verified, Reported, Being Checked, or Reconfirm Before Travel.";

export default async function Home() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const [homepagePromotions, inlinePromotions, topVisitedPaths, words, sources] = await Promise.all([
    getActivePromotions("homepage-promo", "/", device),
    getActivePromotions("inline-content", "/", device),
    getTopVisitedPaths(60),
    // The first three lines anybody reads. /admin/settings/words.
    readWords(),
    loadVacationSources(),
  ]);

  const cards = cardModels(vacationDestinations, sources);
  // Featured by what people are actually opening, with the rest of the list as
  // the tie-break — so this stays honest as the site is used rather than being
  // six destinations somebody picked once.
  const visits = new Map(topVisitedPaths.map((path) => [path.path, path.count]));
  // THREE. Six full cards were most of the scroll between the categories and
  // the two paths, and each one repeated the kosher and Shabbos answers that
  // its own page gives properly. Three, on the short card, with the way to all
  // of them underneath.
  const featured = [...cards]
    .sort((a, b) => (visits.get(destinationHref(b.destination)) ?? 0) - (visits.get(destinationHref(a.destination)) ?? 0))
    .slice(0, 3);

  const guides = guidedDestinations();
  const kevarim = allTzaddikim();

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData data={website()} />
      <Navbar />

      {/* ---- 1. Vacation-first hero -------------------------------------- */}
      <section className="relative border-b border-[var(--gold-light)] px-5 py-16 sm:px-8 sm:py-24">
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[linear-gradient(135deg,transparent_0%,rgba(217,199,163,.38)_100%)] lg:block" />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-4xl">
            <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--gold-ink)]">{words.heroEyebrow}</p>
            <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(2.5rem,7vw,4.5rem)] leading-[1.04] text-[var(--navy)]">
              {words.heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600 sm:text-xl">{words.heroSubtitle}</p>
          </div>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/plan"
              className="inline-flex min-h-12 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-7 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_10px_28px_rgba(23,45,82,.18)] transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Start planning my trip
            </Link>
            <Link
              href="/destinations"
              className="inline-flex min-h-12 items-center rounded-md border border-[var(--gold)] px-7 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
            >
              Explore vacation ideas
            </Link>
          </div>

          {/* The heritage side, offered as a third thing rather than as half
              the page. Somebody who came for it knows the word and will find
              this line; nobody else is asked to work out which of two
              journeys they are on before they have read anything. */}
          <p className="mt-6">
            <Link
              href="/heritage"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Planning a heritage journey? Start here →
            </Link>
          </p>

          {homepagePromotions.length > 0 && (
            <div className="mt-10">
              <PromotionBanner promotion={homepagePromotions[0] ?? null} placement="homepage-promo" />
            </div>
          )}
        </div>
      </section>

      {/* ---- 2. What kind of trip are you planning? ----------------------- */}
      <section className="border-b border-[var(--gold-light)] bg-[var(--surface)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Start here"
            title="What kind of trip are you planning?"
            description="Press one and we will take it from there — “not sure yet” is on the list, because it is where most people start."
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TRIP_KINDS.map((kind) => (
              <li key={kind.value}>
                <Link
                  href={`/plan?kind=${kind.value}`}
                  className="wg-card flex h-full flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5"
                >
                  <span className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                    {kind.label}
                  </span>
                  <span className="mt-2 text-sm leading-6 text-stone-600">{kind.blurb}</span>
                  <span className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
                    Plan this →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- 3. How White Glove helps ------------------------------------- */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="How it works"
          title="Three steps, and you can stop after any of them."
          description="No account, no card, and no decision you have not made yet."
        />
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {HOW_IT_WORKS.map(([title, body], index) => (
            <li key={title} className="border-t border-[var(--gold-light)] pt-6">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Step {index + 1}</p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                {title}
              </h3>
              <p className="mt-3 leading-7 text-stone-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- 4. Vacation categories --------------------------------------- */}
      <section className="border-y border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Vacation categories"
            title="Browse by the kind of holiday."
            description="Each one is a filter on the same list of destinations."
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TRIP_THEMES.map((theme) => {
              const count = cards.filter((card) => card.destination.themes.includes(theme.value)).length;
              if (count === 0) return null;
              return (
                <li key={theme.value}>
                  <Link
                    href={`/destinations?kind=${theme.value}`}
                    className="wg-card flex h-full items-start justify-between gap-4 border border-[var(--gold-light)] bg-[var(--surface)] p-5"
                  >
                    <span>
                      <span className="block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                        {theme.label}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-stone-600">{theme.blurb}</span>
                    </span>
                    {/* NO COUNT HERE. The categories are honest about being
                        empty — one with nothing behind it is not rendered at
                        all — but a number is a comparison, and "1" beside
                        Beach and resort says something about how far this
                        section has got rather than about the holiday. The
                        counts stay on /vacation-ideas, where somebody is
                        choosing between filters and wants to know before they
                        press one. */}
                    <span aria-hidden="true" className="shrink-0 text-xs font-bold text-[var(--gold-ink)]">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* ---- 5. Featured vacation destinations ---------------------------- */}
      <section id="destinations" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="Vacation destinations"
          title="Somewhere to start."
          description="Each one answers the two questions that decide whether a holiday is workable: what there is to eat, and what happens on Shabbos."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {featured.map((card) => (
            <VacationCard key={card.destination.slug} card={card} compact />
          ))}
        </div>
        <div className="mt-10">
          <Link
            href="/destinations"
            className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
          >
            Browse all {cards.length} destinations →
          </Link>
        </div>
      </section>

      {/* ---- 6. Plan it yourself, or have us plan it ---------------------- */}
      <section className="border-y border-[var(--gold-light)] bg-[var(--surface)] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <SectionHeading
            eyebrow="Two ways to do this"
            title="As much or as little of it as you want."
            description="Most people start with the first and ask for the second when they reach the part they would rather not work out."
          />
          <div className="mt-12 grid gap-5 lg:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-[var(--gold-light)] bg-[#fcfaf6] p-7 sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Free, and yours</p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">
                Plan it yourself
              </h3>
              <p className="mt-4 flex-1 leading-7 text-stone-600">
                The planner holds the whole trip — flights, hotels, every stop, the driving time between them, and a
                printable copy for the car. An account is what makes it follow you onto your phone.
              </p>
              <GloveList
                items={[
                  "Route ordering and real road driving times",
                  "A warning when a Friday runs into candle-lighting",
                  "Share it with whoever is travelling with you",
                ]}
                className="mt-6 space-y-2 text-sm leading-6 text-stone-600"
              />
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/plan"
                  className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
                >
                  Start a trip
                </Link>
                <Link
                  href="/itinerary"
                  className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
                >
                  Open the planner
                </Link>
              </div>
            </article>

            <article className="flex flex-col rounded-2xl border border-[var(--navy)] bg-[var(--navy)] p-7 text-white sm:p-9">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-light)]">The white glove part</p>
              <h3 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight">Have us plan it</h3>
              <p className="mt-4 flex-1 leading-7 text-slate-200">
                Tell us the shape of the trip and we do the working out: where, in what order, what there is to eat,
                where Shabbos falls, and who to speak to when you arrive.
              </p>
              <GloveList
                items={[
                  "A written day-by-day itinerary you can change",
                  "The kosher side answered before anything is booked",
                  "Quoted before any work starts — nothing is charged for asking",
                ]}
                className="mt-6 space-y-2 text-sm leading-6 text-slate-200"
              />
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex min-h-11 items-center rounded-md bg-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]"
                >
                  Tell us about the trip
                </Link>
                <Link
                  href="/services"
                  className="inline-flex min-h-11 items-center rounded-md border border-white/30 px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold-light)] hover:text-[var(--gold-light)]"
                >
                  What we do, in full
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ---- 7. Practical kosher travel resources ------------------------- */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="Kosher travel"
          title="The half of a trip nobody else plans for you."
          description="Free to use, whether or not you ever ask us for anything."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {RESOURCES.map((resource) => (
            <Link
              key={resource.href}
              href={resource.href}
              className="wg-card group flex flex-col border border-[var(--gold-light)] bg-[var(--surface)] p-6"
            >
              <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                {resource.title}
              </p>
              <p className="mt-3 flex-1 text-sm leading-7 text-stone-600">{resource.body}</p>
              {/* Named after where it goes. Four cards all saying "Learn more"
                  is four identical links in a screen reader's list. */}
              <span className="mt-5 text-sm font-semibold text-[var(--navy)] transition group-hover:text-[var(--gold-ink)]">
                {resource.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- 8. Heritage travel, compact ---------------------------------- */}
      {/* It is its own section, and on this page it is one sentence and four
          doors. The paragraph that was here explained what the heritage side
          is to somebody who has read eight sections about holidays; the person
          it is for knows the word and is looking for the link. */}
      <section className="border-y border-[var(--gold-light)] bg-[var(--navy)] px-5 py-12 text-white sm:px-8 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[var(--gold-light)]">
              <span lang="he" dir="rtl">
                {SUB_BRAND_HEBREW}
              </span>{" "}
              by White Glove
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">
              Heritage travel, in its own section.
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-200">
              {kevarim.length} kevarim, {guides.length} researched town guides, and cemetery records with the access
              notes and the shomer where we hold one.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/heritage"
                className="inline-flex min-h-11 items-center rounded-md bg-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]"
              >
                Open heritage travel
              </Link>
              <Link
                href="/plan?kind=heritage"
                className="inline-flex min-h-11 items-center rounded-md border border-white/30 px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold-light)] hover:text-[var(--gold-light)]"
              >
                Plan a heritage journey
              </Link>
            </div>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {[
              ["Who is buried where", "/tzaddikim"],
              ["Batei hachaim", "/cemeteries"],
              ["Towns and guides", "/stops"],
              ["Everything on a map", "/map"],
            ].map(([label, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-sm font-semibold transition hover:border-[var(--gold-light)]"
                >
                  {label}
                  <span aria-hidden="true" className="text-[var(--gold-light)]">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- 9. Verification, in one line --------------------------------- */}
      {/* A four-bullet promise, a two-paragraph panel and a heading about
          driving four hours: all of it true, all of it explaining the checking
          to somebody who had not yet asked whether there was any. The labels
          are named — which is the fact — and the page that explains them is one
          press away, at the moment a person is actually deciding whether to
          rely on something. */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
        <div className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <GloveMark size="lg" />
            <p className="max-w-3xl text-lg leading-8 text-[var(--navy)]">{VERIFICATION_LINE}</p>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {TRUST_ORDER.map((level) => (
              <VerificationBadge key={level} descriptor={TRUST_LEVELS[level]} size="sm" />
            ))}
          </div>
          <p className="mt-6">
            <Link
              href="/verification"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              How we check what goes on this site →
            </Link>
          </p>
        </div>
      </section>

      {/* ---- 10. Ask a question, and the final call to action ------------- */}
      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
        <TravelAssistantBox />
      </section>

      {inlinePromotions.length ? (
        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <PromotionBanner promotion={inlinePromotions[0] ?? null} placement="inline-content" compact />
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8">
        <div className="grid gap-8 rounded-2xl border border-[var(--gold-light)] bg-[var(--cream-deep)] p-8 sm:p-12 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
              Where do you want to go?
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              And if the honest answer is &ldquo;somewhere warm, in July, with the children&rdquo; — that is enough to
              start with.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/plan"
              className="inline-flex min-h-12 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-7 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Start planning my trip
            </Link>
            <Link
              href="/destinations"
              className="inline-flex min-h-12 items-center rounded-md border border-[var(--gold)] px-7 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)]"
            >
              Explore vacation ideas
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
