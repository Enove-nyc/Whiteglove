import CaseStudiesSection from "@/components/CaseStudiesSection";
import DestinationSearch from "@/components/DestinationSearch";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PromotionBanner from "@/components/PromotionBanner";
import SearchMemory from "@/components/SearchMemory";
import SeasonalSpotlight from "@/components/SeasonalSpotlight";
import { PlanningNowRow } from "@/components/PlanningNowRow";
import StructuredData from "@/components/StructuredData";
import { getActivePromotions } from "@/lib/admin-content";
import { readPublicCaseStudies } from "@/lib/case-studies-store";
import { pageMetadata } from "@/lib/seo";
import { Icon, type IconName } from "@/components/icons/Icon";
import TravelAssistantBox from "@/components/TravelAssistantBox";
import { ASSISTANT_HOME_LABEL, ASSISTANT_HOME_SUPPORT } from "@/lib/assistant-disclosure";
import { readBookingLink } from "@/lib/booking-access-store";
import { currentSpotlight } from "@/lib/seasonal-spotlight-view";
import { planningNow } from "@/data/planning-now";
import { readPlanningChips } from "@/lib/planning-now-store";
import { website } from "@/lib/structured-data";
import ItinerariesHome from "@/components/ItinerariesHome";
import { BRAND_ORIGIN, brandFromRequestHeaders, currentBrand } from "@/lib/site-brand";
import { headers } from "next/headers";
import Link from "next/link";

// Two front doors, one page. The kosher site keeps the metadata it always had;
// the itineraries domain names itself and points its canonical at its own
// origin so search does not fold the two into one.
export async function generateMetadata() {
  if ((await currentBrand()) === "itineraries") {
    return {
      title: "White Glove Itineraries — the trip you plan, in your client's pocket",
      description:
        "Build an itinerary a day at a time and hand it to your client as an app on their phone — the days, a travel wallet for no signal, and a chat with you.",
      alternates: { canonical: `${BRAND_ORIGIN.itineraries}/` },
    };
  }
  return pageMetadata({
    title: "Jewish Travel Guide — Kosher Destinations & Trip Planning",
    description:
      "A Jewish travel guide for kosher trips: destinations, kosher food, Shabbos, shuls and mikvaos — plan your own itinerary or search booking partners.",
    path: "/",
  });
}

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
 * THERE IS NO SEPARATE "EXPLORE" LIST ANY MORE. One was added back when
 * Featured showed six DESTINATIONS, to give the sections a way in from the
 * page everybody lands on. When Featured became the six sections themselves,
 * that list quietly turned into a second copy of the cards directly above it
 * — the same six names, in the same order, as underlined text. Two of its
 * eight links were not duplicates (About, Verification) and are in the footer
 * now, which is where somebody deciding whether to trust the site looks.
 *
 * FEATURED IS THE SITE'S SIX MAIN SECTIONS. It used to be six destinations
 * ranked by what people opened; the owner asked for the shape of the site
 * instead — what to do, where to stay, what to eat, the heritage, the map and
 * the directory (HOME_CATEGORIES). Same card as before; only what it points at
 * changed. No "trending", no counts, no reason a card is there.
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
 * The six cards on the front page — the site's main sections, not individual
 * places.
 *
 * This row used to be six destinations chosen by what people opened; the owner
 * asked for it to be the sections instead, so a first-time visitor sees the
 * whole shape of the site — what to do, where to stay, what to eat, the
 * heritage, the map and the directory — rather than six towns. Same card as
 * before; only what it points at changed. Each opens its own section.
 */
/**
 * The six sections, each with a mark of its own.
 *
 * THEY ALL CARRIED THE SAME PHOTOGRAPH. Every card drew the branded default
 * (lib/default-photo.ts) — an aeroplane — so a page whose whole job is to show
 * a visitor the six shapes of the site showed them the same picture six times.
 * Nothing distinguished Kosher food from Heritage above the label, which is
 * the one place a picture could have been doing work.
 *
 * NOT PHOTOGRAPHS, DELIBERATELY. Six licensed images is a purchase, and a
 * stand-in from a stock site is worse than the default it replaced. A mark on
 * the site's own navy is the thing the design system already owns: it tells
 * the six apart at a glance, and it does not pretend to be a place.
 */
const HOME_CATEGORIES: ReadonlyArray<{ label: string; blurb: string; href: string; icon: IconName }> = [
  { label: "Things to do", blurb: "Attractions across every destination.", href: "/things-to-do", icon: "camera" },
  { label: "Where to stay", blurb: "Places to stay and kosher apartments.", href: "/hotels", icon: "bed" },
  { label: "Kosher food", blurb: "Restaurants, bakeries and groceries.", href: "/kosher", icon: "utensils" },
  { label: "Heritage", blurb: "Kevarim, batei hachaim and old kehillos.", href: "/heritage", icon: "pin" },
  { label: "Map", blurb: "Everything on the site, placed.", href: "/map", icon: "map" },
  { label: "Local help", blurb: "Drivers, guides and agencies — their businesses, not ours.", href: "/directory", icon: "account" },
];

export default async function Home() {
  const requestHeaders = await headers();
  // The itineraries domain gets its own front door; everything below is the
  // kosher site, unchanged. Read through the same helper generateMetadata uses,
  // so the proxy's brand header and the Host are honoured the one same way.
  if (brandFromRequestHeaders(requestHeaders) === "itineraries") {
    return <ItinerariesHome />;
  }
  const userAgent = requestHeaders.get("user-agent") || "";
  const device = /Mobi|Android/i.test(userAgent) ? "mobile" : "desktop";
  const [homepagePromotions, inlinePromotions, caseStudies, booking, spotlight, planningChips] = await Promise.all([
    getActivePromotions("homepage-promo", "/", device),
    getActivePromotions("inline-content", "/", device),
    // Genuine, permitted, approved only — section renders nothing when empty.
    readPublicCaseStudies(),
    readBookingLink(),
    // Null for most of the year, and then the section below is not there at
    // all — a seasonal prompt that is always on the front page is not
    // seasonal, it is furniture.
    currentSpotlight(),
    readPlanningChips(),
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
          {/* The whole opening is the search, at the owner's word: no visible
              headline, no eyebrow, no pitch paragraph, no browse links — the
              navigation is one line up. The page still needs one <h1> for
              search engines and screen readers, so it is carried here,
              sr-only: present in the document, absent from the picture. */}
          <h1 className="sr-only">Jewish travel guide — kosher destinations and trip planning</h1>

          <DestinationSearch id="home-hero-search" placeholder="Search destinations" />

          {homepagePromotions.length > 0 && (
            <div className="mt-10">
              <PromotionBanner promotion={homepagePromotions[0] ?? null} placement="homepage-promo" />
            </div>
          )}
        </div>
      </section>

      {spotlight && (
        <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8">
          <SeasonalSpotlight window={spotlight} />
        </section>
      )}

      {/* ---- What people are planning right now ---------------------------
          A quiet row of at most three chips, each opening a destination list
          the site already has. Below the search and above Featured on
          purpose: the page still opens on the search and nothing else, and
          this is a hint about the season rather than a second navigation.

          Which chips are in season is worked out here from the server's date
          rather than cached with the list, so one cannot outstay its window.
          When none are, the component renders nothing — no empty container,
          no gap. ------------------------------------------------------- */}
      <PlanningNowRow chips={planningNow(planningChips, new Date().toISOString().slice(0, 10))} />

      {/* ---- 2. Featured --------------------------------------------------
          The six main sections of the site, as cards — not individual places.
          Picture, name, one line saying what is inside. Nothing else: no rating,
          no CTA, no count. The picture is the branded White Glove default
          section's own mark on the site's navy — never a blank box, and never
          the same picture six times. The whole card is one link,
          so a screen reader lists "Where to stay" rather than "Explore" six
          times. */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
          Featured
        </h2>
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {HOME_CATEGORIES.map((category) => (
            <li key={category.href}>
              <Link
                href={category.href}
                className="wg-card group block h-full overflow-hidden rounded-xl border border-[var(--gold-light)] bg-[var(--surface)]"
              >
                {/* The section's own mark, not the same aeroplane six times.
                    aria-hidden because the label under it already names the
                    section and the whole card is one link. */}
                <div
                  aria-hidden="true"
                  className="flex aspect-[4/3] w-full items-center justify-center bg-[var(--navy)] bg-[radial-gradient(circle_at_30%_25%,rgba(198,166,100,.22),transparent_62%)]"
                >
                  <Icon name={category.icon} className="h-16 w-16 text-[var(--gold-light)] transition group-hover:text-white" />
                </div>
                <div className="p-5">
                  <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] transition group-hover:text-[var(--gold-ink)]">
                    {category.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{category.blurb}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* ---- 3. The three ways in, as compact icon cards ------------------
          Ideas (/plan), Itinerary (/itinerary), Book (resolved through the
          booking lock). One word each, at the owner's word — the accessible
          name and tooltip carry the sentence, the card does not. */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid grid-cols-3 gap-3 sm:gap-5">
          {(
            [
              { icon: "lightbulb", label: "Ideas", href: "/plan", name: "Ideas — get destination recommendations" },
              { icon: "suitcase", label: "Itinerary", href: "/itinerary", name: "Itinerary — build the trip yourself" },
              { icon: "plane", label: "Book", href: booking.href, name: booking.searchIsPublic ? "Book — search flights, hotels and cars" : booking.label },
            ] as const
          ).map((card) => (
            <Link
              key={card.label}
              href={card.href}
              aria-label={card.name}
              title={card.name}
              className="wg-card flex min-h-28 flex-col items-center justify-center gap-2 border border-[var(--gold-light)] bg-[var(--surface)] p-5 text-[var(--navy)] transition hover:-translate-y-0.5 hover:border-[var(--gold)] hover:shadow-[0_10px_28px_rgba(23,45,82,.09)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--navy)] focus-visible:outline-offset-2"
            >
              <Icon name={card.icon} className="h-7 w-7" />
              <span className="text-sm font-bold uppercase tracking-[0.12em]">{card.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ---- 4. The AI assistant ------------------------------------------
          Public, and labelled as what it is. It sits below the three doors and
          well below the search box at the top, because the search returns
          pages this site checked and this returns prose a model wrote — the
          quieter of the two belongs lower. Everything it claims about itself
          is in lib/assistant-disclosure.ts, so the wording here, the wording
          beside the input and the label on every answer cannot drift apart. */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="rounded-xl border border-dashed border-[var(--gold-light)] bg-[var(--surface)] p-5 sm:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">{ASSISTANT_HOME_LABEL}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{ASSISTANT_HOME_SUPPORT}</p>
          <div className="mt-4">
            <TravelAssistantBox labelledOutside />
          </div>
        </div>
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
