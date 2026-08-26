import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import EateryDirectory from "@/components/EateryDirectory";
import { kosherEateries } from "@/data/kosher-eateries";
import { eateryFacets, searchEateries } from "@/data/eatery-search";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata() {
  const page = await resolvePage("kosher");
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  return pageMetadata({
    title: page?.seoTitle ?? "White Glove Kosher Travel",
    description: page?.seoDescription ?? "Thoughtfully planned kosher travel and Jewish heritage journeys.",
    path: "/kosher",
  });
}

// The words at the top are editable; the finder below them is a tool, not
// content, so it stays in code.
export default async function KosherPage() {
  const page = (await resolvePage("kosher"))!;
  // The first page of listings, rendered by the server: the page arrives whole
  // and indexable, and a visitor who only reads what is in front of them never
  // touches the network. Later searches ask /api/kosher/search.
  const first = searchEateries(kosherEateries, { limit: 60 });
  const facets = eateryFacets(kosherEateries);
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      {/* ONE SEARCH, NOT TWO. There used to be a second search box under this
          one — the same curated collection, searched again — so the page asked
          you to search twice for one thing. The directory is the kosher food
          finder: it searches those listings by city, country, kind or name,
          shows the fuller card, and puts a place on the trip. */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <EateryDirectory initial={first.rows} initialMore={first.more} countries={facets.countries} kinds={facets.kinds} />
      </section>
      <Footer />
    </main>
  );
}
