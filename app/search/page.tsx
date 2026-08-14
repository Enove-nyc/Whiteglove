import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SearchResults from "@/components/SearchResults";
import DestinationSearch from "@/components/DestinationSearch";
import StructuredData from "@/components/StructuredData";
import { searchSite } from "@/lib/site-search";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  return pageMetadata({
    title: query ? `Search: ${query} | White Glove Itineraries` : "Search | White Glove Itineraries",
    description: query
      ? `Results for “${query}” across vacation destinations, places to stay, things to do, kosher travel and heritage.`
      : "Search White Glove for vacation destinations, places to stay, kosher food, guides and heritage journeys.",
    path: query ? `/search?q=${encodeURIComponent(query)}` : "/search",
    noIndex: true,
  });
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const response = query
    ? await searchSite(query, 60)
    : { results: [], query: "", heritageIntent: false, mode: "search" as const, interpretedAs: undefined };

  // Never send a generic unsuccessful search to /stops — zero results stay here
  // with vacation-first guidance (see SearchResults).
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Search", path: "/search" },
        ])}
      />
      <Navbar />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Search</p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
            {query ? `Results for “${query}”` : "Search the entire White Glove site"}
          </h1>
          <div className="mt-6"><DestinationSearch compact showChrome={false} id="search-page" /></div>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <SearchResults
          query={query}
          results={response.results}
          interpretedAs={response.interpretedAs}
          heritageIntent={response.heritageIntent}
        />
      </section>
      <Footer />
    </main>
  );
}
