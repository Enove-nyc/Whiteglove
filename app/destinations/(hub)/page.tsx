import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import SectionHeading from "@/components/SectionHeading";
import VacationIdeasHub from "@/components/VacationIdeasHub";
import { SEASONS, TRIP_THEMES, vacationDestinations, type Season, type TripTheme } from "@/data/vacation-destinations";
import { resolvePage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";
import { cardModels, vacationBrowseHref } from "@/lib/vacation-ideas";
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
    title: page?.seoTitle ?? "Kosher vacation ideas — where to go | White Glove Itineraries",
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

      <section className="mx-auto max-w-7xl px-5 pt-4 sm:px-8">
        <SectionHeading
          eyebrow="Holiday type"
          title="Browse by holiday type"
          description="Each one filters the same list of destinations."
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRIP_THEMES.map((theme) => {
            const count = cards.filter((card) => card.destination.themes.includes(theme.value)).length;
            const selected = initialTheme === theme.value;
            // A category with nothing in it is not offered. See the same rule
            // in lib/vacation-ideas.ts.
            if (count === 0) return null;
            return (
              <li key={theme.value}>
                <Link
                  href={`${vacationBrowseHref({ theme: theme.value, season: initialSeason })}#browse`}
                  aria-current={selected ? "true" : undefined}
                  className={`wg-card flex h-full min-h-11 min-w-0 flex-col justify-between gap-2 border p-5 ${
                    selected
                      ? "border-[var(--navy)] bg-[var(--cream-deep)] shadow-[0_10px_28px_rgba(23,45,82,0.12)]"
                      : "border-[var(--gold-light)] bg-[var(--surface)]"
                  }`}
                >
                  <span>
                    <span className="block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                      {theme.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-stone-600">{theme.blurb}</span>
                  </span>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
                      {count} destination{count === 1 ? "" : "s"}
                    </span>
                    {selected && (
                      <span className="rounded-full bg-[var(--navy)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                        Selected
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section id="browse" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <SectionHeading
          eyebrow="Every destination"
          title="All destinations"
          description="Filter by the kosher and Shabbos answer as well as by the kind of holiday — each card says what the destination page can tell you before you open it."
        />
        <div className="mt-10">
          <VacationIdeasHub cards={cards} initialTheme={initialTheme} initialSeason={initialSeason} />
        </div>
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
              Somewhere else in mind
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              These {vacationDestinations.length} are the ones written up so far. Tell us where else you are thinking
              of and we will look into the kosher side of it.
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
