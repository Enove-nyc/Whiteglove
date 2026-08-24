import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import VacationIdeasHub from "@/components/VacationIdeasHub";
import SeasonalFeaturedRow from "@/components/SeasonalFeaturedRow";
import { SEASONS, TRIP_THEMES, type Season, type TripTheme } from "@/data/vacation-destinations";
import { ACTION_BUTTON_CLASS } from "@/lib/action-button";
import { getVacationDestinations } from "@/lib/vacation-destinations-view";
import { resolvePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { heritageCards } from "@/lib/destination-directory";
import { asDirectoryCards, asHeritageCards, cardModels, featuredThisSeason } from "@/lib/vacation-ideas";
import { loadVacationSources } from "@/lib/vacation-sources";
import StructuredData from "@/components/StructuredData";
import { breadcrumbs, collectionPage } from "@/lib/structured-data";

// Rendered per request, like /attractions and /stops, and for the same reason:
// the lists behind it are read through lib/attractions-view.ts, so a listing
// the owner adds on Tuesday has to be here on Wednesday rather than at the
// next deploy.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  // Still the "getaways" slug in the CMS — the page moved address and the
  // owner's stored edits did not, and renaming the key would have thrown them
  // away for a cosmetic tidy.
  const page = await resolvePage("getaways");
  return pageMetadata({
    title: page?.seoTitle ?? "Destinations — White Glove Kosher Travel",
    description:
      page?.seoDescription ??
      "Beaches, cities, mountains and family trips, with practical kosher and Shabbos guidance for each destination.",
    path: "/destinations",
  });
}

export default async function VacationIdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; season?: string }>;
}) {
  const { kind, season } = await searchParams;
  const [page, sources, destinations] = await Promise.all([
    resolvePage("getaways"),
    loadVacationSources(),
    // Read through the view, not the data file, so a destination the owner
    // adds or edits in the admin is on this hub without a deploy.
    getVacationDestinations(),
  ]);
  /**
   * ONE DIRECTORY. The holiday destinations and the heritage towns are the
   * same category — both are answers to "where should we go" — and the page
   * behind the word "Destinations" used to hold only the first kind. The towns
   * were reachable by search and from /heritage and were in this list not at
   * all, while the site's own writing said they were part of it.
   *
   * Holiday destinations lead, because they are the ones with a written
   * assessment behind them. Only towns with something actually on them join:
   * the same condition the sitemap asks, so the two cannot disagree.
   */
  const cards = [
    ...asDirectoryCards(cardModels(destinations, sources)),
    ...asHeritageCards(heritageCards()),
  ];
  // Arrived from a category or a time of year on the front page. Anything
  // unrecognised is ignored rather than showing an empty list for a filter
  // nobody chose.
  const initialTheme = (TRIP_THEMES.find((theme) => theme.value === kind)?.value ?? "") as TripTheme | "";
  const initialSeason = (SEASONS.find((entry) => entry.value === season)?.value ?? "") as Season | "";

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={[
          collectionPage({
            name: "Kosher vacation ideas",
            description: "Vacation destinations with practical kosher food and Shabbos guidance.",
            path: "/destinations",
            count: cards.length,
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Destinations", path: "/destinations" },
          ]),
        ]}
      />
      <Navbar />

      {/* The owner's own words at the top, from /admin/pages. */}
      {page ? <PageBlocks blocks={page.blocks} /> : null}

      {/* No heading of its own. The hero block above IS the page's h1
          ("Destinations"), and it is the one the owner can edit; a second
          heading here said the same word twice. */}
      <section id="browse" className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-12">
        <SeasonalFeaturedRow destinations={featuredThisSeason(destinations)} />
        <VacationIdeasHub cards={cards} initialTheme={initialTheme} initialSeason={initialSeason} />
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
              Somewhere else in mind
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              Ask about somewhere that is not written up yet.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/plan"
              className={`inline-flex min-h-11 items-center ${ACTION_BUTTON_CLASS.primary}`}
            >
              Get recommendations
            </Link>
            <Link
              href="/contact"
              className={`inline-flex min-h-11 items-center ${ACTION_BUTTON_CLASS.secondary}`}
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
