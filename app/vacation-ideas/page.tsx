import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import SectionHeading from "@/components/SectionHeading";
import VacationIdeasHub from "@/components/VacationIdeasHub";
import { TRIP_THEMES, vacationDestinations, type TripTheme } from "@/data/vacation-destinations";
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
    title: page?.seoTitle ?? "Kosher vacation ideas — where to go | White Glove Itineraries",
    description:
      page?.seoDescription ??
      "Beaches, cities, mountains and family trips, with what we hold on record about kosher food and Shabbos in each one.",
    path: "/vacation-ideas",
  });
}

export default async function VacationIdeasPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const [page, sources] = await Promise.all([resolvePage("getaways"), loadVacationSources()]);
  const cards = cardModels(vacationDestinations, sources);
  // Arrived from a category on the front page. Anything unrecognised is
  // ignored rather than showing an empty list for a filter nobody chose.
  const initialTheme = (TRIP_THEMES.find((theme) => theme.value === kind)?.value ?? "") as TripTheme | "";

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={[
          collectionPage({
            name: "Kosher vacation ideas",
            description: "Vacation destinations with what is on record about kosher food and Shabbos in each.",
            path: "/vacation-ideas",
            count: vacationDestinations.length,
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Vacation ideas", path: "/vacation-ideas" },
          ]),
        ]}
      />
      <Navbar />

      {/* The owner's own words at the top, from /admin/pages. */}
      {page ? <PageBlocks blocks={page.blocks} /> : null}

      <section className="mx-auto max-w-7xl px-5 pt-4 sm:px-8">
        <SectionHeading
          eyebrow="Start with the kind of trip"
          title="What sort of holiday is this?"
          description="Every category below is a filter on the same list — press one to narrow it, or scroll past and browse everything."
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {TRIP_THEMES.map((theme) => {
            const count = cards.filter((card) => card.destination.themes.includes(theme.value)).length;
            // A category with nothing in it is not offered. See the same rule
            // in lib/vacation-ideas.ts.
            if (count === 0) return null;
            return (
              <li key={theme.value}>
                <Link
                  href={`/vacation-ideas?kind=${theme.value}`}
                  className="wg-card flex h-full min-h-11 flex-col justify-between gap-2 border border-[var(--gold-light)] bg-[var(--surface)] p-5"
                >
                  <span>
                    <span className="block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                      {theme.label}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-stone-600">{theme.blurb}</span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
                    {count} destination{count === 1 ? "" : "s"}
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
          title="Browse the list."
          description="Short on purpose. A destination appears here once the site holds enough real information — things to do, somewhere to stay, what the kosher and Shabbos situation is — to be useful about it."
        />
        <div className="mt-10">
          <VacationIdeasHub cards={cards} initialTheme={initialTheme} />
        </div>
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
              Somewhere else in mind?
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              This list is what we can already stand behind. It is not the limit of where we will plan a trip to — tell
              us where you are thinking of and we will find out what the kosher side of it looks like before you commit
              to anything.
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
