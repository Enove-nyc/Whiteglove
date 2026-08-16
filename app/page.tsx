import { readWords } from "@/lib/site-words-store";
import CaseStudiesSection from "@/components/CaseStudiesSection";
import DestinationSearch from "@/components/DestinationSearch";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PromotionBanner from "@/components/PromotionBanner";
import SearchMemory from "@/components/SearchMemory";
import StartingPoints from "@/components/StartingPoints";
import StructuredData from "@/components/StructuredData";
import { getActivePromotions } from "@/lib/admin-content";
import { readPublicCaseStudies } from "@/lib/case-studies-store";
import { featuredDestinations } from "@/lib/featured-destinations";
import { pageMetadata } from "@/lib/seo";
import { website } from "@/lib/structured-data";
import type { TripTheme } from "@/data/vacation-destinations";
import { headers } from "next/headers";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Kosher Vacation Planning — Where to Go and How to Plan It | White Glove Itineraries",
  description:
    "Plan a kosher vacation with the kosher side answered first: where to go, what to do, kosher food, Shabbos, minyanim and mikvaos — build the itinerary yourself, free.",
  path: "/",
});

/**
 * The front page.
 *
 * IT IS A PICTURE OF A PLACE AND A SEARCH, and very little else. The page
 * used to be eleven sections — how it works, holiday types, seasons, featured
 * stays, resources, heritage — and every one of them was a paragraph about
 * the site standing between the visitor and the site. Each of those sections
 * has its own page (/destinations carries the types and the seasons, /hotels
 * the stays, /kosher-travel the resources), and a front page that repeats
 * them is a brochure. This one is a door.
 *
 * THE SEARCH IS THE SITE-WIDE ONE, and it goes to our own pages, never to a
 * partner. Any comparison site can list a hotel in Rome; none of them will
 * say that the Ghetto is the quarter to be in. That answer is what the
 * search finds, and the partner hand-off stays underneath it, on our pages.
 *
 * FEATURED IS CHOSEN BY USE. The row is built from the destinations people
 * opened over the trailing week (lib/featured-destinations.ts), topped up
 * from a written fallback while the data is thin — and the page never says
 * which is which, or why anything was chosen. No "trending", no counts.
 *
 * WHAT IS NOT HERE, AND IS NOT AN OVERSIGHT:
 *
 *   • Testimonials. CaseStudiesSection renders genuine, approved entries and
 *     nothing when there are none; no quote is seeded in this file.
 *   • Prices, star ratings, counts and totals. This site publishes none.
 *   • Personal planning or booking assistance, in any form or prominence.
 *     The service was removed outright at the owner's word — the three free
 *     tools in lib/starting-points.ts are the whole offer.
 *   • The verification paragraph. The site-wide notice carries the door to
 *     /verification; a second copy here was the front page explaining itself.
 */

/**
 * The wash where the photograph will go.
 *
 * THERE IS NO DESTINATION PHOTOGRAPH ON THIS SITE YET, and that is a rule
 * rather than a gap: lib/photos.ts refuses to publish a picture without a
 * credit, the photo library holds none for destinations, and a stock image
 * bought to fill the space would be the one thing on the page that was not
 * true of the place (components/VacationCard.tsx makes the same argument for
 * the cards). So the hero and the Featured cards use the same navy washes the
 * destination cards are built from, with the text-contrast overlay already in
 * place — when a real, credited photograph lands, it drops into the same
 * container under the same overlay and the words do not move.
 *
 * These gradients are the ones measured in components/VacationCard.tsx. On
 * the Featured cards below they carry no text at all, so the contrast
 * arithmetic there does not bind them — but one palette per theme, everywhere
 * a theme is painted, is what keeps the site looking like one site.
 */
const THEME_WASH: Record<TripTheme, string> = {
  beach: "from-[#12384a] to-[#1f5c6b]",
  city: "from-[var(--navy)] to-[#344461]",
  mountains: "from-[#1f3b57] to-[#3a5462]",
  family: "from-[#23405f] to-[#44526b]",
  couples: "from-[#2a2f52] to-[#5b4a63]",
  "short-break": "from-[var(--navy-deep)] to-[#3a4d6f]",
};

export default async function Home() {
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const [homepagePromotions, inlinePromotions, words, featured, caseStudies] = await Promise.all([
    getActivePromotions("homepage-promo", "/", device),
    getActivePromotions("inline-content", "/", device),
    // The first three lines anybody reads, and what the search box invites
    // them to type. /admin/settings/words.
    readWords(),
    featuredDestinations(6),
    // Genuine, permitted, approved only — section renders nothing when empty.
    readPublicCaseStudies(),
  ]);

  return (
    <main className="min-h-screen overflow-x-clip bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData data={website()} />
      <SearchMemory />
      <Navbar />

      {/* ---- 1. The hero: one place, one search ---------------------------
          NO overflow-hidden on this section — the search dropdown is
          absolutely positioned and reaches below the hero's edge. */}
      <section className="relative bg-[var(--navy)] px-5 py-14 text-white sm:px-8 sm:py-20">
        {/* The photograph slot: wash first, then the navy overlay that keeps
            the words readable over whatever eventually sits underneath it. */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-[var(--navy)] via-[#24405f] to-[#3a5462]" />
        <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgba(13,25,45,.78),rgba(13,25,45,.30)_45%,transparent_80%)]" />
        <div className="relative mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-[var(--gold-light)]">{words.heroEyebrow}</p>
          <h1 className="mt-3 max-w-4xl font-[family-name:var(--font-display)] text-[2.25rem] leading-[1.06] sm:text-[clamp(2.75rem,6.5vw,4.25rem)] sm:leading-[1.04]">
            {words.heroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-200">{words.heroSubtitle}</p>

          {/* The site-wide search, at hero size. It finds destinations,
              stays, kosher food and the heritage side alike, and every result
              lands on one of our own pages. */}
          <DestinationSearch id="home-hero-search" placeholder={words.searchPlaceholder} />

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3">
            <Link
              href="/destinations"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold-light)]"
            >
              Browse every destination →
            </Link>
            <Link
              href="/heritage"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-white underline decoration-[var(--gold)] decoration-2 underline-offset-4 transition hover:text-[var(--gold-light)]"
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

      {/* ---- 2. Featured --------------------------------------------------
          Photograph-position wash, name, country. Nothing else: no blurb, no
          rating, no CTA, no reason it was chosen. The whole card is one link,
          so a screen reader lists "Rome" rather than "Explore" six times. */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
          <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
            Featured
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map(({ destination, href }) => (
              <li key={destination.slug}>
                <Link
                  href={href}
                  className="wg-card group block h-full overflow-hidden rounded-xl border border-[var(--gold-light)] bg-[var(--surface)]"
                >
                  <div
                    aria-hidden="true"
                    className={`aspect-[4/3] w-full bg-gradient-to-br ${THEME_WASH[destination.themes[0] ?? "city"]}`}
                  />
                  <div className="p-5">
                    <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] transition group-hover:text-[var(--gold-ink)]">
                      {destination.name}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-stone-600">{destination.country}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---- 3. The three free ways in ------------------------------------
          /plan, /itinerary and /book, named once in lib/starting-points.ts.
          Personal planning is not a fourth door — it does not exist. */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <StartingPoints />
      </section>

      {inlinePromotions.length ? (
        <section className="mx-auto max-w-7xl px-5 pb-8 sm:px-8">
          <PromotionBanner promotion={inlinePromotions[0] ?? null} placement="inline-content" compact />
        </section>
      ) : null}

      {/* Genuine case studies only — the component returns null when none are
          approved, and no quote is invented here to fill the space. */}
      <CaseStudiesSection studies={caseStudies} />

      <Footer />
    </main>
  );
}
