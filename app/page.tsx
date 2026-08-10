import { readWords } from "@/lib/site-words-store";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import Navbar from "@/components/Navbar";
import PromotionBanner from "@/components/PromotionBanner";
import SectionHeading from "@/components/SectionHeading";
import SearchMemory from "@/components/SearchMemory";
import StaySearchForm from "@/components/StaySearchForm";
import TravelAssistantBox from "@/components/TravelAssistantBox";
import VacationCard from "@/components/VacationCard";
import { getActivePromotions } from "@/lib/admin-content";
import { getTopVisitedPaths } from "@/lib/site-analytics";
import { headers } from "next/headers";
import Link from "next/link";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { website } from "@/lib/structured-data";
import { SEASONS, TRIP_THEMES, vacationDestinations } from "@/data/vacation-destinations";
import { getStayList } from "@/lib/attractions-view";
import { staySearchHref } from "@/lib/stay-search";
import { cardModels, destinationHref } from "@/lib/vacation-ideas";
import { loadVacationSources } from "@/lib/vacation-sources";
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
 * IT OPENS ON A SEARCH, and that is the whole decision this file records. The
 * page led with two buttons — start planning, explore ideas — and both were
 * invitations to read. Somebody arriving with a month in mind and a family to
 * house had nowhere to type it, and the question they came with went unanswered
 * until they had found their own way three pages in.
 *
 * WHERE THE SEARCH GOES IS THE SECOND DECISION, and it is the one worth
 * defending. It goes to /hotels, not to a partner. Sending it straight out
 * would earn a commission a press sooner and throw away the only reason to
 * search here at all: any comparison site can list a hotel in Rome, and none of
 * them will tell you that the Ghetto is the quarter to be in, or that the
 * kosher hotel in Arosa is a fortnight in August rather than a hotel. That
 * answer comes first, and the partner hand-off sits underneath it.
 *
 * THE ORDER IS THE ORDER A VISITOR DECIDES IN. Where and when (the search),
 * what sort of trip, how this works, what kinds of holiday, which places, where
 * to sleep in them, when in the year, the kosher side, the heritage side, can
 * any of it be relied on, and then the search again.
 *
 * WHAT IS NOT HERE, AND IS NOT AN OVERSIGHT:
 *
 *   • Testimonials. There is no real one on this site and nowhere to read one
 *     from, so the section is absent rather than plausible.
 *   • Prices and star ratings. This site holds none; the partner does.
 *   • Personal booking assistance. It exists and it is offered inside Contact.
 *     A front page that offers to arrange the trip for you is a page about an
 *     agency, and every commercial section below would be read as a sales
 *     funnel into a phone call rather than as something usable on its own.
 */

// "What you keep" was the phrase here and in three other places. It is a
// perfectly good phrase inside the community and it means nothing to somebody
// meeting the site for the first time, which is exactly who reads step one.
const HOW_IT_WORKS: Array<[string, string]> = [
  [
    "Say where and when",
    "A city, a region, or nothing at all if the month is as far as you have got.",
  ],
  [
    "See what is actually there",
    "The quarter to be in, what is walkable for Shabbos, and where the food comes from — before any price is quoted.",
  ],
  [
    "Book it where it is cheapest",
    "Rooms and prices come from our booking partners. The planner keeps the whole trip in one place, and it is free.",
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
  "The kosher food, the Shabbos arrangements and the quarter to stay in are checked against the place itself, and each detail names where it came from.";

export default async function Home() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const [homepagePromotions, inlinePromotions, topVisitedPaths, words, sources, stays] = await Promise.all([
    getActivePromotions("homepage-promo", "/", device),
    getActivePromotions("inline-content", "/", device),
    getTopVisitedPaths(60),
    // The first three lines anybody reads. /admin/settings/words.
    readWords(),
    loadVacationSources(),
    // Read through the view, so a stay the owner adds today is on the front
    // page today rather than at the next deploy.
    getStayList(),
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

  /**
   * The stays that belong under "places that make a kosher vacation easier".
   *
   * SELECTED BY THE KASHRUS CLAIM, NOT BY HAND. `kosherClaim` is the field a
   * source stands behind; an ordinary hotel chosen for the street it is on
   * carries "none" and cannot reach this list however well placed it is. That
   * distinction is the site's whole position on accommodation and it should be
   * enforced by the query rather than by whoever edits this file next.
   *
   * Confirmed before reported, because the stronger claim is the one worth
   * showing first, and six at most — this is a taste of the directory rather
   * than the directory.
   */
  const featuredStays = stays
    .filter((stay) => stay.kosherClaim !== "none")
    .sort((a, b) => Number(b.kosherClaim === "confirmed") - Number(a.kosherClaim === "confirmed"))
    .slice(0, 6);

  const guides = guidedDestinations();
  const kevarim = allTzaddikim();

  return (
    <main className="min-h-screen overflow-hidden bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData data={website()} />
      <SearchMemory />
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

          {/* The first thing on the page you can act on. Nothing in it is
              required — the visitor who has not chosen the month is exactly
              the one this site is for, and a form that stops them at the first
              field loses them. */}
          <div className="mt-9 max-w-5xl">
            <StaySearchForm id="hero" />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/destinations"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Browse every destination →
            </Link>
            {/* The heritage side, offered as a line rather than as half the
                page. Somebody who came for it knows the word and will find
                this; nobody else is asked to work out which of two journeys
                they are on before they have read anything. */}
            <Link
              href="/heritage"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Planning a heritage journey? Start here →
            </Link>
          </div>

          {homepagePromotions.length > 0 && (
            <div className="mt-10">
              <PromotionBanner promotion={homepagePromotions[0] ?? null} placement="homepage-promo" />
            </div>
          )}
        </div>
      </section>

      {/* THERE WERE TWO OF THESE. "What kind of trip are you planning?"
          sent you to /plan?kind=, and "Browse by the kind of holiday" sent you
          to /destinations?kind=, one above the other, each a grid of the same
          sort of card. Two ways to say "what sort of trip" on one page is a
          page that has not decided. The destination categories stayed — they
          are the ones with places behind them — and the planner is still one
          press from the hero for somebody who has not chosen. */}
      {/* ---- 3. How White Glove helps ------------------------------------- */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionHeading eyebrow="Planning a trip" title="How it works" />
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
            eyebrow="Where to go"
            title="Browse by holiday type"
            description="Each one filters the same list of destinations."
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
          eyebrow="Destinations"
          title="Where to go"
          description="Kosher food and Shabbos are answered for every one of these before you book anything."
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

      {/* ---- 6. Places that make a kosher vacation easier ------------------
          THE ONLY PLACES ON THIS SITE THAT CARRY A KASHRUS CLAIM, and there
          are not many of them. The section is built from that claim rather
          than from a picked list, so it cannot quietly fill up with ordinary
          hotels: an entry appears here because data/kosher-stays.ts records a
          source saying it is kosher, and the card prints which of the two
          claims it is. If the count ever drops to nothing, the section does
          not render at all. */}
      {featuredStays.length > 0 && (
        <section className="border-y border-[var(--gold-light)] bg-[var(--surface)] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              eyebrow="Where to stay"
              title="Kosher hotels and programmes"
              description="Some of these run for a few weeks a year rather than all year. The season is on the card."
            />
            <ul className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featuredStays.map((stay) => (
                <li key={stay.slug}>
                  <article className="wg-card flex h-full flex-col border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
                      {stay.city} · {stay.country} · {stay.kind}
                    </p>
                    <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                      {stay.name}
                    </h3>
                    {stay.season && (
                      <p className="mt-3 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
                        <strong>Seasonal</strong> — {stay.season}
                      </p>
                    )}
                    <p className="mt-3 flex-1 text-sm leading-6 text-stone-600">{stay.summary}</p>
                    <p className="mt-3 text-xs leading-5 text-stone-500">Walkable from {stay.anchor.name}.</p>
                    <div className="mt-5">
                      <Link
                        href={staySearchHref({ destination: stay.city })}
                        className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
                      >
                        See stays in {stay.city}
                      </Link>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
            <div className="mt-10">
              <Link
                href="/hotels"
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)] transition hover:bg-[var(--navy)] hover:text-white"
              >
                Browse every place to stay →
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---- 7. When in the year ------------------------------------------
          Four links and a count each, straight off the seasons written on the
          destination records. A season with nothing in it is not offered —
          same rule as the categories above, and for the same reason. */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="Season"
          title="When to go"
          description="Alpine kosher programmes run for weeks, not months. Rome in August is thirty-eight degrees and half shut."
        />
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SEASONS.map((season) => {
            const count = cards.filter((card) => card.destination.seasons.includes(season.value)).length;
            if (count === 0) return null;
            return (
              <li key={season.value}>
                <Link
                  href={`/destinations?season=${season.value}`}
                  className="wg-card flex h-full min-h-11 flex-col justify-between gap-3 border border-[var(--gold-light)] bg-[var(--surface)] p-5"
                >
                  <span className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                    {season.label}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
                    {count} destination{count === 1 ? "" : "s"} →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ---- 8. Practical kosher travel resources ------------------------- */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="Kosher travel"
          title="Food, Shabbos and the rest of it"
          description="Free to use, whether or not you book anything here."
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

      {/* ---- 9. Heritage travel -------------------------------------------
          One sentence and four doors. The person this is for knows the word
          and is looking for the link, not for an explanation. */}
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
              Kevarim and the towns around them
            </h2>
            <p className="mt-4 max-w-xl leading-7 text-slate-200">
              {kevarim.length} kevarim and {guides.length} researched town guides, with the addresses, the access notes,
              and the shomer to ring where we have his number.
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

      {/* ---- 10. Why the practical detail can be relied on ----------------
          ONE SENTENCE, AND NOT A ROW OF STATUS LABELS. This carried the four
          badges — Verified, Reported, Being checked, Reconfirm before travel —
          which is the site's own editorial grading shown to somebody who had
          not asked whether there was any. AGENTS.md: do not expose internal
          workflow or content status to customers. The grading is unchanged
          underneath; what a stranger meets on the front page is the claim
          itself, and the page that explains what to confirm before travelling. */}
      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-14">
        <div className="rounded-2xl border border-[var(--gold-light)] bg-[var(--surface)] p-6 sm:p-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <GloveMark size="lg" />
            <p className="max-w-3xl text-lg leading-8 text-[var(--navy)]">{VERIFICATION_LINE}</p>
          </div>
          <p className="mt-6">
            <Link
              href="/verification"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              What to confirm before you travel →
            </Link>
          </p>
        </div>
      </section>

      {/* ---- 11. Ask a question, and the final call to action ------------- */}
      <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
        <TravelAssistantBox />
      </section>

      {inlinePromotions.length ? (
        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <PromotionBanner promotion={inlinePromotions[0] ?? null} placement="inline-content" compact />
        </section>
      ) : null}

      {/* The search again, at the bottom, for somebody who has read the whole
          page and is now ready to type. Sending them back up to the hero is a
          small rudeness that costs the press. */}
      <section className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8">
        <div className="rounded-2xl border border-[var(--gold-light)] bg-[var(--cream-deep)] p-8 sm:p-12">
          <h2 className="font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            Start with a destination and a date
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
            Somewhere warm, in July, with the children is enough to start with. Leave the rest blank.
          </p>
          <div className="mt-8">
            <StaySearchForm id="footer-search" />
          </div>
          <p className="mt-6 text-sm leading-6 text-stone-600">
            Keeping the whole trip in one place — flights, hotels, every stop, the driving time between them, and a
            printable copy for the car — is what{" "}
            <Link
              href="/itinerary"
              className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              the planner
            </Link>{" "}
            is for. It is free, and it does not need an account until you want it on your phone.
          </p>
        </div>
      </section>

      <Footer />
    </main>
  );
}
