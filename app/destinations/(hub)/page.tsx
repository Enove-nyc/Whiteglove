import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import VacationIdeasHub from "@/components/VacationIdeasHub";
import { SEASONS, TRIP_THEMES, vacationDestinations, type Season, type TripTheme } from "@/data/vacation-destinations";
import { resolvePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { cardModels } from "@/lib/vacation-ideas";
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
  const [page, sources] = await Promise.all([resolvePage("getaways"), loadVacationSources()]);
  const cards = cardModels(vacationDestinations, sources);
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
            count: vacationDestinations.length,
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
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              Get recommendations
            </Link>
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)]"
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
