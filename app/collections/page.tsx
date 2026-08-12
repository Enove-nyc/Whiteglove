import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StructuredData from "@/components/StructuredData";
import { liveCollections } from "@/lib/collections";
import { getStayList } from "@/lib/attractions-view";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs, collectionPage } from "@/lib/structured-data";
import { vacationDestinations } from "@/data/vacation-destinations";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return pageMetadata({
    title: "Holiday collections — White Glove Itineraries",
    description: "Destinations and seasonal kosher programmes grouped by when they work and what kind of trip they are.",
    path: "/collections",
  });
}

/**
 * The index of collection pages that actually have something behind them.
 *
 * Empty collections are not listed. The individual pages 404 rather than
 * inventing a list to fill the gap.
 */
export default async function CollectionsIndexPage() {
  const stays = await getStayList();
  const collections = liveCollections(vacationDestinations, stays);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <StructuredData
        data={[
          collectionPage({
            name: "Holiday collections",
            description: "Destinations and seasonal kosher programmes grouped by season and kind of trip.",
            path: "/collections",
            count: collections.length,
          }),
          breadcrumbs([
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
          ]),
        ]}
      />
      <Navbar />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">When and what kind</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">
            Holiday collections
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            The same destinations as the hub, grouped so a search engine can find summer, winter, or a seasonal
            programme as a page of its own.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        {collections.length === 0 ? (
          <p className="max-w-2xl text-lg leading-8 text-stone-600">Nothing is grouped yet.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((entry) => (
              <li key={entry.slug}>
                <Link
                  href={entry.path}
                  className="wg-card flex h-full min-h-11 flex-col justify-between gap-3 border border-[var(--gold-light)] bg-[var(--surface)] p-5"
                >
                  <span>
                    <span className="block font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                      {entry.title}
                    </span>
                    <span className="mt-2 block text-sm leading-6 text-stone-600">{entry.intro}</span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">Open →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <Footer />
    </main>
  );
}
